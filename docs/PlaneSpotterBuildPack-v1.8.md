# PlaneSpotter Build Pack

| Field | Value |
|---|---|
| Document type | Self-contained build instruction pack for Claude Code |
| Author | CKC |
| Version | 1.8 |
| Date | 2026-09-19 |
| Supersedes | PlaneSpotterBuildPack-v1.7.md |
| Authority | This file is the single source of truth for the build. PlaneSpotterMVP-v1.3.2.md is the product scope authority and PlaneSpotterDesignSpec-v1.0.md is design background. Where any document conflicts with this pack, this pack wins, with one carve-out, docs/DESIGN.md in the repo owns token hex values under ruling D1 and section 7.1 below mirrors it. Any reference elsewhere demoting scope authority to MVP v1.3.1 is void, v1.3.2 is approved and controls, including the contributor profile |
| Execution model | Phase-gated, beginning with a pre-build Phase S spike and validation phase per CKC ruling R1 and R2. Do not start a phase until the previous phase's exit gates pass and CKC approves |

### What changed from v1.7

Package v2.6, CKC reconciliation of two parallel v2.5 packages on 2026-09-19. The reviewer copy was adopted as the base, two deviations from rulings corrected.

1. T2 restored to 26 to 34 weeks, held. The 30 to 39 figure is recorded as Phase 0 pressure only. Sections 9, 12.
2. Phantom reference to a DesignSpec v1.1 removed from the authority line and the end note. No such document exists.

### What changed from v1.6

Package v2.5, corrections requested on 2026-09-19. These revise implementation contracts and scheduling; no runtime gate is marked passed.

1. Owner grants use an explicit column allowlist. Approval is exposed only as is_approved through get_my_submissions; moderator identity, approval kind and lease tokens stay private. User mutation RPCs and moderation summaries use safe projections too.
2. Publication and privacy activation use the same transaction advisory locks, keyed by airframe and registration UUID, before submission and job row locks.
3. Phase S remains a 5 to 6 week happy-path spike with crash-recovery gate 7. Authorization, manifest cleanup and the full fenced pipeline, including gates 12 to 14, belong to Phase 0.
4. T2 held at 26 to 34 weeks by CKC ruling, recalculate at Phase S exit. Phase 0 pressure of 80 to 120 hours for pipeline hardening and its 15 automated gates is recorded, not folded in.

### What changed from v1.5

Corrections requested by the user on 2026-09-19. Package v2.4; no product scope additions. Earlier change notes below are historical and do not override current contracts.

1. Publication authorization is bound to a content revision. Reopening or correcting a submission parks the job at waiting_authorization; it never grants approval. Current approval and worker ownership are checked again under lock at commit.
2. Normal push fanout claims pending deliveries only. The recovery worker atomically permits one uncertain-send retry, increments retry_count, and changes send_attempt_id. Late responses cannot update another attempt.
3. preflight is an operation inside claimed, not a persisted publish_jobs stage. Missing derivatives park the job until processing finishes.
4. The full intended public_keys manifest is committed before the first copy. Cleanup retains its nonce and manifest until deletion is verified; restart cannot replace either while cleanup is unfinished.
5. Queue labels, retained private rejection media, permission recovery, acceptance gates, and supporting agent instructions are reconciled. No phase gate is marked passed by this document correction.

### What changed from v1.4

Third external review on 2026-09-19, seven contract gaps, all confirmed. No new features, no redesign.

1. Schema completeness. `submissions.lease_until`, `submissions.processing_attempts`, `sightings.caption_hidden` added. They were referenced by prose and missing from SQL. Section 3.
2. Publication timing. Public derivative keys carry a per-job random nonce known only to the job row. Objects are public by capability but undiscoverable until the sighting commit exposes the key through the view. R13. Section 5.1.
3. Failed job restart. A submission corrected out of quarantined or awaiting_identification resets its publish_jobs row. Cleanup runs before the job is marked failed, never after. Section 5.1.
4. Resubmission with missing derivatives. Rejection keeps pending derivatives 30 days. Reopen checks the media row and pending keys, re-enqueues process-media when absent. Section 5.1, 5.2.
5. Suppression for new content and edits. publish_submission and update_submission consult is_suppressed. Replacement share assets use a new nonce, old key deleted. Section 4, 5.1.
6. Push delivery claim. alert_deliveries rows are claimed with an atomic update to sending plus lease before any HTTP call. Section 6.2.
7. 200 percent text on the Passport. Names and dates stay visible, the strip becomes a vertical list, nothing moves to accessibility labels only. Section 7.2.

### What changed from v1.3

Second external review on 2026-09-19 found seven contract defects in v1.3, all confirmed. R11, R12, O1.

1. Publication is a durable staged job, `publish_jobs` with a lease, storage copy verified before the single SQL commit that creates the sighting. Media becomes public and alerts become eligible at that commit, never before. Section 5.1, 5.2.
2. process-media claims work atomically with a lease, `media` is unique per submission, worker death is recoverable. Section 5.2.
3. State machine reconciled with every RPC outcome. R11, rejected submissions reopen in place via update_submission, resubmit_count capped at 3, prior values snapshotted in `moderation_actions.payload`. Section 3, 5.1.
4. Suppression hides captions immediately with `caption_hidden`, purge deletes public objects by key and verifies old URLs return 404 within 15 minutes. Section 4.
5. Audit survives deletion. `moderation_actions` has no cascades, `users.id` no longer cascades from auth, delete_account anonymizes and disables sign-in. R12. Section 3, 3.1.
6. One logical alert per notification, batching removed. Send is idempotent with `sent_attempt_at` written before the HTTP call. Section 6.2.
7. `app_reader` evaluates privacy through a security definer helper `is_suppressed`, never a direct grant. Negative tests distinguish permission denied on revoked tables from empty results under RLS. Section 4, Phase 0 gates.
8. Permission dead end closed, Turn on alerts action in Settings and the Alerts empty state. Review outcome is an in-app inbox row, never a push. Section 7.2.
9. Queue labels separate transfer, processing, and review. Copy softened. Section 7.5.
10. Passport compression order for small screens and 200 percent text. Section 7.2.
11. O1, Stage 2 thesis gate as a placeholder table with continue, revise, stop rows. Values open. Section 8.5.
12. Event taxonomy renamed to submission events. Section 8.1.
13. Phase 0 gate for publish job recovery. Section 9.

### What changed from v1.2

External architecture review on 2026-09-19 found six broken contracts. This version fixes them by design, not by patch. Rulings R6 to R10.

1. R7, submission-first write path. Every capture is a `submissions` row with a state machine. A `sightings` row exists only after `publish_submission`. `sightings.airframe_id` is never null. Unidentified captures wait in `awaiting_identification`, verified users can propose a registration. Sections 1.2, 3, 4, 5.
2. Identity over time. `resolve_airframe` takes `taken_at` and resolves against registration validity ranges. Overlap or pre-history dates go to quarantine. Section 5.1.
3. R8, canonical Passport route is `/aircraft/[airframe_id]`. `/aircraft/[reg]` is a discovery alias with a disambiguation page. Section 5.3.
4. Media order. Derivatives are generated into a private `pending` bucket and copied to public only on publish. One processing job per submission, both triggers converge on one idempotent handler. Section 5.2.
5. Alerts. `alert_events` is the logical alert, `alert_deliveries` is per device. Rate limit is a unique index on a 24-hour bucket, not a lookup. Payload carries `alert_id`. R9, nothing is called delivered, the confirmed state is `provider_accepted`. R6, alert eligibility requires `taken_at` within 7 days of publication. Section 6, 8.2, 8.4.
6. Privacy enforcement. Column-level grants file, `published_sightings` owned by a dedicated role, REST-level negative tests, suppression covers airport lens membership, share derivatives, and cache purge. Section 4.
7. Processing feasibility gate for Edge Function limits, benchmark in Phase S with a named worker fallback. Section 5.2.
8. Schema completeness. `moderation_actions`, `purge_jobs`, `identification_proposals`, `registration_prefixes`, `strike_count`, `hero_sighting_id`, on-delete behavior on every user FK. R10, users are anonymized never hard deleted. Section 3.
9. Design contract fixes. Permission moment rule 7.2.10, Passport above-the-fold rule 7.2.11, queue copy no longer promises background upload, ThemedText encodes the D1 contrast exceptions. Section 7.
10. Opportunity metric beside the North Star. Section 8.2.
11. Registration prefix data is one JSON source generating both TS and SQL. Validator v2 strips before matching.

### What changed from v1.1

1. Ruling R5, non-US registration resolution in three tiers, FAA tier 1, OpenSky tier 2 resolvable, user stub tier 3 with ICAO prefix validation. One schema column, one RPC step, one new Edge Function, one Phase 0 task and gate.
2. Ruling D1, token freeze with contrast-corrected hex values, section 7.1 updated. New semantic token buttonLabelOnAccent.
3. Ruling D2, hairline borders exempt from 3 to 1 non-text contrast, no component may rely on border as sole affordance.
4. T2, real capacity 20 to 30 hours per week recorded, calendar 26 to 34 weeks, Phase S 5 to 6 weeks.
5. Repo grounding doc set added, CLAUDE.md, AGENTS.md, docs/SPEC.md, docs/DESIGN.md, docs/PRD.md, docs/user-profiles.md, packages/shared/registration-prefixes.ts.

### What changed from v1.0

1. New Phase S, a pre-build spike plus usability validation phase with hard exit gates, CKC rulings R1 and R2.
2. Timeline updated honestly, 16 to 21 weeks full-time solo.
3. Performance budgets are now numeric release gates.
4. Canonical analytics event taxonomy added as the Measurement Contract, section 8.
5. SaveConfirmation, storage-pressure handling, post-publish Passport routing, Alerts tab demotion rule, two-stage hub gates, capture flow at 4 UI steps with 5 telemetry milestones, alt-text privacy rule, Spot inline education, verification-state labels.
6. Attribution ruling R4, Android Install Referrer only, iOS blind spot accepted and documented.
7. Pro fake door reconciled, passive Settings row for all, active surfacing only after demonstrated repeat value.
8. Decision log v1.1 in section 12.

---

## 1. Mission and Non-Negotiable Invariants

### 1.1 Mission

Build the PlaneSpotter Validation MVP. A mobile app (React Native + Expo, iOS and Android) plus a thin public web layer and a minimal admin console. The core object is the airframe, a persistent aircraft identity that accumulates community sightings over time. The product loop to validate, a user photographs an aircraft, the sighting attaches to that airframe's permanent history, another user who follows that airframe gets one push alert and returns.

The MVP exists to answer one question, will people contribute to a shared aircraft history and return because other people keep adding to the same airframes. Everything in this pack serves that question. Nothing outside this pack gets built.

### 1.2 Invariants

These rules are absolute. Violating one is a build failure even if the feature works. Each is testable and several are phase exit gates.

