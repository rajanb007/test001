# PlaneSpotter, agent build rules

| Field | Value |
|---|---|
| File role | Binding rules for any coding agent working in this repo. Condensed from PlaneSpotterBuildPack-v1.8.md. On conflict the BuildPack wins |
| Author | CKC |
| Version | 2.6 |
| Date | 2026-09-19 |
| Read with | CLAUDE.md for status and context, docs/SPEC.md for contracts, docs/DESIGN.md for tokens |

## 1. Authority

1. PlaneSpotterBuildPack-v1.8.md is the build authority. This file restates it. If the two disagree, the BuildPack wins and this file has a bug, report it.
2. PlaneSpotterMVP-v1.3.2.md is scope authority. Nothing outside it gets built.
3. docs/DESIGN.md wins on token hex values, ruling D1.
4. Rulings R1 to R13, D1, D2 in CLAUDE.md section 5 are settled. Do not reopen them.

## 2. Invariants, violating one is a build failure

1. Idempotent contribution. Submission creation is idempotent on (user_id, client_submission_id), publish is idempotent on submission_id. Any number of retries produces exactly one submission and at most one sighting.
2. Never auto-merge airframes. Registration matching may surface candidates. It never merges two existing airframes. Conflicts go to import_conflicts for a human.
3. Clients never create canonical aircraft, sightings are never unidentified. Resolution runs inside publish_submission using registration plus taken_at against validity history. sightings.airframe_id is never null. Unidentified captures wait in submissions.awaiting_identification.
4. Originals never reach feeds, unapproved derivatives never reach the public bucket. Derivatives are generated into the private pending bucket and copied to public only by the publish job. The sighting row is inserted in one SQL commit after public objects are verified, never before. Storage calls are not transactional, never pretend they are.
5. Provenance and freshness are separate. Every sighting carries ingestion_source. KPIs count native_mobile only. Alerts additionally require taken_at within 7 days of publish, R6. Backfill shows an Archive label and is invisible to KPIs.
6. Location privacy is server-side. captured_geo is never publicly readable. Public surfaces read display_geo only through the published_sightings view. Suppression never leaks through thumbnails, maps, share cards, alt text, analytics, airport lens membership or cached pages.
7. One alert type, rate-limited by a unique index. Only the followed-airframe alert. One alert_events row per user per airframe per 24-hour bucket, enforced by on conflict do nothing, never by a lookup.
8. RLS plus column grants on every table. RLS restricts rows, grants restrict columns. Direct select on sightings, media, alert_deliveries and privacy policies is revoked for anon and authenticated. Negative tests run against the REST API with real keys, never through the app.
9. Telemetry hygiene. Raw EXIF, exact GPS, private media URLs, captions, emails and free-text moderation notes never enter analytics or crash logs.
10. Moderation is real and auditable. First five contributions of a new user need human approval. Trusted users auto-publish. A private guarded transition helper is the only state mutator; advance_submission wraps it. Every actual transition writes a moderation_actions row; retries/no-ops do not duplicate audit rows. Authorization is bound to the current content revision.
11. Offline is durable and honestly reported. Media copied to app storage first, queue state in SQLite, app kill never loses a pending submission. Saved on this device appears only after both the persistent copy and the SQLite commit succeed. Uploads resume in the foreground, background upload is best effort and never promised in copy. Storage pressure stops before the claim.
12. No deferred features. Comments, follow-user, video, badges, scores, heatmaps, DMs, web upload, ranked Explore, paid tier, marketplace, realtime tracking. Do not scaffold for them. Do not feature-flag them.

## 3. Ask CKC before

- Any schema change beyond BuildPack v1.8 section 3
- Any new dependency containing native code
- Anything that costs money
- Any deviation from an invariant or ruling
- Any scope addition
- Any new analytics event, the taxonomy in SPEC.md section 7 is exhaustive
- Any change to token hex values, frozen under D1
- Any new submission_state or transition, the state machine in SPEC.md section 3.3 is exhaustive
- Any edit to registration-prefixes.json

Decide freely on implementation detail inside the invariants, file structure, naming, minor pure-JS libraries.

## 4. Do not

