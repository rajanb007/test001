# Change log

## Phase S, UI mocks and three scope rulings, 2026-09-20

Phase S task 8 is done, and reading the spec to build it found a gap in
shipped code.

- Four artboards on a Design canvas: Home feed, Aircraft Passport, Capture
  step 2 of 4, and Queue. Built from docs/DESIGN.md section 5 component
  anatomy and section 6 queue labels, with the D1 frozen tokens. That closes
  "Static card mock, Passport above-the-fold mock with history strip,
  clickable capture plus follow prototype", BuildPack section 9.
- Every design point was verified against the published bytes rather than
  asserted: 26 wireframe directives from CKC, plus 6 corrections forced by
  rules the wireframes did not account for, chiefly that an artboard cannot
  reach the network, that a fixed card aspect defeats "height flexes, no
  letterbox", and that a div with cursor:pointer is unreachable by keyboard.

Found while building the Queue screen, open for CKC:

- **The queue has no state for a failed upload.** docs/DESIGN.md section 6
  lists three local-only states and BuildPack section 7.3 lists two.
  packages/shared/types.ts followed the BuildPack, which wins conflicts, so
  `local failed` with the label "Couldn't upload" is absent. Invariant 11
  requires offline to be "durable and honestly reported", and a queue that
  cannot say an upload failed does not meet that. Recommendation is to add
  the third state; the conflict needs a doc revision either way.
- **The test that should have caught it compared the code to itself.**
  `types.test.ts` asserted QUEUE_STATE_LABELS against LOCAL_QUEUE_STATES,
  both written in the same file. Rewritten to parse the section 6 table from
  docs/DESIGN.md: one test proves no label is invented, an it.fails test
  documents the missing one, and a third names it so the gap stays specific.

Three scope rulings from CKC, 2026-09-20:

- **Vicinity alerts, sequenced not merged.** An alert for any aircraft near
  the user would contaminate the North Star denominator, which counts
  alert_events with status provider_accepted, one per user per airframe per
  day. Invariant 7 keys the rate limit on (user_id, airframe_id, window_key)
  and a vicinity alert has no followed airframe. More importantly a user who
  returns because a jet is overhead cannot be distinguished from one who
  returns because the airframe they follow was seen again, which is the only
  question Phase S exists to answer. Kept as a post-validation experiment
  with its own metric.
- **Comments, likes, follow-user, badges and scores stay deferred.** MVP
  v1.3.2 section 5 defers comments and follow-user "to reduce product and
  moderation surface", and the Founder Operations section names those
  deferrals plus one alert type as the mitigations for one founder owning
  engineering, moderation, imports and activation. Removing the mitigation
  leaves the risk.
- **Queue screen built.** Largely in scope already through QueueStateBadge
  and get_my_submissions. Titled Queue, not Upload Queue, since "upload" is
  banned as a noun; registrations render as plain mono rather than
  RegistrationChip because the chip promises a Passport link that a queued
  item does not have until publish.

No code behaviour changed. Phase S exit gates remain 0 of 7.


## Phase S, code review of Blocks 1 to 5, 2026-09-20

Ten defects found and fixed, each with a regression test that fails without
the fix. Suite is 621 tests, 183 of them live, up from 588.

Correctness, ordered by how much damage each would have done:

- **Tier 3 could never publish.** `publish_resolve` treated anything but
  `matched` as a failure, so `stub_pending` sent the submission to
  `awaiting_identification`. The first sighting of any registration nobody had
  photographed yet was unpublishable, which is the whole of R5 tier 3 broken.
  Only `ambiguous` and `invalid` are non-publications, SPEC section 3.4.
- **Approval gated only the first claim.** `publish_claim` checked the
  approved revision for `waiting_authorization` alone, so a job already at
  `resolved` was re-claimed after a rejection and copied derivatives into the
  public bucket before the commit refused. Invariant 4 says unapproved
  derivatives never reach the public bucket, and "at commit" was too late.