1. **Idempotent contribution.** Submission creation is idempotent on `(user_id, client_submission_id)`. Publish is idempotent on `submission_id`. Any number of client or job retries produces exactly one submission and at most one sighting. R7.
2. **Never auto-merge airframes.** Registration matching may surface candidates but never merges two existing airframes. Conflicting evidence goes to the `import_conflicts` quarantine for human resolution.
3. **Clients never create canonical aircraft, and sightings are never unidentified.** All airframe resolution and stub creation happens server-side inside `publish_submission`, using the observation date against registration validity history. `sightings.airframe_id` is never null. Unidentified or ambiguous captures wait in `submissions` and never become sightings until identity is settled. The registration field captures user text only and the UI never implies unverified metadata is authoritative.
4. **Originals never reach feeds, unapproved derivatives never reach the public bucket.** Every upload produces feed, detail, and share derivatives into the private `pending` bucket. They are copied to the public `derivatives` bucket only by `publish_submission`. Pending derivatives are deleted on cancellation and on processing_failed, and kept 30 days after a moderator rejection so a reopened submission can publish without reprocessing, a scheduled service cleanup removes them only if they remain rejected after that. Original files live in the private `originals` bucket.
5. **Provenance and freshness are separate.** Every submission carries `ingestion_source` and `taken_at`. Behavioral metrics, activation, and the North Star count `native_mobile` only. Alert eligibility additionally requires `taken_at` within 7 days of publication, R6. Backfill is visible in product surfaces with an Archive label and invisible to KPIs.
6. **Location privacy is server-side.** `captured_geo` is never publicly readable. Public surfaces read `display_geo` only, which is null when any suppression policy applies. Privacy is enforced in the database layer through grants, the projection view, and RPCs, not in client code. Suppressed sightings never leak through thumbnails, map previews, share derivatives, alt text, analytics, airport lens membership, or cached pages.
7. **One alert type, rate-limited.** The only push notification is the followed-airframe alert, maximum one per airframe per user per 24-hour bucket, enforced by a unique index, not a lookup.
8. **RLS plus grants everywhere.** Row Level Security is enabled on every table. Column-level grants restrict what the `authenticated` and `anon` roles may read or write. User writes are constrained to their own rows or funneled through security-definer RPCs. Moderation, publication, imports, and fanout run through the service role only, never from client code. Negative tests run against the REST API with the anon and authenticated keys, not against the app.
9. **Telemetry hygiene.** Raw EXIF, exact GPS, private media URLs, captions, email addresses, and free-text moderation notes never enter analytics events or crash logs. Section 8 defines the only permitted events.
10. **Moderation is real and auditable.** New users' first five contributions require human approval before publishing. Trusted users auto-publish. Every submission state transition writes a `moderation_actions` row with actor, from state, to state, and reason.
11. **Offline is durable and honestly reported.** Captured media is copied into app-controlled storage before anything else, queue state lives in SQLite, and app kill or device restart never loses a pending submission. The app claims Saved on this device only after both the persistent media copy and the SQLite transaction succeed. Upload resumes when the app is next in the foreground, background execution is best effort and never promised in copy. If device storage is insufficient, the app stops before claiming safety and offers a way out.
12. **No deferred features.** Comments, follow-user, video, badges, scores, heatmaps, DMs, web upload, ranked Explore, paid tier, marketplace, and realtime tracking are out of scope. Do not scaffold for them, do not build them.

### 1.3 Decision priority order

When two valid choices conflict during implementation, decide in this order. Safety and privacy, then data integrity, then recoverability, then accessibility, then thesis clarity, then speed, then visual polish.

---

## 2. Repository and Environment

### 2.1 Monorepo layout

```text
planespotter/
  apps/
    mobile/          Expo app, TypeScript, expo-router
    web/             Next.js app, public pages + share render + admin console
  supabase/
    migrations/      Numbered SQL migrations from section 3
    functions/       Edge Functions from sections 5 and 6
  packages/
    shared/          tokens.ts, types.ts, events.ts, zod schemas shared by mobile and web
  BuildPack.md       This file
```

pnpm workspaces. TypeScript strict mode everywhere, no `any`.

Phase S rule, all spike code is written inside this monorepo against the real schema and real services. The application slice is reusable; the isolated fixture harness is test support only. Phase S scope is the happy path and crash recovery in section 9; full authorization and fencing are completed in Phase 0.

### 2.2 Core dependencies

| Area | Package |
|---|---|
| Mobile framework | expo (SDK 54 or later), expo-router. NativeTabs only if the Phase S spike passes the section 9 criteria, otherwise standard JS tabs with an opaque surface. Liquid Glass is enhancement-only and never a release dependency |
| Lists | @shopify/flash-list |
| Images | expo-image |
| Local queue | expo-sqlite |
| Push | expo-notifications |
| Uploads | tus-js-client against Supabase Storage resumable endpoint |
| Backend client | @supabase/supabase-js |
| Maps | @rnmapbox/maps (mobile), Mapbox Static Images via server proxy (web) |
| Web | next (App Router) on Vercel |
| Analytics | posthog-react-native, posthog-js, wrapped by packages/shared/events.ts |
| Errors | @sentry/react-native, @sentry/nextjs |
| Install attribution | Android Play Install Referrer only, ruling R4. No third-party attribution SDK. The iOS install-attribution blind spot is accepted and documented in metrics |

### 2.3 Environment variables

```text
SUPABASE_URL                    all apps
SUPABASE_ANON_KEY               mobile, web client
SUPABASE_SERVICE_ROLE_KEY       web server routes and Edge Functions only, never shipped to clients
MAPBOX_ACCESS_TOKEN             mobile
MAPBOX_SECRET_TOKEN             server-side static snapshot proxy
EXPO_ACCESS_TOKEN               CI builds
SENTRY_DSN_MOBILE / _WEB
POSTHOG_API_KEY
ADMIN_ALLOWED_EMAILS            comma list, gates the admin console
```

Secrets never enter the repo. `.env.example` documents every variable.

---

## 3. Database Schema

Postgres with PostGIS on Supabase. Deliver as numbered migration files. The consolidated schema follows, split it into logical migrations (extensions, enums, identity, content, social, safety, indexes, triggers, grants).

Write path in one sentence, R7. Every capture is a `submissions` row, a `sightings` row exists only after `publish_submission` succeeds, and a sighting always has an airframe.

```sql
-- extensions
create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_cron;

-- enums
create type submission_state as enum
  ('received','processing','awaiting_identification','awaiting_review',
   'quarantined','published','rejected','cancelled');
create type sighting_status as enum ('published','deleted');
create type ingestion_source as enum
  ('native_mobile','concierge_backfill','admin_import');
create type stub_status as enum
  ('pending','enriched','verified','conflicted','rejected');
create type trust_tier as enum ('new','trusted','verified');
create type follow_target as enum ('airframe','airport');
create type conflict_status as enum ('open','resolved','dismissed');
create type report_status as enum ('open','actioned','dismissed');
create type privacy_policy_type as enum
  ('ladd','owner_request','sensitive_operator','jurisdiction','internal_safety');
create type policy_status as enum ('active','expired','revoked');
create type alert_event_status as enum
  ('pending','sent','provider_accepted','provider_rejected','skipped');
create type delivery_status as enum
  ('pending','sending','sent','provider_accepted','provider_rejected','failed');
create type resolution_outcome as enum
  ('matched','stub_enriched','stub_pending','ambiguous','invalid');

-- identity
-- users rows are never hard deleted, account deletion anonymizes, R10
create table public.users (
  id uuid primary key references auth.users(id) on delete restrict,
  handle text unique not null check (handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  display_name text not null,
  avatar_url text,
  trust_tier trust_tier not null default 'new',
  home_airport text,
  strike_count int not null default 0,
  anonymized_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  icao text unique,
  iata text,
  name text not null,
  country text
);

create table public.airframes (
  id uuid primary key default gen_random_uuid(),
  manufacturer text,
  model text,
  type_code text,
  serial_number text,
  year_built int,
  status text,
  is_stub boolean not null default false,
  stub_resolution_status stub_status,
  stub_created_at timestamptz,
  stub_last_checked_at timestamptz,
  stub_confidence numeric,
  hero_sighting_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.airframe_registrations (
  id uuid primary key default gen_random_uuid(),
  airframe_id uuid not null references public.airframes(id) on delete cascade,
  registration text not null,
  country text,
  icao24_hex text,
  valid_from date,
  valid_to date,
  is_current boolean not null default true,
  source_record_id uuid,
  resolution_source text check (resolution_source in ('faa','opensky','user_stub'))
);
-- valid_from and valid_to are the identity-over-time contract, resolution reads them
-- one airframe may hold a registration currently, reassignment history allowed
create unique index uq_current_registration
  on public.airframe_registrations (registration) where is_current;
create index ix_registrations_history
  on public.airframe_registrations (registration, valid_from, valid_to);

-- registration prefix reference, generated from packages/shared/registration-prefixes.json
create table public.registration_prefixes (
  prefix text primary key,
  country text not null,
  uses_hyphen boolean not null,
  pattern text
);

create table public.airframe_operator_history (
  id uuid primary key default gen_random_uuid(),
  airframe_id uuid not null references public.airframes(id) on delete cascade,
  operator_id uuid not null references public.operators(id),
  valid_from date,
  valid_to date,
  source_record_id uuid
);

create table public.aircraft_source_records (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_key text not null,
  retrieved_at timestamptz not null default now(),
  effective_at date,
  checksum text,
  raw_reference jsonb,
  confidence numeric,
  unique (source_system, source_key, checksum)
);

create table public.import_conflicts (
  id uuid primary key default gen_random_uuid(),
  conflict_type text not null,
  registration text,
  icao24_hex text,
  submission_id uuid,
  source_record_ids uuid[] not null default '{}',
  detected_at timestamptz not null default now(),
  status conflict_status not null default 'open',
  resolved_by uuid references public.users(id) on delete set null,
  resolution_note text
);

create table public.airports (
  icao text primary key,
  iata text,
  name text not null,
  geo geography(point, 4326),
  country text,
  sighting_count int not null default 0
);

-- content, write path
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  client_submission_id uuid not null,
  state submission_state not null default 'received',
  registration_text text,
  taken_at timestamptz,
  captured_geo geography(point, 4326),
  airport_icao text references public.airports(icao),
  caption text check (char_length(caption) <= 500),
  ingestion_source ingestion_source not null default 'native_mobile',
  contribution_batch_id uuid,
  resolved_airframe_id uuid references public.airframes(id),
  resolved_registration_id uuid references public.airframe_registrations(id),
  resolution_outcome resolution_outcome,
  sighting_id uuid,
  rejection_reason text,
  resubmit_count int not null default 0 check (resubmit_count <= 3),
  caption_hidden boolean not null default false,
  content_revision bigint not null default 1 check (content_revision >= 1),
  review_required boolean not null default true,
  approved_revision bigint,
  approval_kind text check (approval_kind in ('moderator','trusted_auto')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  lease_until timestamptz,
  lease_token uuid,
  processing_attempts int not null default 0 check (processing_attempts >= 0),
  check ((approved_revision is null and approval_kind is null and approved_at is null)
    or (approved_revision is not null and approved_revision = content_revision and approval_kind is not null and approved_at is not null)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_submission_id)
);

-- content, read path, exists only after publish
create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id),
  airframe_id uuid not null references public.airframes(id),
  registration_id uuid references public.airframe_registrations(id),
  user_id uuid not null references public.users(id),
  airport_icao text references public.airports(icao),
  captured_geo geography(point, 4326),
  display_geo geography(point, 4326),
  taken_at timestamptz,
  published_at timestamptz not null default now(),
  caption text check (char_length(caption) <= 500),
  caption_hidden boolean not null default false,
  status sighting_status not null default 'published',
  ingestion_source ingestion_source not null,
  contribution_batch_id uuid,
  spot_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.submissions
  add constraint fk_submission_sighting
  foreign key (sighting_id) references public.sightings(id) on delete set null;
alter table public.airframes
  add constraint fk_hero_sighting
  foreign key (hero_sighting_id) references public.sightings(id) on delete set null;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  sighting_id uuid references public.sightings(id) on delete set null,
  original_path text not null,
  feed_path text,
  detail_path text,
  share_path text,
  derivatives_bucket text not null default 'pending' check (derivatives_bucket in ('pending','derivatives')),
  phash text,
  exif jsonb,
  width int,
  height int,
  created_at timestamptz not null default now()
);

create table public.identification_proposals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  proposed_by uuid not null references public.users(id),
  registration_text text not null,
  note text check (char_length(note) <= 280),
  status report_status not null default 'open',
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (submission_id, proposed_by)
);

-- audit rows survive every deletion, R12. No cascades. target_ref keeps the id as text after the FK is nulled.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete set null,
  sighting_id uuid references public.sightings(id) on delete set null,
  target_ref text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_kind text not null check (actor_kind in ('user','moderator','system')),
  from_state text,
  to_state text not null,
  reason text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- durable publication, one row per publish attempt series, leased by a worker
create table public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  stage text not null default 'waiting_authorization' check (stage in
    ('waiting_authorization','claimed','resolved','copied','verified','committed','cleanup','failed')),
  submission_revision bigint,
  lease_until timestamptz,
  lease_token uuid,
  cleanup_completed_at timestamptz,
  attempts int not null default 0,
  resolved_airframe_id uuid,
  resolved_registration_id uuid,
  publish_nonce text not null default encode(gen_random_bytes(16), 'hex'),
  public_keys text[] not null default '{}',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purge_jobs (
  id uuid primary key default gen_random_uuid(),
  job_kind text not null check (job_kind in
    ('sighting_delete','submission_delete','suppression_change','user_anonymize')),
  target_id uuid not null,
  storage_paths text[] not null default '{}',
  revalidate_tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','running','done','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- social
create table public.follows (
  user_id uuid not null references public.users(id) on delete cascade,
  target_type follow_target not null,
  target_id text not null,
  created_via text not null default 'deliberate' check (created_via in ('deliberate','onboarding')),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table public.votes (
  user_id uuid not null references public.users(id) on delete cascade,
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, sighting_id)
);

create table public.device_push_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null,
  permission_state text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- one logical alert per user per airframe per 24-hour bucket
create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  airframe_id uuid not null references public.airframes(id),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  window_key bigint not null,
  created_at timestamptz not null default now(),
  status alert_event_status not null default 'pending',
  opened_at timestamptz,
  session_attributed_at timestamptz,
  unique (user_id, airframe_id, window_key)
);
-- window_key = floor(extract(epoch from now()) / 86400), invariant 7 by uniqueness, no not-exists race

-- one row per device token per alert
create table public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  alert_event_id uuid not null references public.alert_events(id) on delete cascade,
  token text not null,
  platform text not null,
  status delivery_status not null default 'pending',
  expo_ticket_id text,
  provider_status text,
  provider_receipt_at timestamptz,
  failure_reason text,
  sent_attempt_at timestamptz,
  sending_lease_until timestamptz,
  send_attempt_id uuid,
  sent_at timestamptz,
  retry_count int not null default 0 check (retry_count between 0 and 1),
  unique (alert_event_id, token)
);

-- safety and trust
create table public.flags (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  user_id uuid not null references public.users(id),
  reason text not null,
  status report_status not null default 'open',
  moderation_outcome text,
  created_at timestamptz not null default now(),
  unique (sighting_id, user_id)
);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id),
  reported_user_id uuid not null references public.users(id),
  reason text not null,
  status report_status not null default 'open',
  moderation_outcome text,
  created_at timestamptz not null default now()
);

create table public.user_blocks (
  blocker_user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id)
);

create table public.terms_acceptance (
  user_id uuid not null references public.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, terms_version)
);

create table public.sighting_corrections (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  corrected_by uuid not null references public.users(id),
  reason text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.aircraft_privacy_policies (
  id uuid primary key default gen_random_uuid(),
  airframe_id uuid references public.airframes(id) on delete cascade,
  registration_id uuid references public.airframe_registrations(id),
  policy_type privacy_policy_type not null,
  source text,
  effective_from date,
  effective_to date,
  status policy_status not null default 'active',
  last_checked_at timestamptz
);

create table public.owner_claims (
  id uuid primary key default gen_random_uuid(),
  airframe_id uuid not null references public.airframes(id),
  claimant_user_id uuid not null references public.users(id),
  claim_type text not null,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now()
);

-- performance indexes
create index ix_submissions_user_state on public.submissions (user_id, state, updated_at desc);
create index ix_submissions_state on public.submissions (state) where state in ('processing','awaiting_identification','awaiting_review','quarantined');
create index ix_submissions_processing_lease on public.submissions (lease_until) where state = 'processing';
create index ix_sightings_airframe_feed
  on public.sightings (airframe_id, published_at desc) where status = 'published';
create index ix_sightings_user_feed
  on public.sightings (user_id, published_at desc) where status = 'published';
create index ix_sightings_airport_feed
  on public.sightings (airport_icao, published_at desc) where status = 'published';
create index ix_sightings_home_feed
  on public.sightings (published_at desc) where status = 'published';
create index ix_sightings_display_geo on public.sightings using gist (display_geo);
create index ix_airports_geo on public.airports using gist (geo);
create index ix_registrations_lookup on public.airframe_registrations (registration);
create index ix_media_phash on public.media (phash);
create index ix_alerts_pending on public.alert_events (status) where status = 'pending';
create index ix_deliveries_pending on public.alert_deliveries (status) where status in ('pending','sent');
create index ix_follows_target on public.follows (target_type, target_id);
create index ix_purge_pending on public.purge_jobs (status) where status = 'pending';
create index ix_publish_jobs_lease on public.publish_jobs (lease_until)
  where stage in ('claimed','resolved','copied','verified','cleanup');
create index ix_deliveries_recovery on public.alert_deliveries (sending_lease_until)
  where status = 'sending' and expo_ticket_id is null;
```