- Use raw hex in feature components. Semantic tokens from packages/shared/tokens.ts only.
- Use animation libraries for UI transitions. System motion only.
- Use glass surfaces anywhere except the system tab bar.
- Compose raw table joins for public data on mobile. Read through the view and RPCs.
- Call anything delivered. A provider receipt means APNs or FCM accepted, the state is provider_accepted, R9.
- Fake an airframe id for an offline capture. SaveConfirmation only until publish_submission resolves.
- Write a sightings row from anywhere except the committed stage of publish_submission.
- Write derivatives to the public bucket from process-media.
- Promise background upload in any copy string.
- Edit registration-prefixes.ts by hand, it is generated from the JSON.
- Run a storage copy or delete inside a SQL transaction and treat rollback as undo.
- Check state and proceed. Claim with an atomic update returning id, or exit. This applies to process-media, publish_jobs, and alert_deliveries alike.
- Treat awaiting_review or a parked job as publication approval. Follow BuildPack section 5.5.
- Return raw submissions rows or moderation actions to owners. Use the section 4 allowlist, masked caption and get_my_submissions is_approved boolean.
- Invent a policy/publication lock mechanism. Use the exact hashtext transaction advisory keys and ordered acquisition in BuildPack section 5.5, before submission/job row locks.
- Persist preflight as a job stage; it is an operation inside claimed.
- Copy before committing the full intended-key manifest, or rotate a nonce before verified cleanup.
- Let normal fanout reclaim sending deliveries. Recovery alone permits one uncertain-send retry with a fresh attempt ID.
- Batch several alert_events into one notification.
- Cascade delete moderation_actions or auth.users rows.
- Confuse denied column access with empty rows under RLS. Safe-column selects on another owner return empty; forbidden-column selects are denied.
- Put a permission prompt in onboarding. Permission uses the first deliberate follow or an explicit Turn on alerts action after onboarding; denied permission routes to system Settings.
- Ship a loading spinner inside a button or a full-screen spinner on a feed.
- Commit .env files or secrets. .env.example documents every variable.
- Use underscores in new file names. Hyphens only. Existing package conventions are exempt.

## 5. Phase gating

Phase-gated per BuildPack section 9. Complete a phase, pass every exit gate, demo to CKC on physical devices, get written approval, then open the next phase branch. Tag phase-s through phase-3.

Current phase, see CLAUDE.md section 4. Phase S first.

### Phase S definition of done

Budget 5 to 6 calendar weeks. Internal isolated spike with operator-approved fixtures; reusable production-quality code, no production rollout. A private fixture harness supplies approval setup for the happy path and is never shipped or client-callable. Authorization, manifest cleanup and the full fenced pipeline, including Phase 0 gates 12 to 14, are Phase 0 work. Read BuildPack section 9 for the scope boundary.

Tasks
- Monorepo scaffold, CI, Supabase project, schema subset, users, airframes, airframe_registrations, registration_prefixes, submissions, sightings, media, publish_jobs, import_conflicts, follows, device_push_tokens, alert_events, alert_deliveries, moderation_actions
- create_submission, advance_submission, resolve_airframe with taken_at, happy-path publish_submission, idempotency and crash recovery (gate 7), identity-over-time fixture
- registration-prefixes v2 generated from JSON, equivalence tests
- process-media benchmark on 24 MP JPEG and HEIC, worker fallback decision written
- Thin capture slice on device, durable copy, SQLite queue row, TUS upload with forced-expiry recovery, one derivative into pending, publish copies to public
- NativeTabs spike against five criteria, stability on supported OS versions, dark and light with Dynamic Type, deterministic deep links and stack restore, no release-blocking accessibility defects, no tab-state loss across background. Any failure locks the JS-tabs fallback
- One real push end to end on a physical device, sightings insert trigger, alert_events plus alert_deliveries, Expo send with alert_id, receipt to provider_accepted, mark_alert_opened, attribution
- Static card mock, Passport above-the-fold mock with history strip, clickable capture and follow prototype for browse scenarios
- events.ts analytics wrapper with redaction tests
- Cohorts recruited, 5 contributors plus 5 collectors
- 8 usability scenarios run, see docs/user-profiles.md section 4

Exit gates, all required
1. Termination, restart, network loss and expired-session tests lose zero submissions, create zero duplicate submissions or sightings, on hardware
2. Identity gate, concurrency test yields one airframe, identity-over-time fixture resolves pre and post reassignment dates correctly and quarantines overlap, zero writes to existing airframe rows
3. Push chain distinguishable end to end, alert event created, delivery sent, provider_accepted, opened with alert_id, attributed
4. NativeTabs decision recorded with evidence
5. Processing decision recorded with benchmark numbers, Edge Function or worker
6. Cohort thresholds met, 80 percent first follow unfacilitated, 80 percent valid capture unfacilitated, median active capture under 60 seconds, 90 percent correctly state offline save status and what happens while the app is closed, 80 percent distinguish Archive from native, zero critical accessibility blockers. A failed threshold triggers redesign of that flow and retest of that scenario only