- **The service-role guard was a no-op.** `app_require_service` fell back to
  `current_user`, which inside a `SECURITY DEFINER` function is the function
  owner, so the check passed unconditionally in every service-only RPC. The
  revokes still made them unreachable, so nothing was exposed, but the defence
  in depth BuildPack section 5.1 requires was absent and one mistaken grant
  would have removed the only protection. Now `auth.role()` plus
  `session_user`; `current_user` is documented as unusable here. Verified on
  this stack: an anon REST call reports `current_user=postgres`,
  `session_user=authenticator`, `auth.role()=anon`.
- **A crash could strand an alert forever.** `materialize_deliveries` returned
  only rows it had just inserted, so a worker that died between materialising
  and claiming left the delivery and its event at `pending` with nothing to
  pick them up. It now returns every pending delivery of an in-flight event,
  oldest first.
- **A sighting could publish with null derivative paths.** The media stamp in
  `publish_commit` was an unfiltered update that silently matched nothing when
  no media row existed. It now raises with the other guards, before any write.
- **An all-failed event stayed pending forever.** `record_delivery_error` and
  `fail_delivery_ticket_lost` never reconciled, so the event was rescanned on
  every tick instead of becoming `skipped`, section 6.2 step 6.
- **Redaction skipped arrays.** `redact` treated an array as a leaf, so
  forbidden keys inside arrays of objects and URLs inside arrays of strings
  reached analytics. Invariant 9 and R13.
- **The timestamp schema rejected every real response.** `utcTimestampSchema`
  required the `Z` spelling, and PostgreSQL renders a timestamptz inside
  `jsonb_build_object` as `+00:00`, so the owner projection never parsed. Both
  zero-offset spellings are accepted now, a non-zero offset still is not.
- **The uuid schema was stricter than the uuid column.** `z.string().uuid()`
  enforces the RFC 4122 version and variant nibbles; the column does not, so
  the schema rejected ids Postgres stores and returns. Found by running a real
  `create_submission` response through `ownerSubmissionSchema`, which nothing
  had ever done.
- `toggle_follow` cast a client string to uuid before checking it, so a typo
  raised a raw 22P02 instead of the documented "no such airframe".

Known and deliberately not fixed:

- There is no terminal failure path. A job that cannot commit is re-claimed at
  every lease expiry rather than moving to `failed`. A correct fix needs the
  `cleanup` stage with nonce rotation and manifest retention, which BuildPack
  section 5.5 places in Phase 0. The two fixes above close both loops actually
  observed, so nothing spins today.

Method note: every fix has a test that fails without it, and the three most
subtle were mutation tested by restoring the defect and confirming the suite
goes red. One review claim was checked and rejected: the CI action pins were
said to look ahead of what exists, and they resolve fine and have passed six
runs.


## Phase S, Block 5, storage and the push chain, 2026-09-20

Real storage buckets, the real storage adapter, and the alert fanout from the
sightings trigger through to receipts. Suite is 588 tests, 167 of them live,
up from 552.

**Gate 7 now runs against real objects in a real bucket.** It was previously
proved only against a fake port.

- Migration 0016 creates the three buckets from BuildPack section 4 rule 3:
  `originals` private and owner scoped by path, `pending` with no client policy
  at all, `derivatives` public read. `SupabaseStorage` implements the same
  `StoragePort` the fake did, so the runner did not change.
- Gate 7 rerun on real storage: the happy path writes three real objects that
  are fetchable at their public URL, a kill after copied then restart yields
  exactly one sighting, three objects and one publish audit row, and a kill
  after committed writes nothing and leaves the objects untouched. A public key
  returns 400 before commit, R13.
- Migration 0017 adds the `after insert on sightings` trigger. It enqueues one
  `alert_events` row per follower with `on conflict do nothing`, so invariant 7
  is the unique index rather than a lookup. Freshness and provenance are
  separate and both tested: a `taken_at` older than seven days publishes and
  alerts nobody, R6, and an archive publication alerts nobody, invariant 5. An
  onboarding follow fans out exactly like a deliberate one, A11.
