-- PlaneSpotter migration 0011, guarded state transitions.
-- Source: docs/SPEC.md section 3.3, exhaustive. BuildPack v1.8 sections 5.1 and 5.5.
--
-- Invariant 10. A private guarded transition helper is the only state mutator;
-- advance_submission wraps it. Every actual transition writes a
-- moderation_actions row; retries and no-ops do not duplicate audit rows.
--
-- Adding a transition needs CKC approval, AGENTS.md section 3.
-- Author CKC.

-- Service-role guard, BuildPack section 5.1.
--
-- The JWT claim is the real check. PostgREST puts the request role there and
-- connects as `authenticator` for every request, anon and service alike, so
-- the connected role cannot distinguish them.
--
-- `current_user` must never be used here. Inside a SECURITY DEFINER function
-- it is the function owner, so a guard built on it passes unconditionally.
-- Verified on this stack: an anon REST call reports current_user=postgres,
-- session_user=authenticator, auth.role()=anon. An earlier version of this
-- function checked current_user and was therefore a no-op in every
-- service-only RPC. The grants still held, so nothing was reachable, but the
-- defence in depth the BuildPack asks for was not there.
--
-- `session_user` is not rewritten by SECURITY DEFINER, so it still identifies
-- a direct connection. postgres and supabase_admin are listed because they are
-- superuser-equivalent on this platform: naming them grants nothing they could
-- not already do, and it lets migrations and the automated tests exercise
-- these paths without minting a JWT.
create or replace function public.app_require_service()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return;
  end if;
  if session_user in ('postgres', 'supabase_admin') then
    return;
  end if;
  raise exception 'permission denied: service role required'
    using errcode = '42501';
end;
$$;

revoke all on function public.app_require_service() from public, anon, authenticated;

-- The section 3.3 table, encoded once. Anything absent is a no-op.
create or replace function public.app_transition_allowed(
  p_from submission_state,
  p_to submission_state
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select (p_from, p_to) in (
    ('received',                'processing'),
    ('processing',              'awaiting_identification'),
    ('processing',              'awaiting_review'),
    ('processing',              'published'),
    ('processing',              'quarantined'),
    ('processing',              'rejected'),
    ('awaiting_identification', 'awaiting_review'),
    ('awaiting_review',         'published'),
    ('awaiting_review',         'rejected'),
    ('awaiting_review',         'quarantined'),
    ('awaiting_review',         'awaiting_identification'),
    ('awaiting_review',         'processing'),
    ('rejected',                'awaiting_review'),
    ('quarantined',             'awaiting_review'),
    -- any state except published and cancelled may be cancelled by the owner
    ('received',                'cancelled'),
    ('processing',              'cancelled'),
    ('awaiting_identification', 'cancelled'),
    ('awaiting_review',         'cancelled'),
    ('quarantined',             'cancelled'),
    ('rejected',                'cancelled'),
    -- delete_sighting cancels a published submission, section 3.3 last row
    ('published',               'cancelled')
  );
$$;

revoke all on function public.app_transition_allowed(submission_state, submission_state)
  from public, anon, authenticated;

-- The only state mutator, invariant 10. Private, never client callable.
--
-- Returns true when an actual transition happened. A disallowed transition and
-- a transition to the current state are both no-ops returning false, and
-- neither writes an audit row, so a retry cannot duplicate one.
--
-- Callers hold the section 5.5 locks before calling this. It takes the
-- submission row lock itself so a direct call is still serialised, but it does
-- not take advisory locks: the caller owns lock order.
create or replace function public.app_transition_submission(
  p_submission_id uuid,
  p_to submission_state,
  p_actor_kind text,
  p_actor_user_id uuid default null,
  p_reason text default null,
  p_payload jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from submission_state;
begin
  if p_actor_kind not in ('user', 'moderator', 'system') then
    raise exception 'invalid actor_kind: %', p_actor_kind using errcode = '22023';
  end if;

  select state into v_from
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'submission not found: %', p_submission_id using errcode = 'P0002';
  end if;

  -- Repeated request for the state already held. No-op, no audit row.
  if v_from = p_to then
    return false;
  end if;

  if not public.app_transition_allowed(v_from, p_to) then
    return false;
  end if;

  update public.submissions
  set state = p_to,
      updated_at = now(),
      -- Rejection and cancellation clear approval, BuildPack section 5.5.
      approved_revision = case when p_to in ('rejected', 'cancelled') then null else approved_revision end,
      approval_kind     = case when p_to in ('rejected', 'cancelled') then null else approval_kind end,
      approved_by       = case when p_to in ('rejected', 'cancelled') then null else approved_by end,
      approved_at       = case when p_to in ('rejected', 'cancelled') then null else approved_at end,
      -- Returning from these states sets review_required regardless of trust.
      review_required = case
        when p_to in ('awaiting_review', 'quarantined', 'awaiting_identification', 'rejected')
          then true
        else review_required
      end,
      rejection_reason = case when p_to = 'rejected' then p_reason else rejection_reason end
  where id = p_submission_id;

  insert into public.moderation_actions (
    submission_id, target_ref, actor_user_id, actor_kind,
    from_state, to_state, reason, payload
  )
  values (
    p_submission_id, p_submission_id::text, p_actor_user_id, p_actor_kind,
    v_from::text, p_to::text, p_reason, p_payload
  );

  return true;
end;
$$;

revoke all on function public.app_transition_submission(
  uuid, submission_state, text, uuid, text, jsonb
) from public, anon, authenticated;

-- Service endpoint wrapping the private helper, BuildPack section 5.1.
create or replace function public.advance_submission(
  p_submission_id uuid,
  p_to submission_state,
  p_reason text default null
)
returns public.submissions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.submissions;
begin
  perform public.app_require_service();
  perform public.app_transition_submission(p_submission_id, p_to, 'system', null, p_reason);
  select * into v_row from public.submissions where id = p_submission_id;
  return v_row;
end;
$$;

revoke all on function public.advance_submission(uuid, submission_state, text)
  from public, anon, authenticated;
grant execute on function public.advance_submission(uuid, submission_state, text) to service_role;
