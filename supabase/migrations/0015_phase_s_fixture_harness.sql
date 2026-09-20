-- PlaneSpotter migration 0015, Phase S fixture harness.
--
-- ** PHASE S ONLY. DELETE IN PHASE 0. **
--
-- BuildPack v1.8 section 9: "An internal fixture harness supplies approval
-- setup for the happy path without implementing authorize_submission; do not
-- expose an approval bypass to clients or ship the harness."
--
-- This exists so the happy path and gate 7 can run before authorize_submission
-- exists. It is not authorization and it must never become authorization. The
-- Phase 0 task "replace the Phase S fixture harness with the real guarded
-- flow" removes this file's functions and adds authorize_submission.
--
-- Safety properties, asserted by tests:
--   - service role only, like every other service endpoint
--   - never granted to anon or authenticated, so no client can reach it
--   - every function name carries the app_fixture_ prefix, so a grep finds
--     all of them at Phase 0
--   - it writes an audit row marked as a fixture, so an approval that came
--     from the harness is distinguishable from a real one forever
-- Author CKC.

create or replace function public.app_fixture_approve_submission(
  p_submission_id uuid,
  p_kind text default 'moderator'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub public.submissions;
begin
  perform public.app_require_service();

  if p_kind not in ('moderator', 'trusted_auto') then
    raise exception 'invalid approval kind: %', p_kind using errcode = '22023';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if v_sub.id is null then
    raise exception 'submission not found: %', p_submission_id using errcode = 'P0002';
  end if;

  -- Approval covers exactly the current revision, BuildPack section 5.5. The
  -- check constraint on submissions enforces this too.
  update public.submissions
  set approved_revision = v_sub.content_revision,
      approval_kind = p_kind,
      approved_by = null,
      approved_at = now(),
      updated_at = now()
  where id = p_submission_id;

  insert into public.moderation_actions (
    submission_id, target_ref, actor_kind, from_state, to_state, reason, payload
  )
  values (
    p_submission_id, p_submission_id::text, 'system',
    v_sub.state::text, v_sub.state::text,
    'phase_s_fixture_approval',
    jsonb_build_object(
      'revision', v_sub.content_revision,
      'kind', p_kind,
      'fixture', true,
      'note', 'Phase S harness, not authorize_submission. Remove in Phase 0.'
    )
  );

  return jsonb_build_object(
    'submission_id', p_submission_id,
    'approved_revision', v_sub.content_revision,
    'approval_kind', p_kind,
    'fixture', true
  );
end;
$$;

revoke all on function public.app_fixture_approve_submission(uuid, text)
  from public, anon, authenticated;
grant execute on function public.app_fixture_approve_submission(uuid, text) to service_role;