7. Publish crash recovery on the happy path: kill after copied and before committed, restart publish-runner, assert exactly one sighting, no duplicate public objects and one publish audit action. Kill after committed and rerun: return the existing sighting and write nothing. Run with fixed approved fixtures; individual-copy cleanup, authorization and adversarial races are Phase 0 gates 12 to 14.

Phase 0 to 3 tasks and gates, BuildPack section 9. Do not paraphrase them here, read the source.

## 6. Repo conventions

- Monorepo, pnpm workspaces. apps/mobile Expo plus expo-router, apps/web Next.js App Router, supabase/migrations, supabase/functions, packages/shared for tokens, types, events, zod schemas.
- TypeScript strict everywhere. No any.
- Branches, main protected, phase branches phase-s, phase-0 and so on, feature branches off the phase branch.
- Commits, conventional, feat, fix, chore, test, docs. Small.
- Every task, code plus test where applicable plus one-line CHANGELOG.md entry.
- Blocked over 30 minutes on an external service, write the finding to CHANGELOG.md and surface it. No silent workarounds.

## 7. Migrations

- Numbered SQL files in supabase/migrations. Split by concern, extensions, enums, identity, content, social, safety, indexes, triggers, grants.
- Append-only once applied to the shared project. Fix forward.
- Every new table ships with RLS enabled and a policy test in the same PR.
- Fresh clone to running stack must work with documented commands only, Phase 0 gate 1.

## 8. Testing bar

Mandatory automation, delivered by the owning phase in BuildPack section 9. Phase S requires its seven gates; the full security, authorization, cleanup and race suite belongs to Phase 0 and must pass before rollout.
- Idempotency of create_submission and publish_submission under retry, restart, expired session
- Stage guards, every disallowed advance_submission transition is a no-op
- Identity over time, the reassignment fixture resolves by taken_at and quarantines overlap
- REST negative tests, anon and low-trust keys get permission denied on sightings, media, alert_deliveries, aircraft_privacy_policies, publish_jobs, moderation_actions. Select permitted submission columns as another user returns an empty array. Forbidden-column selects (including approved_by, approval_kind, lease_token and raw caption) are denied even to the owner; assert safe RPC projections and no moderator identity in the last-action summary
- Media order, pending derivatives service-only, nonce keys exposed by the view only at commit, moderator rejection retains private pending media 30 days, no public rejected media; cancellation deletes pending media
- Suppression, policy activation drops the sighting from the airport lens, nulls the caption via the view, and enqueues a purge job
- Publish recovery, kill after copied before committed, rerun, one sighting, no orphan objects, kill after committed, rerun writes nothing
- Process-media concurrency, two invocations, one lease, one media row
- Resubmission, three reopen cycles pass, fourth returns resubmit_limit, a reopen with missing pending derivatives reprocesses then publishes
- Undiscoverability, public nonce key absent from every API response until commit, 404 after a failed job before stage reads failed
- Delivery claim/recovery, normal fanout pending-only, one initial claim, one atomic recovery retry after 10 minutes, no third send, stale attempt response ignored
- Publication authorization, reopen/edit/correct does not publish before current revision approval; stale worker/cancellation/policy races cannot commit
- Cleanup manifest, interruption after every individual copy, cleanup before nonce reset, no manifest loss on resubmission during cleanup
- Suppression URLs, captured public URLs return 404 within 15 minutes of policy activation
- Rate limit, two concurrent publishes of one airframe inside one 24-hour bucket yield one alert_events row per follower, tested with parallel transactions
- Freshness, a native submission with taken_at older than 7 days publishes and yields zero alert_events
- Provenance, archive publication produces zero alert_events
- Redaction, prohibited fields and precommit nonce keys never reach analytics or crash payloads

Performance budgets from docs/DESIGN.md section 9 are release gates, measured on a mid-tier device on production-like network, not aspirations.

UI polish is verified by demo, not by test.

## 9. Session end protocol

1. Update CLAUDE.md section 4 status table and section 6 if a decision closed or opened.
2. CHANGELOG.md entry per task done.
3. List anything that needed a CKC decision and did not get one.
4. Do not edit any other section of CLAUDE.md, AGENTS.md, or docs without a CKC-approved revision.