- Migration 0018 implements section 6.2 with its claim and recovery statements
  reproduced exactly as specified. Normal fanout claims pending only and never
  reclaims an expired sending row. Ticket and error writes are fenced by
  `send_attempt_id`, so a late response from a superseded attempt returns false
  and changes nothing. Recovery allows exactly one retry, refuses before ten
  minutes, and a second uncertain outcome becomes `ticket_lost`.
- `register_push_token`, `toggle_follow`, `mark_alert_opened` and
  `mark_alert_attributed`. Attribution is a separate stamp from the open, so
  the North Star denominator stays provider-accepted alert events, R9.
- R9 is asserted structurally: no label in `delivery_status` or
  `alert_event_status` contains the word delivered.
- Mutation tested. Removing the `retry_count = 0` and age guards from
  `recover_delivery` fails three tests, including the four-way concurrent
  recovery race.

Two test-quality fixes:

- One enqueue test asserted only that a sighting id was truthy, which proved
  nothing. Replaced with a check of the alert row's airframe, sighting, status
  and day bucket.
- The migration-list test pinned exact filenames and had needed hand editing on
  every migration for three blocks running. Rewritten to assert the structural
  properties that matter, sequential numbering with no gaps or duplicates and
  the nine schema concerns in dependency order.

Gates:

- **Gate 7 passes on real storage.** It still has to be rerun against the
  completed Phase 0 pipeline before sign-off, BuildPack section 9.
- **Gate 3 is not closed.** The chain is exercised end to end in SQL: event
  created, delivery claimed, ticket recorded, receipt to `provider_accepted`,
  opened, attributed. The one hop no test here can supply is the real Expo
  send to APNs or FCM on a physical device.
- Gates 1, 4, 5 and 6 are untouched by this block. Phase S exit gates remain
  0 of 7 passed.

Not built, and why:

- No `process-media`. Deriving three variants from a 24 MP JPEG or HEIC is the
  gate 5 decision, and the benchmark only means something inside the real Edge
  runtime with its 256 MB and 2 second limits.
- No Expo app, so no capture slice, no SQLite queue and no TUS upload. Gate 1
  is about termination, restart and network loss on hardware.


## Phase S, Block 4, write path and publication, 2026-09-20

`create_submission`, the guarded transition helper, `advance_submission`,
`resolve_airframe` with `taken_at`, and the happy-path publication stage
machine. Suite is 552 tests, 133 of them live, up from 472.

**Gate 2 identity half and gate 7 now pass against a real database.** Neither
is a closed exit gate yet, see below.

- Migrations 0011 to 0015. The private transition helper is the only state
  mutator, invariant 10: a disallowed transition and a repeat of the current
  state are both no-ops that write no audit row, so retries cannot duplicate
  one. The SPEC section 3.3 table is encoded once, in
  `app_transition_allowed`.
- `create_submission` is idempotent on `(user_id, client_submission_id)`,
  invariant 1. A retry returns the existing row and writes no second audit
  row. Only the six documented payload fields are read, so a client-supplied
  `state`, `review_required` or approval field is ignored rather than copied.
  `review_required` comes from server trust.
- `resolve_airframe` resolves by `taken_at` against validity ranges, never by
  the current holder. The reassignment fixture resolves a pre-reassignment
  date to the old airframe and a post-reassignment date to the new one, and an
  overlapping range quarantines with zero writes to existing airframe rows.
- The publication stage machine follows BuildPack section 5.5. The key
  manifest is committed before the first copy, keys derive from the job nonce
  so a recopy after a crash overwrites rather than creating a second set, and
  the sighting is inserted in one SQL transaction after the objects are
  verified. Claiming is a single atomic update returning the row, never a
  state check.
