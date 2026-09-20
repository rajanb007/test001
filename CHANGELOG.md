# Change log

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
