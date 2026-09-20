-- PlaneSpotter migration 0014, durable publication.
-- Source: BuildPack v1.8 sections 5.1 and 5.5 (binding).
--
-- Phase S scope. The happy path plus crash recovery, gate 7. Authorization
-- (authorize_submission), manifest cleanup, adversarial races and Phase 0
-- gates 12 to 14 are Phase 0, BuildPack section 9. What is here is written to
-- be the real thing, not a stub, so Phase 0 extends it rather than replacing it.
--
-- Invariant 4. Originals never reach feeds and unapproved derivatives never
-- reach the public bucket. The sighting row is inserted in one SQL commit
-- after public objects are verified, never before. Storage calls are not
-- transactional and this file never pretends they are: every stage boundary is
-- its own transaction and the storage work happens between them.
--
-- R13. Public derivative keys carry a per-job nonce, are undiscoverable until
-- commit, and are never reused.
-- Author CKC.

-- The intended public keys for a job, derived from its nonce. Deriving them in
-- one place means the committed manifest and the keys the worker copies cannot
-- disagree, BuildPack section 5.5 "commit the entire intended public_keys list
-- before the first storage copy".
create or replace function public.app_publish_keys(p_nonce text, p_submission_id uuid)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select array[
    p_nonce || '/' || p_submission_id::text || '/feed.jpg',
    p_nonce || '/' || p_submission_id::text || '/detail.jpg',
    p_nonce || '/' || p_submission_id::text || '/share.jpg'
  ];
$$;

revoke all on function public.app_publish_keys(text, uuid) from public, anon, authenticated;

-- Acquires the section 5.5 identity advisory locks in ascending key order.
-- Transaction scoped, never held across a storage call.
create or replace function public.app_lock_identity(
  p_airframe_id uuid,
  p_registration_id uuid
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_keys bigint[] := '{}';
  v_key bigint;
begin
  if p_airframe_id is not null then
    v_keys := v_keys || hashtext('airframe:' || p_airframe_id::text)::bigint;
  end if;
  if p_registration_id is not null then
    v_keys := v_keys || hashtext('registration:' || p_registration_id::text)::bigint;
  end if;

  -- Ascending signed numeric order, distinct keys only.
  foreach v_key in array (select array_agg(k order by k) from unnest(v_keys) k)
  loop
    perform pg_advisory_xact_lock(v_key);
  end loop;
end;
$$;

revoke all on function public.app_lock_identity(uuid, uuid) from public, anon, authenticated;

-- publish_submission, BuildPack section 5.1.
--
-- Idempotently requests publication. Repeated calls never authorise a
-- revision and never create a second job. A committed job returns its existing
-- sighting.
create or replace function public.publish_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.publish_jobs;
begin
  perform public.app_require_service();

  if not exists (select 1 from public.submissions where id = p_submission_id) then
    raise exception 'submission not found: %', p_submission_id using errcode = 'P0002';
  end if;

  insert into public.publish_jobs (submission_id, stage)
  values (p_submission_id, 'waiting_authorization')
  on conflict (submission_id) do nothing;

  select * into v_job from public.publish_jobs where submission_id = p_submission_id;

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'job_id', v_job.id,
    'stage', v_job.stage,
    'sighting_id', (select s.sighting_id from public.submissions s where s.id = p_submission_id)
  );
end;
$$;

revoke all on function public.publish_submission(uuid) from public, anon, authenticated;
grant execute on function public.publish_submission(uuid) to service_role;

-- Claim one runnable job with a fresh lease token.
--
-- A state check is not a lock, CLAUDE.md section 7. This is a single atomic
-- update returning the row, or nothing.
--
-- A job is claimable only while the submission carries approval for its
-- current revision, BuildPack section 5.5 and the publish-runner row in the
-- section 5.2 Edge Function table: "only runnable stages claimed, resolved,
-- copied, verified with matching approved revision and an available lease are
-- claimed". That applies to every stage, not only to waiting_authorization. Rejection and cancellation clear approval, so a
-- moderator's decision stops the worker before it copies anything else into
-- the public bucket rather than only at the final commit, invariant 4.
--
-- failed is never claimable. A runnable stage is otherwise claimable when its
-- lease is absent or expired, which is what makes crash recovery work: a
-- killed worker's lease expires and the next runner picks the job up at the
-- stage it reached.
create or replace function public.publish_claim(p_lease_seconds int default 300)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.publish_jobs;
  v_token uuid := gen_random_uuid();
