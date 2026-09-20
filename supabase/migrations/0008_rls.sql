-- PlaneSpotter migration 0008, row level security.
-- Source: BuildPack v1.8 section 4. RLS restricts rows. Column restriction is
-- migration 0009, never an RLS policy alone.
--
-- service_role bypasses RLS by design and is the only path for imports,
-- moderation writes, publication, enrichment and fanout.
--
-- Phase S has no RPCs yet, Block 4 adds create_submission, advance_submission,
-- resolve_airframe and publish_submission. Until then the only policies are
-- SELECT. Absent insert, update and delete policies mean denied for anon and
-- authenticated, which is the intended posture, not an omission.
-- Author CKC.

alter table public.users enable row level security;
alter table public.airframes enable row level security;
alter table public.airframe_registrations enable row level security;
alter table public.registration_prefixes enable row level security;
alter table public.airports enable row level security;
alter table public.submissions enable row level security;
alter table public.sightings enable row level security;
alter table public.media enable row level security;
alter table public.publish_jobs enable row level security;
alter table public.follows enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.alert_events enable row level security;
alter table public.alert_deliveries enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.import_conflicts enable row level security;

-- Public reference data. Column exposure for users is narrowed by grant in 0009.
create policy users_select_public on public.users
  for select to anon, authenticated using (true);

create policy airframes_select_public on public.airframes
  for select to anon, authenticated using (true);

create policy airframe_registrations_select_public on public.airframe_registrations
  for select to anon, authenticated using (true);

create policy registration_prefixes_select_public on public.registration_prefixes
  for select to anon, authenticated using (true);

create policy airports_select_public on public.airports
  for select to anon, authenticated using (true);

-- Owner rows. RLS filters rows and never raises per row, so a safe-column
-- select against another owner returns an empty result, not permission denied.
-- Section 4 structural rule 4 depends on that distinction.
create policy submissions_select_own on public.submissions
  for select to authenticated using (user_id = (select auth.uid()));

create policy follows_select_own on public.follows
  for select to authenticated using (user_id = (select auth.uid()));

create policy device_push_tokens_select_own on public.device_push_tokens
  for select to authenticated using (user_id = (select auth.uid()));

create policy alert_events_select_own on public.alert_events
  for select to authenticated using (user_id = (select auth.uid()));

-- No policies for sightings, media, alert_deliveries, publish_jobs,
-- moderation_actions or import_conflicts. Direct access is revoked in 0009 and
-- these tables are reached only through service_role, the published_sightings
-- view (Phase 0) or an RPC projection.