- The publish-runner lives in `packages/shared/publish/runner.ts` behind a
  storage port. Block 4 drives it against a fake that counts writes per key;
  Block 5 swaps in Supabase Storage without touching the runner.
- Cross-language validator parity test. The SQL and TypeScript validators are
  two implementations of one contract, so they are run over a 463 case corpus
  and asserted to agree on normalisation, validity, prefix and country. The
  check was mutation tested: breaking the SQL validator fails it.
- The Phase S fixture harness is confined and audited.
  `tests/policy/phase-s-harness.test.ts` asserts every fixture function
  carries the `app_fixture_` prefix, lives only in migration 0015, is revoked
  from clients, checks the service role at runtime, and tags its audit row
  `fixture: true`.

Two of my own mistakes, both caught by tests rather than review:

- Live test files ran in parallel against one shared database and wiped each
  other's fixtures. Every file passed alone and the suite failed together.
  Fixed with `fileParallelism: false` and a comment saying why.
- A Block 2 REST test asserted the users table was empty. That was an
  assumption about fixture data, not part of the grant contract it was
  testing, and it broke as soon as another suite created a user. Rewritten to
  assert permitted versus denied, plus a new case that checks a real row
  exposes only the six granted columns.

Gates, stated precisely:

- **Gate 2** identity half and concurrency half both pass. Eight racing
  resolutions of one new registration produce exactly one airframe with no
  orphans. The gate also requires this on the full Phase 0 pipeline, so it is
  not signed off.
- **Gate 7** passes against the fake storage port: kill after copied and
  before committed yields exactly one sighting, three distinct public objects
  and one publish audit action; kill after committed returns the existing
  sighting and writes nothing. **It is not closed.** Gate 7 is about real
  objects in a real bucket, and that is Block 5.
- Gates 1, 3, 4, 5 and 6 need hardware, a push chain, a benchmark and a
  cohort. Phase S exit gates remain 0 of 7 passed.

Open for CKC, new this block:

- `resolve_airframe` takes an optional third argument, `p_submission_id`. The
  documented two-argument signature still works. It exists because SPEC
  section 3.4 requires the ambiguous branch to write `import_conflicts` "with
  submission_id", which two arguments cannot supply.
- SPEC section 3.4 does not say what happens when registration history exists
  but `taken_at` falls in a gap or after every `valid_to`. Decision priority
  puts data integrity above speed, so it quarantines rather than guessing a
  holder. Confirm or rule otherwise.
- Tier 2, the OpenSky lookup, is unreachable in Phase S because
  `aircraft_source_records` is a Phase 0 table. `stub_enriched` is therefore
  never returned yet, by design rather than omission.


## Phase S, CI parity fix, 2026-09-20

The Block 3 push turned CI red. Root cause and fix recorded because the class
of mistake matters more than the line.

- The Design token drift step was written as an inline `run: |` block using
  `pnpm run tokens:generate > file`. `pnpm run` prints a banner to stdout, so
  the redirect captured it and the diff always failed. Reproduced locally
  before fixing.
- The real fault was not the banner. The step lived only in the workflow, so
  `pnpm run verify` did not cover it and there was no way to run it before
  pushing. Every other check had been verified locally first; this one could
  not be.
- Both remaining inline steps are now scripts. `scripts/check-token-drift.ts`
  and `scripts/check-no-env-files.ts`, wired as `tokens:check` and
  `env:check`, both in `verify`. CI now runs exactly the seven commands
  `verify` runs, in the same order.
- `tests/ci-parity.test.ts` enforces it. Every `pnpm run` in the workflow must
  exist in package.json and be covered by `verify`, no multi line `run:` block
  is allowed, and no step may redirect `pnpm run` output to a file. That last
  rule is the specific banner trap, written down so it cannot recur.
- Verified `pnpm install --frozen-lockfile` succeeds, which CI does and local
  installs do not.


## Phase S, Block 3, packages/shared, 2026-09-20

Tokens, types, events and schemas. Suite is 453 tests, up from 160. Found one
documentation defect in the frozen token table.