### 3.1 Schema notes

- `spot_count` on sightings is a denormalized counter maintained by a trigger on `votes`, this keeps voter identity private under RLS while counts stay cheap.
- Client queue states map one to one onto `submission_state`. The mobile SQLite queue mirrors the server state plus local-only substates for media copy and upload progress.
- `follows.target_id` is text, uuid for airframes, ICAO for airports, constrained by RPC validation. `created_via` distinguishes onboarding seeds from deliberate follows for the permission moment rule, section 7.2.
- `users` rows are never hard deleted, R10 and R12. The auth.users row is never deleted either, `users.id` restricts it. delete_account sets `anonymized_at`, replaces handle, display_name and avatar, bans the auth user via the admin API so sign-in fails, deletes follows, votes, tokens, blocks, and enqueues purge jobs for own submissions and sightings. `moderation_actions` rows survive with FKs nulled and `target_ref` intact. Anonymization is an update, it triggers no cascade, so the cascade rules on other tables are never the deletion mechanism.
- Approval fields are service-managed and tied to content_revision. A parked publish job is not approval; section 5.5 owns authorization, lease fencing, manifests and cleanup.
- Resubmission reopens the same submission, R11. A rejected submission returns to awaiting_review through update_submission with review_required true and no approval, `resubmit_count` increments, the fourth attempt is refused with copy that points to support. Prior caption and registration_text are snapshotted into `moderation_actions.payload` on every reject and resubmit. The photo is immutable across resubmits, a different photo is a new capture.
- `registration_prefixes` is generated, never hand-edited. One JSON source, `packages/shared/registration-prefixes.json`, produces both the TypeScript module and a migration. CI fails if they drift.
- `window_key` on alert_events is a fixed 24-hour UTC bucket. This is a deliberate simplification from a rolling window, it makes invariant 7 a unique-index guarantee under concurrency.

---

## 4. RLS Policy Matrix, Grants, and Privacy Enforcement

Enable RLS on every table. `service_role` bypasses RLS by design and is the only path for imports, moderation writes, publication, enrichment, and fanout. Admin console actions run through web server routes using the service key after the `ADMIN_ALLOWED_EMAILS` check.

RLS restricts rows. It does not restrict columns. Every rule below that names specific columns is implemented as a column-level grant to `authenticated` or `anon`, or as an RPC, never as an RLS policy alone. The migration ships a grants file that revokes all on every table from `anon` and `authenticated` and then grants back exactly what the matrix says.

| Table | select | insert | update | delete |
|---|---|---|---|---|
| users | authenticated and anon, columns id, handle, display_name, avatar_url, trust_tier, home_airport only | via signup trigger only | own row, columns handle, display_name, avatar_url, home_airport via RPC update_profile | never, anonymize via RPC delete_account |
| airframes, airframe_registrations, operators, airframe_operator_history, airports, registration_prefixes | public | service role | service role | service role |
| aircraft_source_records, import_conflicts | service role | service role | service role | service role |
| submissions | own rows, explicit owner column allowlist below; no direct caption, approved_by, approval_kind or lease_token; approval boolean via get_my_submissions only | denied directly, RPC create_submission only | own rows, caption and registration_text while state in received, processing, awaiting_identification, awaiting_review, rejected, via RPC update_submission, rejected reopens to awaiting_review, R11 | own rows via RPC cancel_submission while not published, service role |
| sightings | via published_sightings view only for authenticated and anon, direct table select revoked | service role via publish_submission | service role | own via RPC delete_sighting, service role |
| media | direct select revoked, derivative paths reach clients through the view, own submission media via RPC get_my_submissions | service role and upload pipeline | service role | cascades |
| identification_proposals | own submitted, plus open proposals on any submission for verified tier | verified tier via RPC propose_identification | service role | service role |
| moderation_actions | service role; owners receive only the sanitized last-action summary via get_my_submissions | service role | never | never |
| publish_jobs | service role only, includes private nonce and intended-key manifest | service role | service role | service role, only after cleanup or committed-content purge |
| purge_jobs | service role | service role | service role | service role |
| follows | own rows | own rows via RPC toggle_follow | none | own rows via RPC |
| votes | own rows only, counts come from sightings.spot_count | own via RPC toggle_spot | none | own via RPC |
| device_push_tokens | own | own via RPC register_push_token | own via RPC | own via RPC |
| alert_events | own rows, columns id, airframe_id, sighting_id, status, created_at, opened_at | service role | opened_at and session_attributed_at on own rows via RPC mark_alert_opened | service role |
| alert_deliveries | service role only | service role | service role | service role |
| flags, user_reports | own submitted rows | any authenticated via RPC, one flag per sighting per user | service role | service role |
| user_blocks | own rows as blocker | own | none | own |
| terms_acceptance | own | own | none | none |
| sighting_corrections | own submitted, service role all | verified tier users only via RPC | service role | service role |
| aircraft_privacy_policies | service role only, never public | service role | service role | service role |
| owner_claims | own | own via RPC | service role | service role |

Owner projection (binding). After revoking table-level privileges, grant only these submission columns to authenticated; retain the owner SELECT RLS predicate `user_id = auth.uid()`. No submission SELECT grant to anon. Do not grant SELECT on the whole table or use SELECT * in owner endpoints.

```sql
grant select (
  id, user_id, client_submission_id, state, registration_text, taken_at,
  captured_geo, airport_icao, ingestion_source, contribution_batch_id,
  resolved_airframe_id, resolved_registration_id, resolution_outcome,
  sighting_id, rejection_reason, resubmit_count, created_at, updated_at
) on public.submissions to authenticated;
```

`get_my_submissions` builds JSON explicitly from that allowlist, plus `caption` (null when caption_hidden), permitted media paths, a sanitized last-action summary, and `is_approved`. Compute `is_approved` as `(approved_revision IS NOT NULL AND approved_revision = content_revision AND approved_at IS NOT NULL)`. Approval is this boolean only: omit approved_by, approval_kind, approved_revision and approved_at; also omit lease_token and all other worker internals. The last-action summary contains only from_state, to_state, created_at and a curated user-facing reason code; never actor_user_id, actor_kind, raw reason, payload, target_ref, email or moderator identity. Media projection must still obey the private-pending and precommit-key restrictions.

User mutation RPCs create_submission, update_submission and finalize_submission return explicit owner JSON from the same allowlist plus masked caption, without approval metadata; clients refresh approval through get_my_submissions. They never return the submissions composite or serialize a complete row. These requirements apply equally to idempotent/existing-row responses and error details.

Structural rules on top of the matrix.