begin
  perform public.app_require_service();

  update public.publish_jobs j
  set stage = case when j.stage = 'waiting_authorization' then 'claimed' else j.stage end,
      lease_token = v_token,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      attempts = j.attempts + 1,
      submission_revision = coalesce(j.submission_revision, s.content_revision),
      updated_at = now()
  from public.submissions s
  where j.id = (
    select j2.id
    from public.publish_jobs j2
    join public.submissions s2 on s2.id = j2.submission_id
    where s2.approved_revision is not null
      and s2.approved_revision = s2.content_revision
      and s2.approved_at is not null
      and (
            j2.stage = 'waiting_authorization'
         or (
              j2.stage in ('claimed', 'resolved', 'copied', 'verified')
              and (j2.lease_until is null or j2.lease_until < now())
            )
          )
    order by j2.created_at
    for update of j2 skip locked
    limit 1
  )
    and s.id = j.submission_id
  returning j.* into v_job;

  if v_job.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'job_id', v_job.id,
    'submission_id', v_job.submission_id,
    'stage', v_job.stage,
    'lease_token', v_job.lease_token,
    'publish_nonce', v_job.publish_nonce,
    'public_keys', to_jsonb(v_job.public_keys),
    'submission_revision', v_job.submission_revision
  );
end;
$$;

revoke all on function public.publish_claim(int) from public, anon, authenticated;
grant execute on function public.publish_claim(int) to service_role;