- `tokens.ts` is generated from `docs/DESIGN.md` section 2.4 rather than typed,
  and CI diffs the committed file against fresh generator output. Ruling D1
  makes the document the authority, and `CLAUDE.md` section 7 records what
  happens when a file is rebuilt from memory.
- `contrast.ts` implements the WCAG relative luminance formula. `tokens.test.ts`
  recomputes all 62 ratios printed in sections 2.1 and 2.2, checks every pairing
  against its threshold, and encodes the two tertiary exceptions and the D2
  border exemption so neither can quietly widen.
- `types.ts` mirrors the Postgres enums and is checked against
  `0002_enums.sql`, including a test that every enum the migration declares is
  covered, so none can be forgotten. Queue labels are asserted sentence case,
  never promising background upload, and never saying delivered.
- `events.ts` is the only analytics path. The taxonomy is exhaustive, an
  unknown name throws per ruling A2, and redaction runs in the wrapper rather
  than at call sites. It strips prohibited keys at any depth and drops any URL
  value whatever the key is called.
- `schemas.ts` covers the section 5.1 payloads. `create_submission` and the
  owner projection are `.strict()`, so a client-supplied approval field or a
  leaked `approved_by` fails rather than passing through.
- Registration validator tests, the Phase S equivalence task. Hyphenated and
  stripped forms resolve identically, including for every unpatterned row
  generated from the JSON itself. Unicode dashes are covered, because a
  registration pasted from a PDF carries U+2011 rather than U+002D.

Found and not fixed, needs a CKC decision:

- **`docs/DESIGN.md` section 2.1, dark `error` row.** It prints 6.86, 6.22 and
  5.54 against `bg`, `surface1` and `surface2`. The frozen hex `#EE8580` gives
  7.48, 6.77 and 6.02. Only the `surface3` cell is right.
- The hex is safe and nothing in code changes. All four pairings clear 4.5 to 1
  with margin, and the printed values understate rather than overstate.
- Provably wrong rather than rounding. `ratio_on_bg` divided by `ratio_on_S`
  depends only on the surfaces, giving 1.1048, 1.2411 and 1.4823. Every other
  row in both tables reproduces those. The `error` row implies 1.1029, 1.2383
  and 1.3611, so its four cells cannot describe one colour. It reads like a
  partial update after the hex changed.
- Recorded rather than corrected: an agent may not edit `docs/` without an
  approved revision, AGENTS.md section 9.4.

Added `zod`, a pure-JS dependency inside the section 3 latitude.

Phase S exit gates remain 0 of 7. None of these are gates.


## Phase S, Supabase unparked and migrations verified, 2026-09-20

Applied the migration set to a real database for the first time. Three things
came out of it: the set applies clean, one of my two predicted failures was
wrong, and a security defect surfaced that no static test could have found.

- Local stack on `supabase/postgres:17.6.1.167`. All ten migrations applied
  clean from empty, twice, including a full container teardown and rebuild.
- Both failures I predicted did not happen. `pg_cron` and `auth.users` were
  both fine, because the image pre-installs all three extensions as
  `supabase_admin`. Every `create extension if not exists` in 0001 is a no-op
  on this image. Comment added so the next reader is not misled.
- Grants verified against Postgres, not against the SQL text. `submissions`
  exposes exactly 18 columns to `authenticated` and nothing to `anon`, `users`
  exactly 6, `alert_events` exactly 6, and `sightings`, `media`,
  `alert_deliveries`, `publish_jobs`, `moderation_actions` and
  `import_conflicts` expose nothing.
- Added `tests/policy/live-grants.test.ts`, 48 tests against Postgres as `anon`
  and `authenticated`, and `tests/policy/live-rest.test.ts`, 17 tests against
  PostgREST with a real anon key. Suite is now 160 tests, 65 of them live.
- Added `pnpm run db:start`, `db:stop`, `db:reset` and `test:live`. Committed
  `supabase/config.toml`, checked for secrets first, project id `planespotter`.