1. **Public visibility is one view, with an explicit owner.** `published_sightings` is a `security_barrier` view owned by a dedicated role `app_reader` that holds column-level select on exactly the public columns of sightings, media, users, airframes, and airframe_registrations. The view is not `security_invoker`, it is the projection by design, so it must never expose a column the owner role cannot read. It joins sightings, media derivative paths, users public fields, and a lateral privacy check that nulls airport_icao and display_geo when any active `aircraft_privacy_policies` row applies to the airframe or registration. All feeds, app and web, read this view. `anon` and `authenticated` have select on the view and nothing on the underlying tables except what the matrix grants.
2. **Suppression covers membership, text, objects, and future content, with a deadline.** When a policy becomes active, a trigger on aircraft_privacy_policies immediately sets `caption_hidden` on every submission and sighting of that airframe, and the view returns caption null while hidden, a moderator clears the flag per sighting after reading the caption. The sighting is excluded from the airport lens entirely, `display_geo` and `airport_icao` are null in every lens, alt text omits location. A `purge_jobs` row of kind suppression_change deletes the share and detail objects from the public bucket by key, regenerates a share derivative without airport and date under a new nonce key, updates media paths, revalidates every affected web tag, and purges the map snapshot cache. Old keys are never reused, so an old URL stays 404 forever. New content, publish_submission sets caption_hidden from is_suppressed at commit, so a submission published after the policy starts hidden. Edits, update_submission never clears caption_hidden. Public bucket URLs are not access controlled, so the only revocation is object deletion. Gate, every previously issued share and detail URL returns 404 within 15 minutes of policy activation, tested against URLs captured before activation.
3. **Storage buckets.** `originals` private, owner read only. `pending` private, service role only. `derivatives` public read. Upload writes go to `originals/{user_id}/{client_submission_id}` via TUS, path enforced by storage policy. Derivatives move from `pending` to `derivatives` only inside `publish_submission`, invariant 4.
4. **Negative tests are REST tests, and know the difference between denied and empty.** The Phase 0 privacy gate runs against the Supabase REST endpoint with the anon key and a low-trust authenticated key. Direct select on sightings, media, alert_deliveries, aircraft_privacy_policies, publish_jobs, and moderation_actions must return permission denied, these tables are revoked. Select only permitted submission columns as another user must return an empty result, RLS filters rows and never raises per row. Asserting permission denied for that safe-column, other-owner query would be a false test; forbidden-column queries must be denied even to the owner.
5. **Privacy check helper.** `app_reader` has no grant on aircraft_privacy_policies. The view calls `is_suppressed`, the only path from public reads to the policies table.

```sql
create or replace function public.is_suppressed(p_airframe_id uuid, p_registration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.aircraft_privacy_policies p
    where p.status = 'active'
      and (p.airframe_id = p_airframe_id or p.registration_id = p_registration_id)
      and (p.effective_from is null or p.effective_from <= current_date)
      and (p.effective_to is null or p.effective_to >= current_date)
  );
$$;
revoke all on function public.is_suppressed(uuid, uuid) from public;
grant execute on function public.is_suppressed(uuid, uuid) to app_reader, service_role;
```

---

## 5. API and RPC Contract Sheet

All RPCs are Postgres functions, `security definer`, input-validated, callable via supabase-js `rpc()`. Edge Functions handle storage and network orchestration; the RPC publish_submission requests the durable job and returns its status, while publish-runner performs its external stages. Service-only endpoints check `auth.role() = 'service_role'` and raise otherwise. User RPCs validate auth.uid() and call a private, non-exposed transition helper as their function owner; they do not call a service-only endpoint with the user's JWT. Revoke direct execution of that helper from PUBLIC, anon, and authenticated; use a fixed safe search_path and schema-qualified names.

### 5.1 RPCs

| Function | Signature | Caller | Behavior |
|---|---|---|---|
| create_submission | (p jsonb) returns jsonb | user | Validates payload, inserts with on conflict (user_id, client_submission_id) do nothing then returns the existing owner projection, invariant 1. State received. Fields, client_submission_id, registration_text nullable, taken_at, captured_geo, airport_icao, caption. Writes moderation_actions row actor_kind user. No airframe resolution here |
| update_submission | (p_submission_id uuid, p jsonb) returns jsonb | user | Own row; caption and registration_text only in received, processing, awaiting_identification, awaiting_review, rejected. Follow the advisory-lock, submission, job order in section 5.5. Actual content changes increment content_revision and clear approval; identical retried payloads do not increment. A rejected row reopens to awaiting_review, increments resubmit_count once, cap 3, snapshots prior values. Identification correction also enters awaiting_review. Both require moderator approval and park the job; never reset it to runnable. Dirty jobs enter cleanup retaining their nonce and manifest. Caption edits consult suppression and never clear caption_hidden. See section 5.5. |
| cancel_submission | (p_submission_id uuid) returns void | user | Own row, any state except published; already cancelled is idempotent. Under the section 5.5 lock order clear approval and set cancelled through the internal state helper. Invalidate processing/publication lease tokens; move any uncommitted publication generation to cleanup. Retain job and key manifest until cleanup succeeds. Enqueue private-media purge; never cascade-delete a live job before its public objects have been cleaned. |
| get_my_submissions | (p_states submission_state[] default null) returns jsonb | user | Explicit owner projection from section 4 with masked caption, permitted media paths, sanitized last-action summary and is_approved boolean; never moderator identity, approval kind or lease token. Feeds the upload queue and pending ribbons |
| advance_submission | (p_submission_id uuid, p_to submission_state, p_reason text default null) returns submissions | service | Service endpoint wrapping the private state-transition helper. Guarded transitions only; invalid or repeated transitions are no-ops with no additional action row. Every actual transition is audited. Entering awaiting_review from rejected, quarantined, or awaiting_identification revokes approval, sets review_required true, and parks the publication job or requests cleanup; it does not authorize publication. Section 5.5 governs revision and restart checks. |
| finalize_submission | (p_submission_id uuid) returns jsonb | user | Called after TUS upload completes, advance received to processing, enqueue process-media with job key = submission id |
| resolve_airframe | (p_registration text, p_taken_at timestamptz) returns table(airframe_id uuid, registration_id uuid, outcome resolution_outcome) | service | R5 plus identity over time. Normalizes per registration_prefixes, unknown prefix or bad format returns outcome invalid. Loads all airframe_registrations rows for the registration. Exactly one row whose validity covers p_taken_at, or one row with null validity and is_current, returns matched. Two or more rows cover p_taken_at, or p_taken_at is before the earliest valid_from with history present, returns ambiguous and writes import_conflicts with submission_id. No rows, tier 2 OpenSky record creates enriched stub and returns stub_enriched, else creates pending stub and returns stub_pending. Stub creation transactional, safe under concurrency via the unique current-registration index with on conflict re-select. Never merges anything, invariant 2 |
| publish_submission | (p_submission_id uuid) returns jsonb | service | Idempotently request publication for the current authorized revision; returns submission_id, job_id, stage, and sighting_id nullable until committed. Repeated requests never authorize a revision. The durable worker follows section 5.5: waiting_authorization, claimed (preflight operation), resolved, copied, verified, committed; cleanup precedes failed. Public objects use the persisted nonce and a manifest committed before copy, R13. Final SQL commit requires current approval, expected revision and current unexpired lease token. A committed job returns its existing sighting. |
| authorize_submission | (p_submission_id uuid, p_expected_revision bigint, p_kind text) returns jsonb | service | Validates moderator identity from the authenticated admin route or a trusted_auto request from process-media. Rejects stale revision, incomplete media, anonymized author, or ineligible state/trust. Moderator approval is required whenever review_required is true. Records approval for exactly the current revision and an audit action. Arms a clean parked job; if cleanup is pending, retains approval but waits for cleanup and rechecks before arming. Never directly inserts a sighting. |
| propose_identification | (p_submission_id uuid, p_registration text, p_note text) returns void | user, verified tier | Insert proposal on a submission in awaiting_identification, one per proposer. Moderator accepts in admin, which sets registration_text and advances to awaiting_review |
| toggle_spot | (p_sighting_id uuid) returns int | user | Insert or delete the vote row, trigger maintains spot_count, returns new count |
| toggle_follow | (p_target_type follow_target, p_target_id text, p_via text default 'deliberate') returns boolean | user | Validates target exists, upsert or delete, returns following state. created_via recorded |
| mark_alert_opened | (p_alert_id uuid) returns void | user | Sets opened_at on own alert_events row, first write wins |
| delete_sighting | (p_sighting_id uuid) returns void | user | Owner only, sets status deleted, enqueues purge_jobs sighting_delete with storage paths and revalidate tags, sets submission state cancelled |
| delete_account | () returns void | user | R10, anonymizes users row, cascades per section 3.1, enqueues purge_jobs user_anonymize |
| update_profile | (p jsonb) returns users | user | Own row, four columns only |
| get_feed | (p_lens text, p_filter text, p_cursor_ts timestamptz, p_cursor_id uuid, p_limit int default 20) returns setof published_sightings | user, anon | One feed engine. Lens values home, airframe, airport, user. Keyset pagination on (published_at, id) descending. Home lens also excludes blocked authors for the caller. Airport lens excludes suppressed sightings entirely |
| search_entities | (p_query text, p_kind text, p_limit int, p_offset int) returns jsonb | user, anon | kind registration, airport, spotter. Prefix and trigram match. Offset pagination, load-more UI |
| register_push_token | (p_token text, p_platform text, p_permission text) returns void | user | Upsert own token row |

### 5.2 Edge Functions

| Function | Trigger | Behavior |
|---|---|---|
| process-media | Storage webhook on originals upload complete, and finalize_submission | Atomically claim a processing submission with lease_until = now() + 5 minutes, fresh lease_token, and processing_attempts + 1, only if its lease is absent/expired and processing_attempts < 3. Return the token and content_revision. Work is single-media-row per submission with deterministic private pending keys; derive EXIF, pHash and feed/detail/share images as before. Final metadata writes and transitions require the same unexpired token, current revision, and processing state. A stale worker stops and cannot authorize publication. On completion, an unidentified submission enters awaiting_identification; review_required submissions enter awaiting_review and remain parked until moderator approval. Otherwise current trusted/verified users may receive trusted_auto authorization through authorize_submission. A reprocessing run never removes review_required. The sweeper counts failed/expired attempts, not a third attempt still in progress; it rejects as processing_failed only after the third attempt fails or expires, and deletes partial pending derivatives. Deliberate reprocessing after a completed cycle resets processing_attempts; crash recovery within a cycle never resets it. Originals remain immutable. |
| alert-fanout | pg_cron every minute | Section 6 |
| publish-runner | pg_cron every minute | Only runnable stages claimed, resolved, copied, verified with matching approved revision and an available lease are claimed; waiting_authorization and failed are excluded. Cleanup is claimable independently of approval. Use fresh lease_token and section 5.5 at every stage. Reconcile clean parked jobs only when authorize_submission has already approved the current revision. |
| sweeper | pg_cron every 10 minutes | Recover expired processing leases within the three-attempt cycle. Recover expired publication workers under section 5.5 and preserve cleanup manifests. For uncertain push sends, use only recover_delivery in section 6.2: at least 10 minutes since sent_attempt_at and expired lease, exactly one retry. Stale callbacks are fenced by send_attempt_id. |
| receipt-check | pg_cron every 15 minutes | Section 6 |
| purge-runner | pg_cron every 5 minutes | Processes purge_jobs, removes storage objects in all three buckets, revalidates web tags via Vercel API, purges map snapshot cache, anonymizes rows where legally required. Retries with attempts counter, fails after 5 |
| import-faa | Manual invoke plus weekly cron | Downloads the FAA Releasable Aircraft Database, upserts source records, applies precedence rules, updates registrations including valid_from and valid_to from the deregistration file, conflicting evidence writes import_conflicts rows and touches nothing else, invariant 2 |
| import-opensky | Manual invoke plus monthly cron, R5 | Loads the OpenSky aircraft database into aircraft_source_records with source_system opensky and lower confidence. Never overrides tier 1 facts. Verify license and attribution terms before first production run |
| import-backfill | Manual invoke | Consumes a CSV manifest plus image folder from a private bucket, validates the signed permission flag, creates submissions with ingestion_source concierge_backfill and a shared contribution_batch_id, taken_at from the manifest, routes through the same pipeline and normal moderation. Never fans out, invariant 5 |

