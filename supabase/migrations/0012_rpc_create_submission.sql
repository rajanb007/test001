-- PlaneSpotter migration 0012, owner write path RPCs.
-- Source: BuildPack v1.8 sections 4, 5.1 and 5.5.
--
-- Invariant 1, idempotent contribution. Submission creation is idempotent on
-- (user_id, client_submission_id). Any number of retries produces exactly one
-- submission.
--
-- Section 4, user mutation RPCs return explicit owner JSON from the allowlist
-- plus a masked caption, never the submissions composite and never approval
-- metadata. That applies equally to the idempotent existing-row response.
-- Author CKC.

-- The owner projection, BuildPack section 4. Eighteen granted columns, the
-- masked caption, and is_approved. No approved_by, approval_kind,
-- approved_revision, approved_at, lease_token or any other worker internal.
create or replace function public.app_owner_submission_json(p_submission_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'client_submission_id', s.client_submission_id,
    'state', s.state,
    'registration_text', s.registration_text,
    'taken_at', s.taken_at,
    'airport_icao', s.airport_icao,
    'ingestion_source', s.ingestion_source,
    'contribution_batch_id', s.contribution_batch_id,
    'resolved_airframe_id', s.resolved_airframe_id,
    'resolved_registration_id', s.resolved_registration_id,
    'resolution_outcome', s.resolution_outcome,
    'sighting_id', s.sighting_id,
    'rejection_reason', s.rejection_reason,
    'resubmit_count', s.resubmit_count,
    'created_at', s.created_at,
    'updated_at', s.updated_at,
    -- Masked, never the raw value behind a flag.
    'caption', case when s.caption_hidden then null else s.caption end,
    'is_approved', (
      s.approved_revision is not null
      and s.approved_revision = s.content_revision
      and s.approved_at is not null
    )
  )
  from public.submissions s
  where s.id = p_submission_id;
$$;

revoke all on function public.app_owner_submission_json(uuid) from public, anon, authenticated;

-- create_submission, BuildPack section 5.1.
--
-- Only the six documented fields are read out of the payload. A client cannot
-- set state, review_required or any approval field, section 5.5: unknown keys
-- are ignored rather than copied.
create or replace function public.create_submission(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_client_id uuid;
  v_submission_id uuid;
  v_inserted boolean := false;
  v_trust trust_tier;
  v_geo geography(point, 4326);
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p ? 'client_submission_id' is not true or p->>'client_submission_id' is null then
    raise exception 'client_submission_id is required' using errcode = '22023';
  end if;
  v_client_id := (p->>'client_submission_id')::uuid;

  select trust_tier into v_trust from public.users where id = v_user;
  if v_trust is null then
    raise exception 'no profile for the authenticated user' using errcode = 'P0002';
  end if;

  if p ? 'captured_geo' and jsonb_typeof(p->'captured_geo') = 'object' then
    v_geo := st_setsrid(
      st_makepoint(
        (p->'captured_geo'->>'longitude')::double precision,
        (p->'captured_geo'->>'latitude')::double precision
      ),
      4326
    )::geography;
  end if;

  insert into public.submissions (
    user_id, client_submission_id, state,
    registration_text, taken_at, captured_geo, airport_icao, caption,
    ingestion_source, review_required
  )
  values (
    v_user, v_client_id, 'received',
    nullif(p->>'registration_text', ''),
    (p->>'taken_at')::timestamptz,
    v_geo,
    nullif(p->>'airport_icao', ''),
    nullif(p->>'caption', ''),
    'native_mobile',
    -- Server trust decides, never the client. New users are reviewed.
    v_trust = 'new'
  )
  on conflict (user_id, client_submission_id) do nothing
  returning id into v_submission_id;

  v_inserted := v_submission_id is not null;

  if not v_inserted then
    -- Invariant 1. The retry returns the existing row, it never creates a
    -- second one and never writes a second audit row.
    select id into v_submission_id
    from public.submissions
    where user_id = v_user and client_submission_id = v_client_id;
  else
    insert into public.moderation_actions (
      submission_id, target_ref, actor_user_id, actor_kind, from_state, to_state
    )
    values (v_submission_id, v_submission_id::text, v_user, 'user', null, 'received');
  end if;

  return public.app_owner_submission_json(v_submission_id);
end;
$$;

revoke all on function public.create_submission(jsonb) from public, anon;
grant execute on function public.create_submission(jsonb) to authenticated, service_role;

-- finalize_submission, BuildPack section 5.1. Called after the TUS upload
-- completes. Advances received to processing. Enqueueing process-media is
-- Block 5 work; this records the state change only.
create or replace function public.finalize_submission(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select user_id into v_owner from public.submissions where id = p_submission_id;
  if v_owner is null then
    raise exception 'submission not found' using errcode = 'P0002';
  end if;
  if v_owner <> v_user then
    raise exception 'not your submission' using errcode = '42501';
  end if;

  perform public.app_transition_submission(p_submission_id, 'processing', 'user', v_user);
  return public.app_owner_submission_json(p_submission_id);
end;
$$;

revoke all on function public.finalize_submission(uuid) from public, anon;
grant execute on function public.finalize_submission(uuid) to authenticated, service_role;