Found and not fixed, needs a CKC decision:

- **PostGIS is client writable.** The image grants `anon` INSERT, UPDATE,
  DELETE and TRUNCATE on `public.spatial_ref_sys`, and PostgREST exposes
  `public`. Reproduced over HTTP with only the publishable key: a PATCH
  rewrote the WGS 84 definition and returned 204, a DELETE removed a row and
  returned 204. Measured effect is real for `ST_Transform`, about 479 m of
  error at Heathrow, and nil for the `geography` columns, which hardcode the
  WGS 84 spheroid. `spatial_ref_sys` is also deletable, which would break every
  transform. Full writeup, blast radius table and the three options in
  `supabase/README.md`.
- No migration can fix it. Migrations run as `postgres`, which is not a member
  of `supabase_admin`, and Postgres silently ignores a revoke of another role's
  grant. My first fix, a `revoke` in a migration `0011`, ran without error and
  changed nothing. It was deleted rather than left in the tree looking like
  protection. The defect is tracked by `it.fails` tests that flip the moment it
  is fixed.

Resolved by evidence, no longer open questions:

- **Migration naming.** Verified rather than assumed. A file named
  `0012-naming-probe.sql` was added and `supabase db reset` run. The CLI logged
  no error, did not list it, and the table did not exist afterwards. A
  hyphenated migration is silently skipped, which is worse than a failure.
  Keep `NNNN_name.sql` and add an explicit carve-out to `AGENTS.md` section 4
  at the next doc revision.
- **`updated_at` maintenance.** Withdrawn as a CKC decision. `submissions` and
  `publish_jobs` are written only by RPCs and workers we control, so they set
  `updated_at` in their own statements in Block 4. No schema change and no
  trigger. Only `airframes` is different, because Phase 0 importers write it in
  bulk, so it moves to Phase 0.

Still unpassed. Phase S exit gates remain 0 of 7. Nothing here is a gate; these
are grant and schema checks, and the gates need hardware, a push chain, a
benchmark and a cohort.


## Phase S, Blocks 1 and 2, 2026-09-20

Monorepo scaffold and the Phase S schema subset. No database was created and no
migration was applied. Phase S exit gates remain 0 of 7.

- Monorepo scaffolded, pnpm workspaces, `apps/mobile`, `apps/web`,
  `packages/shared`, `supabase/migrations`, `supabase/functions`, per BuildPack
  section 2.1. TypeScript strict everywhere, `no-explicit-any` as a lint error.
- `.env.example` documents all ten variables from BuildPack section 2.3.
- CI workflow runs format, lint, typecheck, registration prefix drift and tests,
  and fails if any `.env` file is tracked.
- Migrations 0001 to 0009 written for the fourteen Phase S tables plus `airports`,
  split by concern per AGENTS.md section 7: extensions, enums, identity, content,
  social, safety, indexes, RLS, grants.
- Migration 0010 generated from `packages/shared/registration-prefixes.json` by
  the existing generator. `pnpm run prefixes:check` fails CI on drift.
- RLS enabled on all fifteen tables. SELECT policies only; absent insert, update
  and delete policies deny anon and authenticated until the Block 4 RPCs exist.
- Grants file revokes all from anon, authenticated and public, then grants back
  exactly the BuildPack section 4 matrix, including the binding eighteen-column
  submissions owner allowlist and the six-column users public projection.
- 95 static policy and schema contract tests. They read the SQL, they do not
  execute it. The live-stack tests in `tests/policy` skip without `DATABASE_URL`.
- Branches established per AGENTS.md section 6: `main`, `phase-s`, feature branch
  off `phase-s`.

Decided without a CKC ruling, inside implementation latitude:

- `airports` is included in the Phase S subset because `submissions.airport_icao`
  and `sightings.airport_icao` are foreign keys to it. Dropping the FK would have
  been a schema change beyond BuildPack section 3.