Processing feasibility gate, Phase S. Supabase Edge Functions are documented at 256 MB memory and 2 seconds CPU per request. Benchmark the process-media pipeline in Phase S on the largest supported input, 24 megapixel JPEG and HEIC, and record decode plus three derivatives plus pHash CPU time. If it does not fit with headroom, the fallback is a queue-driven worker outside Edge Functions, candidates a Vercel function with sharp or a small always-on worker. Input limits, 30 MB and 8000 px long edge, enforced at TUS and rejected with a human-readable reason. The decision is a Phase S exit gate.

### 5.3 Web server routes (Next.js, service role)

| Route | Purpose |
|---|---|
| /s/[id], /airport/[icao], /spotter/[handle] | Public pages reading published_sightings view, ISR with tag revalidation. One dominant CTA per page, open or follow the Aircraft Passport, store install is secondary |
| /aircraft/[airframe_id] | Canonical Passport, R8. Stable across reassignment. All share cards, deep links, and alerts point here |
| /aircraft/[reg] | Discovery alias. Exactly one current holder redirects 302 to the canonical route. Registration with history renders a disambiguation page listing each airframe with its validity range and hero photo, no redirect |
| /api/og/[sighting] | Share derivative compositing, registration mono, credit, wordmark, per design rules, cached, omits airport and date when suppressed |
| /api/mapsnapshot/[asset] | Opaque proxy to Mapbox Static Images using display_geo, only resolvable for unsuppressed sightings, edge-cached, purgeable by purge-runner. Raw provider URLs with location parameters never appear in page markup |
| /admin/* | Console, gated by Supabase auth plus ADMIN_ALLOWED_EMAILS, all mutations server-side with service key. Screens, submission review queue by state with reason and age, identification proposals, flag and report adjudication, import-conflict resolution with keep-separate as the visually dominant default, registration history inspection, correction audit with before and after values, privacy suppression status, strikes and trust tiers, hero override, moderation_actions audit, purge_jobs and push-provider failures without exposing private media or raw locations |

### 5.4 Client contract essentials

- Mobile talks to Supabase directly for reads via the view and RPCs, never composes raw table joins for public data. Own pending work comes from get_my_submissions.
- TUS upload target is the Supabase Storage resumable endpoint, chunk 6MB, store upload URL and expiry in the local queue, on expiry create a new session with the same submission id, invariant 1 makes this safe.
- Push payload data is `{ alert_id, sighting_id, airframe_id }`. Deep link `planespotter://s/{sighting_id}`. The app calls mark_alert_opened with alert_id before navigating.
- All timestamps UTC ISO 8601 on the wire.

---

### 5.5 Publication authorization, stages, and recovery (binding)

Implementation gate: Phase 0 completes this full contract. Phase S builds the reusable happy path and crash recovery only, within the restricted spike scope in section 9. Authorization, manifest cleanup, lease fencing and adversarial races are not Phase S exit requirements.

**Authorization belongs to content, not to a queue position.** create_submission sets review_required from server trust (true for new users); clients cannot set any approval field. A rejection, quarantine, identification correction, or return from those states sets review_required true regardless of current trust. Each actual caption/registration change increments content_revision and clears approved_revision, approval_kind, approved_at and approved_by. Cancellation and rejection also clear approval. Processing the same immutable photo does not itself change the content revision. Moderator authorization is granted through the authenticated admin route for an expected revision; trusted_auto authorization is allowed only for processing submissions with review_required false and current trusted/verified status. Approval writes an audit action whose payload records revision and kind; it is not a new submission state or analytics event.

A job at waiting_authorization has no authority to copy or commit. authorize_submission requires complete pending media; where needed it schedules processing before approval is granted. An already approved submission needing derivative regeneration returns through processing, clears approval, and is authorized again after media readiness. Moderator approval is never replaced by automatic trust on that path. Reopening a rejected item consumes one of its three resubmits; worker retries and media regeneration do not.

Lock order for every related database mutation: all applicable transaction advisory locks via pg_advisory_xact_lock(hashtext(...)), then submission row locks, then publish_jobs row locks. Compute the airframe key with `hashtext('airframe:' || airframe_id::text)` and the registration key with `hashtext('registration:' || registration_id::text)`; use the one-argument pg_advisory_xact_lock overload for both. Acquire distinct advisory keys in ascending signed numeric order before any submission/job lock; for multiple rows, acquire each table's rows in ascending id order. A one-key airframe operation is `PERFORM pg_advisory_xact_lock(hashtext('airframe:' || airframe_id::text));`; the registration variant is `PERFORM pg_advisory_xact_lock(hashtext('registration:' || registration_id::text));`. Registration-specific policies acquire both their canonical airframe UUID key and their registration UUID key. Publication acquires both resolved identity keys; airframe-wide policy activation acquires its airframe key. Never substitute registration text, a session lock, a row-only lock, or a different hash convention. Determine candidate keys before row locking, revalidate the identity under the row locks, and roll back/retry from lock acquisition if the identity changed. Unresolved work without an identity may take submission/job locks only, but must start a new transaction with identity locks before any publication commit. Advisory locks last only for the database transaction; never hold them across storage/network calls. Check the author's active account, the allowed state, current content_revision, and approval under those locks. All job stage writes and final commits also compare lease_token and require lease_until > now(). A new claimant receives a new token. Old workers may not extend leases, change media paths, update stages, or commit. Network calls use bounded timeouts shorter than the lease; a worker that loses ownership stops issuing storage writes. Cleanup must wait for earlier in-flight storage operations to settle before its final deletion/absence verification; it retries any reappearing object and retains the manifest while outcome is uncertain.

| Job stage | Entry and permitted action | Next stage |
|---|---|---|
| waiting_authorization | Parked and excluded from normal worker selection. Require current approved_revision = content_revision and complete media before arming. For reused jobs, prior cleanup_completed_at must be present. | claimed |
| claimed | Claim with a fresh token. Preflight is an operation here, not a persisted stage: HEAD pending media; if missing, park, revoke approval, set processing, and enqueue regeneration once. Set submission_revision to the authorized revision. | resolved, waiting_authorization, cleanup |
| resolved | Resolve registration/date, store resolved IDs, evaluate suppression before preparing any public variant. Commit the entire intended public_keys list derived from publish_nonce (feed/detail/share) before the first storage copy. Copy only those keys, idempotently, after rechecking ownership and authorization. | copied, cleanup |
| copied | Verify every intended object exists and is the expected variant. Manifest includes objects whose copy never started, so partial copy needs no guesswork. | verified, cleanup |
| verified | In one SQL transaction lock submission then job, validate active author, current approval kind/trust, submission_revision = content_revision = approved_revision, state processing or awaiting_review, current unexpired token, and current suppression. If policy affects the prepared assets, abort publication and clean them; reprepare under a fresh nonce. Insert exactly one sighting, stamp media paths and caption_hidden, mark submission published, write one publish action, update counts, and set job committed. Alert enqueue occurs only in this transaction. | committed, cleanup |
| cleanup | Freeze nonce and manifest; revoke old writer token. Delete every intended key (missing objects are success), wait for prior writes to settle, verify old URLs are unavailable. Retry cleanup with an operational failure alert; never drop the manifest on cleanup errors. No user edit, authorization or cancellation may reset this generation during cleanup. | failed |
| failed | Enter only after cleanup_completed_at is written, including empty-manifest cleanup. Preserve old keys and nonce until restart transaction. A corrected noncancelled submission may be parked with a fresh generation only after this point. Persistent operational failure remains visible to admin. | waiting_authorization |
| committed | Terminal for publication. Return the existing sighting without another insert, alert enqueue, or publish audit row. Later deletion/suppression uses purge_jobs, not publication cleanup. | committed |

**Restart is separate from authorization.** Once cleanup succeeds, atomically replace the old nonce with a new 128-bit random value, empty public_keys, clear resolved IDs/submission_revision, reset failure attempts, clear cleanup_completed_at, and park at waiting_authorization. Never change or reuse a nonce during an active generation. Retain old keys in the completed cleanup audit payload for diagnosis. A fresh authorization may already exist from an admin action during cleanup; the reconciler rechecks it before moving the parked job to claimed. A cancelled submission is never restarted. Publication failures are counted on failed operations/expired work, with cleanup requested after five; successful stage progress and waiting for approval do not consume failure attempts.

**Cancellation, edits, and races.** These mutations use the same locks and invalidate approval and worker tokens before returning. Any generation that might have copied bytes enters cleanup even if no sighting exists. Do not delete its job row until cleanup completes; account deletion follows the same rule. If publication committed first, a requested cancellation uses delete_sighting and its purge path. Registration/caption edits while a worker is running invalidate that revision and require a fresh permitted authorization. Policy activation and publication acquire the exact transaction advisory keys and lock order defined above, in the same transaction as the policy change or publication commit, so a policy cannot miss a concurrent insertion. Acquire these locks before the policy mutation and its trigger scans; do not defer acquisition until after rows have been locked by an activation trigger. The commit rechecks the policy; suppression changes affecting image content force regeneration. R13 permits precommit objects accessible by their secret URL, but no client-visible view, queue RPC, storage listing or telemetry may reveal the nonce/keys before commit.

Pending derivatives survive moderator rejection for 30 days from rejection; a scheduled service cleanup checks current submission state and rejection timestamp again before deleting, so reopened work is not purged by a stale retention task. Cancellation and terminal processing failure remove pending derivatives. The original is retained for allowed regeneration until submission/account deletion. No public derivative is allowed for a rejected item; tests must distinguish retained service-only pending objects from public accessibility.

---

## 6. Alert Fanout, Decided Architecture

Trigger plus cron Edge Function. Long-running push work never runs inside a database trigger. Three objects, the logical alert (alert_events), the delivery attempt per device (alert_deliveries), and the attributed return (opened_at, session_attributed_at on the alert).

### 6.1 Enqueue, database trigger

`after insert on sightings` when ingestion_source = 'native_mobile' and taken_at >= published_at - interval '7 days', R6. Older observations publish normally and never alert.

Inserts into alert_events one row per eligible user, follower of the airframe by any created_via, onboarding follows fan out exactly like deliberate ones, A11, not the author, has at least one push token with permission granted, with `window_key = floor(extract(epoch from now()) / 86400)`, using `on conflict (user_id, airframe_id, window_key) do nothing`. The unique index is the rate limit, invariant 7, two concurrent publishes cannot both enqueue. Backfilled and admin-imported publishes never fan out.

### 6.2 Send and bounded uncertain-send recovery

One logical alert per notification; API transport batches may contain up to 100 independent messages. The unique event and delivery keys enforce logical uniqueness, not exactly-once device delivery. An uncertain send may produce one duplicate transport attempt. Provider behavior can also duplicate delivery; no UI or metric calls this exactly-once delivery.

1. Materialize deliveries for eligible pending events, on conflict do nothing. Recheck that the sighting is still published and the token belongs to the recipient with permission granted before sending.
2. Normal fanout atomically claims **pending only**, commits, and sends only returned rows. It never claims expired sending rows. Each attempt has a new UUID; only the current attempt can record its ticket or immediate error.

```sql
update public.alert_deliveries
set status = 'sending',
    sending_lease_until = now() + interval '2 minutes',
    sent_attempt_at = now(),
    send_attempt_id = gen_random_uuid()
where id = any(p_delivery_ids)
  and status = 'pending'
  and retry_count = 0
returning id, token, send_attempt_id;
```

3. Send `{alert_id, sighting_id, airframe_id}`. Persist a ticket using `WHERE id = p_id AND status = 'sending' AND send_attempt_id = p_attempt_id`. Apply the same guard to errors. A zero-row result is stale and must not overwrite the newer attempt. A matching ticket may be recorded after lease expiry if recovery has not yet claimed a new attempt.
4. Only the service recovery operation recover_delivery may retry an uncertain send. At least 10 minutes must have elapsed since its send attempt, and its sending lease must be expired. Claim and increment retry_count together in one transaction, then commit before HTTP. The guard ensures competing sweepers cannot both retry it.

```sql
update public.alert_deliveries
set retry_count = retry_count + 1,
    send_attempt_id = gen_random_uuid(),
    sent_attempt_at = now(),
    sending_lease_until = now() + interval '2 minutes'
where id = p_delivery_id
  and status = 'sending'
  and expo_ticket_id is null
  and sending_lease_until < now()
  and sent_attempt_at <= now() - interval '10 minutes'
  and retry_count = 0
returning id, token, send_attempt_id;
```

5. A recovered attempt that returns a ticket becomes sent and follows normal receipt processing; it is not marked failed merely because it was retried. A second uncertain outcome (retry_count = 1, no ticket, expired lease and age at least 10 minutes) becomes failed with ticket_lost using a guarded update. No third HTTP attempt is allowed. A worker that died before HTTP is also uncertain; recovery must not assume the request reached Expo.
6. Reconcile logical events from all delivery rows: any provider_accepted wins; pending/sending/sent remains in flight; all provider_rejected becomes provider_rejected. If all attempts are terminal and at least one failed without any acceptance, use skipped with delivery failure detail retained on deliveries. No-token events are also skipped. Delayed acknowledgements cannot demote an accepted event. Return-rate eligibility still requires provider_accepted.

### 6.3 Verify, receipt-check cron every 15 minutes

Fetches Expo receipts for sent deliveries, writes provider_status and provider_receipt_at, sets provider_accepted or provider_rejected per delivery. On DeviceNotRegistered deletes the dead token row. alert_events becomes provider_accepted when any delivery is provider_accepted, provider_rejected when all are rejected.

Naming is deliberate, R9. An Expo receipt with status ok means APNs or FCM accepted the message. It does not prove the device displayed it. Nothing in this system is called delivered.

### 6.4 Attribution, client

On notification open the app calls mark_alert_opened with alert_id then navigates to the sighting. Session attribution stamps session_attributed_at when a Passport or sighting view follows within the session.

Metric unit is the alert event. Airframe Triggered Return Rate = alert_events with session_attributed_at within the window divided by alert_events with status provider_accepted, computed at 24 and 72 hours from created_at. A user with two devices is one alert event. Archive never enters either side.

---

## 7. Design System Essentials

Full rationale lives in the design specs, this section is sufficient to build correctly.

### 7.1 packages/shared/tokens.ts

```ts
// Frozen under ruling D1, 2026-09-18. docs/DESIGN.md section 2 is the source of truth.
export const dark = {
  bg: '#0E1116', surface1: '#171C23', surface2: '#1F2630', surface3: '#2A3340',
  border: '#2E3743',
  textPrimary: '#E9ECEF', textSecondary: '#A6AFBA', textTertiary: '#8E98A4',
  accent: '#E6A23C', accentPressed: '#C98A2E', buttonLabelOnAccent: '#0E1116',
  success: '#57C785', warning: '#E0B34C', error: '#EE8580', info: '#6BA6E8',
};
export const light = {
  bg: '#F7F8FA', surface1: '#FFFFFF', surface2: '#F0F2F5', surface3: '#FFFFFF',
  border: '#DDE2E8',
  textPrimary: '#1B2129', textSecondary: '#4E5866', textTertiary: '#667080',
  accent: '#8F5A0E', accentPressed: '#7A4C0B', buttonLabelOnAccent: '#FFFFFF',
  success: '#1B7A47', warning: '#7F5F0F', error: '#B83E37', info: '#2D6FBD',
};
export const type = {
  display: { size: 28, weight: '700' }, title: { size: 22, weight: '600' },
  reg: { size: 17, weight: '700', mono: true },
  regLarge: { size: 24, weight: '700', mono: true },
  headline: { size: 17, weight: '600' }, body: { size: 15, weight: '400' },
  caption: { size: 13, weight: '400' }, micro: { size: 11, weight: '500' },
};
export const space = [4, 8, 12, 16, 24, 32];
export const radius = { card: 16, sheet: 20, button: 12, chip: 8 };
export const minTarget = 44;
```

Token freeze gate, passed 2026-09-18 under D1, ratios recorded in docs/DESIGN.md. Hairline borders exempt under D2. Primary buttons use buttonLabelOnAccent, dark theme dark label, light theme white label. Test every actual foreground and background pairing in context, not isolated hexes, 4.5:1 body, 3:1 large and UI. Validate layouts at 200 percent text scaling. Never rely on color alone to communicate state, every colored status carries a label or glyph. Semantic token names in code, raw hex values forbidden in feature components. Adjust failing hexes, the ratio wins over the aesthetic.

### 7.2 Binding design rules

1. Dark theme default, light theme full parity, Follow System option. No pure black, no pure white.
2. Registrations render uppercase monospace everywhere, SF Mono and Roboto Mono, and always link to the Aircraft Passport.
3. System motion only, no animation libraries for UI transitions.
4. Every interactive element 44pt minimum target with 8 spacing between adjacent targets.
5. Feeds load with card skeletons and image placeholders, never full-screen spinners. FlashList with realistic estimated sizes, media width and height drive layout before pixels arrive, zero layout shift.
6. Photos are never dimmed or overlaid in feeds.
7. Navigation, five tabs in beta, Home, Search, Capture, Alerts, Profile. Capture visually prominent, raised treatment only where it does not break platform navigation or accessibility order. Alerts tab demotion rule, if fewer than 20 percent of activated collectors receive at least one eligible alert in a rolling 7-day period during beta, move Alerts under Home or Profile with an unread badge before public launch.
8. Sentence case all copy, no exclamation marks in system strings.
9. Post-publish routing. Online trusted users land on the Aircraft Passport with the confirmation, Added to this aircraft's history. Users in review get the SaveConfirmation. The review outcome, published or rejected, appears as an inbox row in the Alerts tab with a badge, never as a push, invariant 7 allows one push type only. Offline captures get the SaveConfirmation only, there is no airframe id until the server commits, never fake one.
10. Permission moment, one rule plus one escape hatch. Onboarding follows are created with created_via onboarding and never trigger the permission sheet. The value-moment sheet fires on the first follow with created_via deliberate after onboarding is complete, while notification permission is undetermined. Onboarding never shows a permission prompt. Escape hatch, a user who follows at least one aircraft and has undetermined permission sees a Turn on alerts action in the Alerts tab empty state and in Settings, Notifications. Tapping it opens the same value-moment sheet with the count of followed aircraft in place of one registration. Denied permission shows Fix in Settings and opens system Settings instead of another system permission request. Airport-only followers are invited to follow an aircraft for alerts. The Alerts tab never tells a user with onboarding follows that they have no follows.
11. Passport above the fold, with a compression order. Priority when space runs out, registration, then Follow, then history strip, then hero, then stats. On the smallest supported viewport at default text, all five fit, hero at 3 to 2. At 150 percent text the hero shrinks to 16 to 9 and stats drop below the fold. At 200 percent text the history strip becomes a vertical list of three rows, thumbnail left, contributor name and date right, still visible text, the hero drops to 16 to 9 and may sit partly below the fold. Nothing on the Passport is demoted to accessibility labels only, large text exists for sighted users. Registration and Follow are never pushed below the fold at any size. A Passport with one sighting shows the thin-passport copy in the strip.

### 7.3 Required components beyond v1.0

| Component | Rule |
|---|---|
| SaveConfirmation | Shown only after durable media copy plus SQLite commit succeed. Title, Saved on this device. Body online, Uploading now. You can keep spotting. Body offline, We'll upload it next time you open the app while connected. Action, View queue. Never promises background upload |
| QueueStateBadge | Header line, Everything saved on this device stays here until it uploads or you remove it. Uploads continue when the app is open. State labels map to submission_state, received Uploading, processing Processing photo, awaiting_identification Needs a registration, awaiting_review In review, quarantined Aircraft identity needs review, published Published, rejected Not published, cancelled Cancelled, plus local-only Saved on this device and Waiting for connection |
| ArchiveBadge | Every backfilled or imported sighting shows Archive beside the date on cards and detail. Detail view explains archive material builds aircraft history and is not a native contribution |
| VerificationState | Airframe labels by resolution_source and stub status. faa matched, no label. opensky, Details from community data. user_stub pending, Aircraft details being verified. conflicted, Aircraft identity needs review. Unidentified is never an airframe label, it is a submission state shown in the queue only |
| IdentificationHelp | On an awaiting_identification submission in the owner's queue, copy, Not sure of the registration? Add it when you know it, or leave it and a verified spotter may propose one. Never says published |
| ThemedText | The only text primitive. Refuses tertiary tone on surface3 in dark and on surface2 in light at compile time via variant typing, ruling D1 exceptions encoded, not documented |
| InlineEducation | One-time dismissible line beside the first Spot action, Spot means you appreciate this sighting. Never a blocking tutorial |

### 7.4 Performance budgets, release gates

Measured on a representative mid-tier device on production-like network. These are acceptance criteria, not monitoring aspirations.

| Area | Budget |
|---|---|
| Warm app to usable Home | p75 at most 1.5 s |
| Cold app to usable shell | p75 at most 3.0 s |
| Cached feed redisplay | p75 at most 500 ms |
| Passport cached shell | p75 at most 750 ms |
| Feed scroll | No sustained visible jank at 30+ cards |
| Image delivery | Feed derivative only, originals never requested by feeds, verified by network log |
| Crash-free sessions | At least 99.5 percent during beta |
| Upload recovery | Exactly one sighting after repeated retry, restart, and expired-session tests |

### 7.5 Screen inventory with binding behaviors

| Screen | Must-have behaviors |
|---|---|
| Home feed | Segments All and Following, infinite scroll, scroll position preserved across navigation and background return, new-content pill instead of auto-jump, pull to refresh, native and Archive cards visually distinct, cached content usable offline with a passive banner |
| Sighting detail | Zoomable image with landscape viewer, safe EXIF subset, tappable registration, photographer, airport, Spot and share in bottom bar, swipe prev-next with visible tap zones, report in overflow |
| Aircraft Passport | Hero with scrim, large mono registration, full-width Follow as the primary CTA, stats row, Timeline and Map segments, hero image ranked by unique Spots with admin override, stub metadata never renders as authoritative, thin passports state limited history honestly and invite the next sighting |
| Capture flow | 4 UI steps, source plus details combined, registration, caption, review. Telemetry keeps 5 milestones, source, details, registration, caption, review. EXIF prefill editable, nearest-airport chip, explicit Location unknown, unreadable-registration path saves the submission with registration_text null into awaiting_identification, copy says Needs a registration and never says published, never fabricates an airframe, duplicate warning states whether publish is blocked or needs confirmation, publish persists locally and returns control immediately, target median active completion under 60 seconds, fully offline capable, storage-pressure stop per invariant 11 |
| Upload queue | Every local state visible per the state-label table below, retry and cancel where valid, cancel confirms and explains local copy removal, header line, Everything saved on this device stays here until it uploads or you remove it. Uploads continue when the app is open |
| Search | Segments Registrations, Airports, Spotters, load-more pagination, zero-result registration offers Add the first sighting with entered text prefilled, identity stays server-authoritative, search history local with a clear control |
| Airport page | Header with follow airport, standard feed lens |
| Airframe map | In-app Mapbox dark style, clusters, time filter, suppressed sightings absent with a quiet privacy footnote |
| Profile | Avatar, handle, stats row, own-user edit and portfolio export, Verified badge only, Archive tag on backfill, no follow button, per MVP v1.3.2 section 9.5 |
| Alerts | Opens directly to sighting detail with a clear Passport path, grouped repeats, four distinct empty states, no follows, no new sightings, notifications disabled, delivery failure |
| Settings | Account, notification state reflected with fix-in-settings link, appearance, Pro row passive for all users marked Coming later with active surfacing only after demonstrated repeat value, legal, support, delete account with typed confirmation |
| Auth and onboarding | Email plus platform sign-in, handle claim, terms recorded, then progressive onboarding, real hub content first, home airport, suggested follows prioritizing home airport and recurring airframes, follows created immediately, no permission prompt during onboarding, denial never reverses a follow |
| Moderation states | Pending ribbon on own cards, rejection lands as an inbox row with reason, first-publish explainer shown once, copy, Your first few sightings get a short review before they publish, never says quick or instant |
| Report and block | Bottom-sheet flows under ten seconds, block states its effect plainly |

Queue state labels.

| State | Label | Action |
|---|---|---|
| local saved | Saved on this device | none |
| local uploading, received | Uploading | none |
| processing | Processing photo | none |
| local retry_wait | Waiting for connection | Retry now |
| awaiting_identification | Needs a registration | Add registration |
| awaiting_review | In review | View |
| quarantined | Aircraft identity needs review | none |
| local failed | Couldn't upload | Retry, show human-readable reason |
| published | Published | View Passport |
| rejected | Not published | View reason, edit and resubmit, up to 3 times, then Contact support |
| cancelled | Cancelled | Remove |

Push permission uses the value-moment sheet at the first deliberate airframe follow after onboarding, or an explicit Turn on alerts action while permission is undetermined. Denied permission routes to system Settings. Never prompt during onboarding. Copy, Get notified when {REG} is spotted again, one alert per aircraft per day at most.

Public web alt text describes the aircraft, registration, type, operator, without exposing suppressed location details.

---

## 8. Measurement Contract

### 8.1 Canonical event taxonomy

packages/shared/events.ts is the only path to analytics. Raw property allow-lists live beside each event. This list is exhaustive for the MVP, adding an event requires a CKC-approved edit here.

```text
submission_saved_local
submission_created
media_upload_completed
submission_state_changed    properties, from_state, to_state
sighting_published
airframe_follow_created
airport_follow_created
notification_permission_prompted
notification_permission_resolved
alert_event_created
provider_receipt_resolved
alert_opened
attributed_session_started
passport_viewed
profile_viewed
portfolio_export_generated
share_card_generated
public_page_viewed
search_performed
spot_toggled
pro_interest_tapped
capture_step_reached        properties, milestone one of source, details, registration, caption, review
```

Each event carries schema_version, hub, platform, ingestion cohort where relevant, and a UTC timestamp. Prohibited everywhere, raw EXIF, exact GPS, private media URLs, captions, emails, free-text moderation notes, invariant 9.

### 8.2 Thesis metric

Airframe Triggered Return Rate. Among alert events with status provider_accepted, the percentage with an attributed return to the sighting or Passport within 24 and 72 hours of alert creation. Unit is the alert event, one per user per airframe per day, never the user and never the device. Denominator is provider-accepted alert events, never send-API tickets and never called delivered, R9. Archive content never triggers or counts. Only sightings with taken_at within 7 days of publication trigger, R6.

Opportunity metric, reported beside the North Star. Share of activated collectors who received at least one provider-accepted alert in the trailing 30 days. A high return rate over a tiny opportunity base is not validation.

### 8.3 Funnel diagnostics, tracked separately

First Passport view to first follow. Follow to permission acceptance. Capture start to durable local save. Local save to publication. Publication to contributor Passport view. Share-page view to Passport view. Public Passport view to install or open. Install to first follow, Android Install Referrer only, iOS install attribution is a documented blind spot per ruling R4. Alert created to provider receipt. Receipt to open. Open to attributed return.

### 8.4 Guardrails

- Archive content never counts as native supply, activation, or the North Star.
- A push ticket is not delivery. A provider receipt is acceptance by APNs or FCM, not display on the device. Nothing is labeled delivered.
- Freshness is not provenance. A native_mobile submission with an old taken_at counts as supply but never alerts.
- Internal tester cohorts are labeled and excluded from market validation.
- Total registered users is never the North Star.
- Segment by hub, contributor and collector archetype, platform, acquisition source, native versus archive exposure, and fresh versus old taken_at.

### 8.5 Launch gates, two stages

Stage 1, hub activation, from MVP v1.3.2 section 15.3, behavioral evidence before collector activation, at least 15 recruited ambassadors, 10 onboarded, 5 publishing natively through the app, seeded passport density, working moderation.

Stage 2, broad promotion, per hub before any paid or broad acquisition, two gates, both required.

Supply gate, at least 20 active native contributors in 30 days, 100 native published sightings in 30 days, 30 distinct airframes with native sightings, 30 percent of those with two or more native contributors, moderation backlog p90 under 24 hours, no unresolved critical privacy or identity incident.

Thesis gate, O1, values open, CKC to set before beta week 1. A hub cannot promote on supply alone.

| Measure | Continue | Revise | Stop | Notes |
|---|---|---|---|---|
| Opportunity rate, activated collectors with at least one provider_accepted alert in 30 days | TBD | TBD | TBD | Section 8.2 |
| Attributed return rate at 72 hours | TBD | TBD | TBD | Complete windows only, an alert created inside the last 72 hours is excluded from the denominator |
| Minimum provider_accepted events in the observation window | TBD | | | Below this the rates are noise, do not compute them |
| Observation window, days | TBD | | | Rates are not read before the window closes |
| Repeat contribution, contributors publishing in at least N of the last 4 weeks | TBD | TBD | TBD | Fresh taken_at only |
| Weekly moderation and operating hours, founder | TBD max | | | Above the max the hub is not sustainable solo |

Build the hub readiness query set so both gates are one dashboard, not a manual audit.

---

## 9. Phase Backlog

Phase-gated. Complete a phase, pass its exit gates, demo to CKC, get written approval, then continue. Estimates are planning references, correctness beats speed.

**T2 stands at 26 to 34 calendar weeks, held by CKC ruling on 2026-09-19.** Recalculation happens at Phase S exit, not before. Known pressure on the number, the publication pipeline, fencing, cleanup and 15 automated gates in Phase 0 carry an estimated 80 to 120 hours, or 3.2 to 4.8 weeks at 25 hours per week, not yet folded into the calendar. Phase S remains 5 to 6 calendar weeks. Do not quote 30 to 39 externally, it is a pressure estimate, not the ruling.

### Phase S, Spike and Validation, pre-build gate, CKC rulings R1 and R2

Phase S produces reusable production-quality code in the real monorepo, scoped to the happy path plus crash-recovery gate 7. Run publication against operator-approved test fixtures in an isolated internal environment; no production rollout or public beta is authorized by the spike. An internal fixture harness supplies approval setup for the happy path without implementing authorize_submission; do not expose an approval bypass to clients or ship the harness. Cohorts test this slice plus a click-prototype for browse-only and moderation scenarios. Phase 0 implements authorization, manifest cleanup and the full fenced pipeline, including gates 12 to 14; those are not Phase S prerequisites.

Tasks.

- [ ] Monorepo scaffold, CI, Supabase project, minimal schema subset applied, users, airframes, airframe_registrations, registration_prefixes, submissions, sightings, media, publish_jobs, import_conflicts, follows, device_push_tokens, alert_events, alert_deliveries, moderation_actions
- [ ] create_submission, advance_submission, resolve_airframe with taken_at, happy-path publish_submission with idempotency and crash recovery (gate 7), plus the identity-over-time fixture, a registration with two validity ranges resolves by date and quarantines the overlap
- [ ] registration-prefixes v2 from the JSON source, TS module and migration generated, equivalence tests, hyphenated and stripped forms resolve identically
- [ ] Thin capture slice on device, durable copy, SQLite queue row, TUS upload with forced-expiry recovery, process-media into the pending bucket with one derivative, publish copies to public
- [ ] process-media benchmark on 24 MP JPEG and HEIC, CPU and memory recorded, worker fallback decision written
- [ ] NativeTabs spike against the five criteria, stability on supported OS versions, dark and light rendering with Dynamic Type, deterministic deep links and stack restoration, no release-blocking accessibility defects, no tab-state loss across background transitions. Any failure locks the JS-tabs fallback now
- [ ] One real push, sightings insert trigger, alert_events plus alert_deliveries, Expo send with alert_id in payload, receipt fetch to provider_accepted, mark_alert_opened, attribution, on a physical device
- [ ] Static card mock, Passport above-the-fold mock with history strip, clickable capture plus follow prototype for browse scenarios
- [ ] Analytics wrapper events.ts with redaction tests
- [ ] Recruit cohorts, 5 contributor candidates and 5 collector candidates from ambassador pipeline, dual-purpose recruiting
- [ ] Run the 8 usability scenarios, find and follow a known registration, explain what happens after following, capture with GPS, capture without GPS, capture with unreadable registration and interpret Needs a registration, recover an interrupted upload and state correctly what happens while the app is closed, interpret Archive and In review and Details being verified, open a shared public page mock and identify the next action

Exit gates, all required.

1. Termination, restart, network loss, and expired-session tests lose zero submissions and create zero duplicate submissions or sightings on hardware.
2. Identity gate. Concurrency test produces one airframe for one new registration. Identity-over-time fixture resolves a pre-reassignment taken_at to the old airframe, a post-reassignment taken_at to the new one, and an overlapping range to quarantined, with zero writes to existing airframe rows.
3. Push chain distinguishable end to end, alert event created, delivery sent, provider_accepted, opened with alert_id, attributed.
4. NativeTabs decision recorded with evidence, adopt or fallback.
5. Processing decision recorded with benchmark numbers, Edge Function or worker.
6. Cohort results, at least 80 percent complete first follow unfacilitated, at least 80 percent complete a valid capture unfacilitated, median active capture under 60 seconds, at least 90 percent correctly state whether an offline sighting is saved and what happens while the app is closed, at least 80 percent distinguish Archive from native, zero critical accessibility blockers. A failed threshold triggers redesign of the failing flow and a retest of that scenario only, no Phase 0 sign-off until pass or a written CKC waiver.

7. Publish crash recovery on the happy path: kill after copied and before committed, restart publish-runner, assert exactly one sighting, no duplicate public objects and one publish audit action. Kill after committed and rerun: return the existing sighting and write nothing. Run with fixed approved fixtures; individual-copy cleanup, authorization and adversarial races are Phase 0 gates 12 to 14.

### Phase 0, Data and Identity, completes what S started

Tasks.

- [ ] Full remaining schema, enums, safety and trust tables, purge_jobs, aircraft_privacy_policies, identification_proposals, indexes, triggers, grants file, migrations clean on fresh database
- [ ] Full RLS per section 4 plus published_sightings view owned by app_reader with column grants, plus REST-level negative tests
- [ ] authorize_submission and revision-bound moderator/trusted authorization; replace the Phase S fixture harness with the real guarded flow
- [ ] Full section 5.5 pipeline: lease fencing, persisted intended-key manifest, cleanup before reset, missing-media preflight recovery, final-commit advisory locks and edit/cancel/privacy race handling
- [ ] Automate all 15 Phase 0 gates, including authorization gate 12, manifest/cleanup gate 13 and final-commit race gate 14; rerun Phase S crash recovery against the completed pipeline. Allow 80 to 120 added hours for this combined pipeline and gate work
- [ ] search_entities, remaining RPCs, feed engine with airport-lens suppression exclusion
- [ ] FAA importer, full Releasable database load including deregistration file into valid_from and valid_to, precedence, conflict quarantine
- [ ] OpenSky load via import-opensky, tier 2 resolvable source per R5, lower confidence, never overrides FAA facts
- [ ] VerificationState renders resolution_source labels, IdentificationHelp on awaiting_identification, propose_identification for verified tier
- [ ] Canonical /aircraft/[airframe_id] route and /aircraft/[reg] alias with disambiguation page, R8
- [ ] Airports reference load
- [ ] Admin console skeleton, auth gate plus submission queue by state plus import-conflicts screen with keep-separate default

Exit gates.

1. Fresh clone to running stack with documented commands only.
2. Crafted conflicting FAA record quarantines and modifies zero existing airframe rows.
3. REST negative tests with anon and low-trust authenticated keys. Direct select on sightings, media, alert_deliveries, aircraft_privacy_policies, publish_jobs, moderation_actions returns permission denied. Select permitted submission columns as another user returns an empty array. Selecting caption, approved_by, approval_kind, lease_token or SELECT * is denied even for the owner. Owner get_my_submissions returns is_approved as a boolean, masked caption and sanitized last action, with no raw approval, actor or worker fields. Exercise moderator-approved, trusted-auto, edited and idempotent mutation responses. These column-denial assertions are distinct from the empty-row RLS assertion.
4. R5 resolution test, a foreign registration with an OpenSky record resolves to an enriched stub, a foreign registration with no record creates a pending stub, an invalid prefix returns invalid and creates nothing, all verified by automated test.
5. Suppression test, capture the public share and detail URLs first, activate a policy, then assert the sighting is gone from the airport lens, location null in every lens, caption null via the view, the captured URLs return 404 within 15 minutes, and the regenerated share carries no airport or date.
6. Media order test, a submission in awaiting_review has derivatives reachable only with the service key, after publish the public paths resolve, after moderator rejection no public URL resolves, pending derivatives remain service-only for 30 days unless reopened, and deletion/cancellation removes them.
7. Publish recovery regression on the full Phase 0 pipeline (Phase S gate 7 establishes the happy-path baseline), kill the worker after the copied stage and before committed, rerun publish-runner, assert exactly one sighting, no duplicate public objects, one moderation_actions row for the publish. Then kill after committed, rerun, assert the job returns the existing sighting and writes nothing.
8. Concurrency test, two process-media invocations for one submission, exactly one claims the lease, one media row exists.
9. Resubmission test, reject, edit, resubmit three times, fourth update_submission returns resubmit_limit, moderation_actions has one snapshot per actual rejection and per successful reopen; refused/retried no-op requests add no duplicate snapshot. A reopened submission whose pending derivatives were removed re-enters processing and publishes after reprocessing.
10. Undiscoverability test, during the copied stage the public key is not present in any view or API response, HEAD with the key succeeds only with the nonce, after a failed job the key returns 404 before stage reads failed.
11. Delivery claim and recovery test, two fanout workers claim one initial attempt per delivery; expiry does not make it eligible for normal fanout. Two recovery workers at 10 minutes claim exactly one retry, retry_count becomes 1, a second uncertainty becomes ticket_lost, and a delayed first-attempt response cannot overwrite the retry ticket.
12. Authorization test, reopen/correct into awaiting_review and run all workers: zero public copies and zero sightings before moderator authorization of that revision. Edit after approval: old revision cannot copy or commit. Trusted resubmission still requires review.
13. Manifest and cleanup test, kill after each individual storage copy before its completion is recorded. Cleanup deletes every intended key. Edit, resubmit, or cancel during cleanup: nonce and manifest remain unchanged until verified cleanup completes, and cancelled work never restarts.
14. Final-commit race test, cancellation/content edit/airframe-wide and registration-specific policy activation race verified-stage commit. Use independent connections and assert contention on the same hashtext advisory keys before submission/job locks, for both possible winners. Locks serialize the outcome; no stale approved revision publishes, suppressed assets are regenerated, and stale worker tokens cannot commit.
15. Preflight test, no job ever persists a preflight stage. Missing pending media parks the job, schedules one processing cycle, and cannot publish without renewed valid authorization.

### Phase 1, Contribution Loop

Tasks.

- [ ] Auth, handle claim, terms recording, full capture flow per 7.5 including storage-pressure handling and SaveConfirmation
- [ ] Full SQLite queue, fields local_sighting_id, client_submission_id, local_media_path, upload_session_url, upload_session_created_at, upload_session_expires_at, exif_json, caption, registration_text, airport_icao, queue_state, retry_count, last_error, created_at, last_attempt_at
- [ ] process-media complete, derivatives, pHash, duplicate flagging, trust-gated transition
- [ ] Aircraft Passport with post-publish routing, sighting detail, in-app profile with edit
- [ ] Admin review queue, approve and reject with reasons, auto-promotion after five clean approvals
- [ ] Sentry wired through the redaction wrapper

Exit gates.

1. Publish, force-kill mid-upload, relaunch, exactly one sighting completes.
2. Airplane-mode publish, device restart, restored connectivity, sighting publishes untouched.
3. Feed and detail requests never fetch originals, network-log verified.
4. A new user's sixth approved sighting auto-publishes, first five required review.
5. Warm start, cached feed, and Passport budgets from 7.4 measured and met.

### Phase 2, Follow and Return

Tasks.

- [ ] toggle_follow, toggle_spot with counter trigger, get_feed all lenses, home feed with position restore
- [ ] Value-moment permission sheet, register_push_token, permission telemetry
- [ ] Full fanout, one logical alert per notification, deep-link open, mark_alert_opened, session attribution
- [ ] Airframe map with time filter and suppression behavior
- [ ] Block and report end to end including feed exclusion
- [ ] Alerts screen with four empty states, Settings including notification state reflection

Exit gates.

1. Two-device demo, B follows, A publishes, one push, open, full chain queryable for ATRR.
2. Two publishes of one airframe inside 24 hours produce one alert per follower.
3. Backfill publish produces zero alert_events.
4. Blocked author absent from blocker's home feed and search.

### Phase 3, Growth Loop

Tasks.

- [ ] Public pages reading the view, ISR plus tag revalidation, one dominant Passport CTA
- [ ] OG share render, portfolio export, scrim contrast rule
- [ ] Map snapshot proxy with cache and purge
- [ ] Deletion pipeline end to end including web revalidation
- [ ] Backfill importer with manifest validation, batch id, Archive display
- [ ] Android Install Referrer capture, ruling R4
- [ ] Pro fake-door row, legal and support surfaces, deep links, store assets, hub readiness dashboard queries, accessibility gate, beta hardening

Exit gates.

1. External viewer path works, shared URL to passport to spotter page, store CTA present, Lighthouse accessibility pass.
2. Deletion removes app visibility, derivatives, share render, and public page within one purge cycle.
3. Suppressed airframe shows no location anywhere public and its snapshot URL resolves to nothing.
4. Backfill visible on profile with Archive tag, absent from native-supply and ATRR queries.
5. Crash-free and remaining 7.4 budgets met across a hardening week.

---

## 10. Working Agreements for Claude Code

1. **Decide freely** on implementation details inside the invariants, file structure, naming, minor library picks without native code.
2. **Ask CKC first** before, any schema change beyond section 3, any new dependency containing native code, anything that costs money, any deviation from an invariant or ruling, any scope addition, any new analytics event.
3. **Never build** items on the deferred list, invariant 12, even as stubs or feature flags.
4. **Testing bar.** Every exit gate exists as an automated test where technically possible, idempotency, RLS, and redaction tests are mandatory automation. UI polish is verified by demo.
5. **Migrations are append-only** once applied to the shared project, fix forward.
6. **Commits** small and conventional, feat, fix, chore scopes. No secrets, no .env files.
7. **Definition of done for any task**, code, test where applicable, one-line CHANGELOG.md entry.
8. **When blocked** more than 30 minutes on an external service behavior, document the finding in the changelog and surface it rather than working around silently.
9. **Phase S code is production code.** No throwaway branches, no prototype-quality shortcuts in the spike slice.

---

## 11. Phase Gate Ritual

At the end of each phase.

1. All exit gates green in CI where automatable.
2. CHANGELOG.md updated with the phase summary and any approved deviations.
3. Tag the repo, phase-s through phase-3.
4. Demo to CKC on physical devices, Phase S demo includes the kill-and-recover test live and the cohort results readout, Phase 2 demo uses two devices for the follow-alert-return loop.
5. CKC approval in writing before the next phase branch opens.

The build is complete when Phase 3's gate passes and the accessibility and legal gates are confirmed by CKC. What ships is the Validation MVP. The next 90 days answer the thesis question, the codebase's job is to make that answer measurable and true, uncontaminated by archive content or delivery failures.

---

## 12. Decision Log, v1.6

| ID | Decision | Status |
|---|---|---|
| R1 | Full pre-build spike phase, implemented as Phase S with production code in the real monorepo | CKC ruled |
| R2 | Full usability cohort pre-build, 5 contributors plus 5 collectors from the ambassador pipeline, 8 scenarios, 80 percent thresholds, run on the Phase S slice | CKC ruled |
| R3 | MVP v1.3.2 restored as scope authority, the v1.1 design review's demotion to v1.3.1 is void, contributor profile stands | Overruled error |
| R4 | Install attribution via Android Install Referrer only, no third-party SDK, iOS blind spot documented | CKC ruled, per rec |
| A1 | Performance budgets adopted as numeric release gates | Adopted |
| A2 | Canonical event taxonomy adopted as the exclusive analytics surface | Adopted |
| A3 | SaveConfirmation, ArchiveBadge, VerificationState, InlineEducation components required | Adopted |
| A4 | Post-publish routes to the Passport with the offline nuance, no airframe id offline means SaveConfirmation only | Adopted with amendment |
| A5 | Capture flow 4 UI steps, 5 telemetry milestones | Adopted |
| A6 | Alerts tab kept for beta with the 20 percent rolling-7-day demotion rule | Adopted |
| A7 | Two-stage hub gates, activation then promotion | Adopted |
| A8 | Pro fake door, passive Settings row for all, active surfacing after repeat value | Reconciled |
| A9 | Eighth principle and decision priority order | Adopted |
| A10 | Separate standalone hi-fi prototype phase | Rejected, replaced by the Phase S slice plus click-prototype for browse scenarios |
| T1 | Earlier estimate, 16 to 21 weeks full-time solo | Historical; current calendar is restated T2 |
| R5 | Non-US registration resolution, three tiers, FAA, OpenSky, user stub with ICAO prefix validation | CKC ruled 2026-09-18 |
| D1 | Token freeze with contrast-corrected hex values, docs/DESIGN.md v1.0 owns hex values | CKC ruled 2026-09-18 |
| D2 | Hairline borders exempt from 3 to 1 non-text contrast, no border-only affordances | CKC ruled 2026-09-18 |
| T2 | Real capacity 20 to 30 hours per week, planning basis 25, calendar 26 to 34 weeks, Phase S 5 to 6 weeks. Phase 0 pressure of 80 to 120 hours noted, not folded in | Held 2026-09-19, recalculate at Phase S exit |
| R6 | Alert eligibility requires taken_at within 7 days of publication, freshness separate from provenance | CKC ruled 2026-09-19 |
| R7 | Submission-first write path, sightings exist only after publish, airframe_id never null | CKC ruled 2026-09-19 |
| R8 | Canonical Passport route is airframe id, registration is a discovery alias with disambiguation | CKC ruled 2026-09-19 |
| R9 | Provider receipt is acceptance not delivery, state named provider_accepted, nothing is called delivered | CKC ruled 2026-09-19 |
| R10 | Users are anonymized, never hard deleted, audit rows survive | CKC ruled 2026-09-19 |
| R11 | Rejected submissions reopen in place, resubmit_count capped at 3, photo immutable, prior values snapshotted | CKC ruled 2026-09-19 |
| R12 | moderation_actions never cascades, users.id restricts auth deletion, anonymization is an update not a delete | Adopted 2026-09-19 |
| A11 | Onboarding follows fan out alerts like deliberate follows, created_via affects only the permission moment | Adopted 2026-09-19, CKC may override |
| R13 | Public derivative keys carry a per-job nonce, public by capability, undiscoverable until commit, keys never reused | Adopted 2026-09-19 |
| O1 | Stage 2 thesis gate thresholds, opportunity rate, return rate, minimum events, window, repeat contribution, founder hours | Open, CKC to set before beta week 1, beta week 1 itself unscheduled |

---

*End of PlaneSpotterBuildPack v1.8. Supersedes v1.7. Background, PlaneSpotterMVP-v1.3.2.md, PlaneSpotterDesignSpec-v1.0.md. This pack wins conflicts. Hand this file to Claude Code and begin Phase S.*
