# Change log

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