- All enums from BuildPack section 3 are created in 0002, not just the subset's,
  so later phases append tables rather than types.
- Navigation scaffolds to the JS tabs fallback. NativeTabs stays locked out until
  the gate 4 spike passes.
- `process-media` is scaffolded as an Edge Function. The worker fallback stays
  open until the gate 5 benchmark.

Needed a CKC decision and did not get one, AGENTS.md section 9.3:

- **Migration file naming.** Files are `NNNN_name.sql` with an underscore,
  against the hyphens-only rule in AGENTS.md section 4. The Supabase CLI parses
  version and name across an underscore and will not pick up a hyphenated file,
  and `packages/shared/generate-prefix-migration.ts` already documents its output
  as `<n>_registration_prefixes.sql`. Treated as an existing package convention.
  Confirm or rule otherwise.
- **`updated_at` maintenance.** `airframes.updated_at`, `submissions.updated_at`
  and `publish_jobs.updated_at` have `default now()` and nothing maintains them on
  update. BuildPack section 3 specifies no trigger. Adding one is a schema change
  beyond section 3. No triggers migration was written.
- **Supabase project.** Parked by instruction. Every Phase S gate needs a real
  stack, and Phase 0 gate 1 requires fresh clone to running stack with documented
  commands only. Nothing here is verified against Postgres.
- **BuildPack section 2.1 line 151** places `BuildPack.md` at the repo root. The
  document set lives in `docs/`, matching CLAUDE.md section 3 and the AGENTS.md
  header. Read as a stale line in the BuildPack, not a ruling. Confirm.


## Package 2.6 / BuildPack 1.8 — 2026-09-19

CKC reconciliation. Two v2.5 packages were produced in parallel, the reviewer copy was adopted as base for its owner allowlist, JSON mutation returns and Phase S gate 7.

- T2 reverted to 26 to 34 weeks, held per CKC ruling, recalculate at Phase S exit. 30 to 39 recorded as Phase 0 pressure only.
- Removed phantom DesignSpec v1.1 reference from the BuildPack authority line and end note.
- No contract changes.

## Package 2.5 / BuildPack 1.7 — 2026-09-19

User-authorized documentation corrections; no app implementation or deployment.

- Replaced broad owner grants with explicit columns; exposed approval as is_approved through get_my_submissions and removed raw moderator/worker fields from owner RPCs and audit summaries.
- Specified shared hashtext transaction advisory locks for airframes and registrations, ordered before submission/job locks.
- Kept Phase S to the internal happy path and crash-recovery gate 7; placed authorization, manifest cleanup, fencing and gates 12 to 14 in Phase 0.
- Restated T2 to roughly 30 to 39 calendar weeks at 25 hours per week, including 80 to 120 added Phase 0 hours; Phase S remains 5 to 6 weeks.
- Synchronized active contracts, agent rules, acceptance criteria and status. See docs/VALIDATION.md for static verification and remaining runtime work.

## Package 2.4 / BuildPack 1.6 — 2026-09-19

User requested the corrections from the v2.3 review. Documentation changes only; no application has been built or deployed.

- Added revision-bound publication approval and parked jobs; reopened/corrected submissions cannot bypass review.
- Added lease/attempt fencing and final-commit checks for edits, cancellation and privacy changes.
- Made preflight an operation within claimed and synchronized the stage constraint.
- Persisted intended storage keys before copying; blocked nonce reset until cleanup completes.
- Restricted normal push sending to pending rows and bounded uncertain-send recovery to one guarded retry.
- Reconciled queue copy, retained rejected media, notification permission actions, phase schema subset and acceptance scenarios.
- Updated active references and versions across AGENTS, CLAUDE, SPEC, DESIGN, PRD and user profiles.
- Preserved original MVP/design background files and registration utilities byte-for-byte.

Verification: see docs/VALIDATION.md. Runtime acceptance scenarios remain required during Phase S/Phase 0.