-- Resolve identity and commit the intended key manifest before any copy.
create or replace function public.publish_resolve(p_job_id uuid, p_lease_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.publish_jobs;
  v_sub public.submissions;
  v_resolved record;
begin
  perform public.app_require_service();

  select * into v_job from public.publish_jobs
  where id = p_job_id and lease_token = p_lease_token and lease_until > now()
  for update;

  if v_job.id is null then
    raise exception 'stale or expired lease for job %', p_job_id using errcode = '55P03';
  end if;

  select * into v_sub from public.submissions where id = v_job.submission_id;

  select * into v_resolved
  from public.resolve_airframe(v_sub.registration_text, v_sub.taken_at, v_sub.id);

  -- A stub is a resolved identity, not a failure. Tier 3 creates the airframe
  -- and its current registration row and returns both, R5 and SPEC section
  -- 3.4, so the first sighting of an unknown registration publishes against
  -- that stub. Only ambiguous and invalid are non-publications, and SPEC
  -- section 3.4 names exactly those two.
  if v_resolved.outcome not in ('matched', 'stub_enriched', 'stub_pending') then
    -- Not a publication. Route the submission per SPEC section 3.3 and park
    -- the job: ambiguous quarantines, invalid needs a registration.
    perform public.app_transition_submission(
      v_sub.id,
      case when v_resolved.outcome = 'ambiguous' then 'quarantined'::submission_state
           else 'awaiting_identification'::submission_state end,
      'system', null, 'resolution_' || v_resolved.outcome
    );
    update public.publish_jobs
    set stage = 'waiting_authorization', lease_token = null, lease_until = null, updated_at = now()
    where id = p_job_id;
    return jsonb_build_object('outcome', v_resolved.outcome, 'stage', 'waiting_authorization');
  end if;

  update public.publish_jobs
  set stage = 'resolved',
      resolved_airframe_id = v_resolved.airframe_id,
      resolved_registration_id = v_resolved.registration_id,
      -- The manifest is committed here, before the first copy, so a partial
      -- copy needs no guesswork. It is only ever computed from the nonce.
      public_keys = public.app_publish_keys(v_job.publish_nonce, v_job.submission_id),
      updated_at = now()
  where id = p_job_id;

  return jsonb_build_object(
    'outcome', v_resolved.outcome,
    'stage', 'resolved',
    'airframe_id', v_resolved.airframe_id,
    'registration_id', v_resolved.registration_id,
    'public_keys', to_jsonb(public.app_publish_keys(v_job.publish_nonce, v_job.submission_id))
  );
end;
$$;

revoke all on function public.publish_resolve(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_resolve(uuid, uuid) to service_role;

-- Record a stage the worker has completed. Fenced by the lease token.
create or replace function public.publish_advance_stage(
  p_job_id uuid,
  p_lease_token uuid,
  p_from text,
  p_to text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.publish_jobs;
begin
  perform public.app_require_service();

  update public.publish_jobs
  set stage = p_to, updated_at = now()
  where id = p_job_id
    and lease_token = p_lease_token
    and lease_until > now()
    and stage = p_from
  returning * into v_job;

  if v_job.id is null then
    raise exception 'stale lease or unexpected stage for job %, wanted %', p_job_id, p_from
      using errcode = '55P03';
  end if;

  return jsonb_build_object('job_id', v_job.id, 'stage', v_job.stage);
end;
$$;

revoke all on function public.publish_advance_stage(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.publish_advance_stage(uuid, uuid, text, text) to service_role;

-- The final commit. One SQL transaction, everything else already done.
--
-- BuildPack section 5.5, verified stage: lock submission then job, validate
-- the author, the approval, that submission_revision = content_revision =
-- approved_revision, the state, and a current unexpired token. Insert exactly
-- one sighting, stamp media paths and caption_hidden, mark the submission
-- published, write one publish action, set the job committed.
--
-- Gate 7. A job already at committed returns its existing sighting and writes
-- nothing: no second insert, no second audit row, no second alert enqueue.
create or replace function public.publish_commit(p_job_id uuid, p_lease_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.publish_jobs;
  v_sub public.submissions;
  v_sighting_id uuid;
  v_keys text[];
begin
  perform public.app_require_service();

  select * into v_job from public.publish_jobs where id = p_job_id;
  if v_job.id is null then
    raise exception 'publish job not found: %', p_job_id using errcode = 'P0002';
  end if;

  -- Terminal. Idempotent by construction, not by a lookup-then-act race:
  -- reaching committed is the only way to set submissions.sighting_id.
  if v_job.stage = 'committed' then
    select sighting_id into v_sighting_id from public.submissions where id = v_job.submission_id;
    return jsonb_build_object(
      'job_id', v_job.id, 'stage', 'committed',
      'sighting_id', v_sighting_id, 'inserted', false
    );
  end if;

  -- Section 5.5 lock order: identity advisory keys, then submission, then job.
  perform public.app_lock_identity(v_job.resolved_airframe_id, v_job.resolved_registration_id);

  select * into v_sub from public.submissions where id = v_job.submission_id for update;
  select * into v_job from public.publish_jobs where id = p_job_id for update;

  if v_job.stage = 'committed' then
    return jsonb_build_object(
      'job_id', v_job.id, 'stage', 'committed',
      'sighting_id', v_sub.sighting_id, 'inserted', false
    );
  end if;

  if v_job.lease_token is distinct from p_lease_token or v_job.lease_until <= now() then
    raise exception 'stale or expired lease for job %', p_job_id using errcode = '55P03';
  end if;

  if v_job.stage <> 'verified' then
    raise exception 'job % is at stage %, commit requires verified', p_job_id, v_job.stage
      using errcode = '55000';
  end if;

  if exists (select 1 from public.users u where u.id = v_sub.user_id and u.anonymized_at is not null) then
    raise exception 'author is anonymized, R10' using errcode = '55000';
  end if;

  if v_sub.state not in ('processing', 'awaiting_review') then
    raise exception 'submission % is at state %, not publishable', v_sub.id, v_sub.state
      using errcode = '55000';
  end if;

  if v_sub.approved_revision is null
     or v_sub.approved_at is null
     or v_sub.approved_revision <> v_sub.content_revision
     or v_job.submission_revision <> v_sub.content_revision then
    raise exception 'approval does not cover the current revision of %', v_sub.id
      using errcode = '55000';
  end if;

  -- A sighting without its media row would reach the feed with null feed,
  -- detail and share paths, because the stamp further down is an unfiltered
  -- update that silently matches nothing. Checked with the other guards,
  -- before anything is written, invariant 4.
  if not exists (select 1 from public.media m where m.submission_id = v_sub.id) then
    raise exception 'submission % has no media row, nothing to stamp', v_sub.id
      using errcode = '55000';
  end if;

  v_keys := v_job.public_keys;
  if v_keys is null or array_length(v_keys, 1) is distinct from 3 then
    raise exception 'job % has no committed key manifest', p_job_id using errcode = '55000';
  end if;

  insert into public.sightings (
    submission_id, airframe_id, registration_id, user_id, airport_icao,
    captured_geo, display_geo, taken_at, caption, caption_hidden,
    ingestion_source, contribution_batch_id
  )
  values (
    v_sub.id, v_job.resolved_airframe_id, v_job.resolved_registration_id, v_sub.user_id,
    v_sub.airport_icao, v_sub.captured_geo, v_sub.captured_geo, v_sub.taken_at,
    v_sub.caption, v_sub.caption_hidden, v_sub.ingestion_source, v_sub.contribution_batch_id
  )
  returning id into v_sighting_id;

  update public.media
  set sighting_id = v_sighting_id,
      derivatives_bucket = 'derivatives',
      feed_path = v_keys[1],
      detail_path = v_keys[2],
      share_path = v_keys[3]
  where submission_id = v_sub.id;

  update public.submissions
  set sighting_id = v_sighting_id, updated_at = now()
  where id = v_sub.id;

  perform public.app_transition_submission(
    v_sub.id, 'published', 'system', null, 'publish_committed',
    jsonb_build_object('job_id', v_job.id, 'revision', v_sub.content_revision)
  );

  update public.publish_jobs
  set stage = 'committed', updated_at = now()
  where id = p_job_id;

  return jsonb_build_object(
    'job_id', v_job.id, 'stage', 'committed',
    'sighting_id', v_sighting_id, 'inserted', true
  );
end;
$$;

revoke all on function public.publish_commit(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_commit(uuid, uuid) to service_role;
