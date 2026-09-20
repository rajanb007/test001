-- PlaneSpotter migration 0009, grants.
-- Source: BuildPack v1.8 section 4. RLS restricts rows, grants restrict columns.
-- Revoke everything from anon and authenticated, then grant back exactly what
-- the matrix says. Supabase default privileges grant all on new tables, so the
-- revoke is load bearing, not decorative.
-- Author CKC.

revoke all on public.users from anon, authenticated, public;
revoke all on public.airframes from anon, authenticated, public;
revoke all on public.airframe_registrations from anon, authenticated, public;
revoke all on public.registration_prefixes from anon, authenticated, public;
revoke all on public.airports from anon, authenticated, public;
revoke all on public.submissions from anon, authenticated, public;
revoke all on public.sightings from anon, authenticated, public;
revoke all on public.media from anon, authenticated, public;
revoke all on public.publish_jobs from anon, authenticated, public;
revoke all on public.follows from anon, authenticated, public;
revoke all on public.device_push_tokens from anon, authenticated, public;
revoke all on public.alert_events from anon, authenticated, public;
revoke all on public.alert_deliveries from anon, authenticated, public;
revoke all on public.moderation_actions from anon, authenticated, public;
revoke all on public.import_conflicts from anon, authenticated, public;

-- users, public profile columns only. strike_count, anonymized_at and
-- created_at stay private.
grant select (id, handle, display_name, avatar_url, trust_tier, home_airport)
  on public.users to anon, authenticated;

-- Reference data is public in full.
grant select on public.airframes to anon, authenticated;
grant select on public.airframe_registrations to anon, authenticated;
grant select on public.registration_prefixes to anon, authenticated;
grant select on public.airports to anon, authenticated;

-- submissions owner allowlist, binding, BuildPack section 4.
-- No caption, approved_by, approval_kind, approved_revision, approved_at,
-- lease_token, lease_until, content_revision, review_required, caption_hidden
-- or processing_attempts. Approval reaches the owner only as the is_approved
-- boolean from get_my_submissions, Block 4. No SELECT grant to anon.
grant select (
  id, user_id, client_submission_id, state, registration_text, taken_at,
  captured_geo, airport_icao, ingestion_source, contribution_batch_id,
  resolved_airframe_id, resolved_registration_id, resolution_outcome,
  sighting_id, rejection_reason, resubmit_count, created_at, updated_at
) on public.submissions to authenticated;

-- alert_events owner columns, BuildPack section 4.
-- window_key and session_attributed_at stay private.
grant select (id, airframe_id, sighting_id, status, created_at, opened_at)
  on public.alert_events to authenticated;

-- Own social rows.
grant select on public.follows to authenticated;
grant select on public.device_push_tokens to authenticated;

-- Nothing is granted on sightings, media, alert_deliveries, publish_jobs,
-- moderation_actions or import_conflicts. A direct select on any of them
-- returns permission denied for anon and authenticated, which the Phase 0
-- REST negative tests assert. publish_jobs holds the publish nonce and the
-- intended-key manifest, so it is service_role only forever.
