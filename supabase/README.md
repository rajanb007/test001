# supabase

Numbered SQL migrations and Edge Functions. BuildPack v1.8 sections 3, 4, 5, 6.

## Migration naming

Files are `NNNN_name.sql`. This is the one place underscores appear, against
the hyphens-only rule in `AGENTS.md` section 4.

Verified 2026-09-20, not assumed. A file named `0012-naming-probe.sql`
containing `create table public.naming_probe` was added and `supabase db reset`
was run. The CLI logged no error, did not list the file, and the table did not
exist afterwards. A hyphenated migration is silently skipped, which is worse
than a failure because it looks committed and never runs.

`AGENTS.md` exempts existing package conventions, and
`packages/shared/generate-prefix-migration.ts` already documents its output as
`supabase/migrations/<n>_registration_prefixes.sql`. Recommendation, keep the
underscore and add an explicit carve-out to `AGENTS.md` section 4 at the next
doc revision so the exception is documented rather than looking like a breach.

## Concerns, AGENTS.md section 7

| File                                  | Concern                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `0001_extensions.sql`                 | pgcrypto, postgis, pg_cron                                                |
| `0002_enums.sql`                      | Every enum in BuildPack section 3                                         |
| `0003_identity.sql`                   | users, airframes, airframe_registrations, registration_prefixes, airports |
| `0004_content.sql`                    | submissions, sightings, media, publish_jobs                               |
| `0005_social.sql`                     | follows, device_push_tokens, alert_events, alert_deliveries               |
| `0006_safety.sql`                     | moderation_actions, import_conflicts                                      |
| `0007_indexes.sql`                    | Performance indexes for the subset                                        |
| `0008_rls.sql`                        | RLS enabled, SELECT policies                                              |
| `0009_grants.sql`                     | Revoke all, grant back the section 4 matrix                               |
| `0010_registration_prefixes_seed.sql` | Generated. Never hand edit                                                |

Append only once applied to the shared project. Fix forward.

## The Phase S fixture harness

`0015` supplies approval for the happy path so publication can run before
`authorize_submission` exists. BuildPack section 9 allows this and requires
that it is never exposed to clients and never shipped.

Four things keep it honest, all asserted by `tests/policy/phase-s-harness.test.ts`:
every function carries the `app_fixture_` prefix so one grep finds them at
Phase 0, they live only in that migration, they are revoked from `anon` and
`authenticated` and check the service role at runtime, and the audit row they
write is tagged `fixture: true` so an approval that came from the harness stays
distinguishable from a real one forever.

**Phase 0 deletes this file** and adds `authorize_submission`.

## Not here yet

- No triggers migration. `airframes.updated_at` has a default but nothing
  maintains it on update. Withdrawn as a blocking question for `submissions`
  and `publish_jobs`, whose RPCs set it explicitly. `airframes` is written in
  bulk by Phase 0 importers and is decided there.
- No `published_sightings` view, no `app_reader` role, no `is_suppressed`.
  BuildPack section 4 structural rules 1 and 5 place them in Phase 0.
- No `authorize_submission`, no manifest cleanup, no adversarial race handling.
  BuildPack section 9 places all three in Phase 0, gates 12 to 14. The stage
  machine in `0014` is written to be extended there, not replaced.
- No `update_submission` or `cancel_submission`. R11 resubmission is not in the
  Phase S task list, so the reopen path does not exist yet.
- No `get_my_submissions`. The owner projection exists as
  `app_owner_submission_json` and the RPC that wraps it is Phase 0.
- No Edge Functions yet. The cron bodies for `alert-fanout`, `receipt-check`,
  `sweeper` and `publish-runner` are thin loops over the RPCs in `0014` and
  `0018`; `process-media` needs the image pipeline and the gate 5 benchmark.
- No `process-media`. Deriving three variants from a 24 MP JPEG or HEIC is the
  gate 5 decision, and the benchmark has to run in the real Edge runtime with
  its 256 MB and 2 second limits, not here.

## Applying

Applied and verified 2026-09-20 against a local stack on
`supabase/postgres:17.6.1.167`. All ten migrations applied clean from an empty
database, twice, including one full teardown and rebuild.

```bash
pnpm run db:start      # supabase start, applies every migration
pnpm run db:reset      # rebuild from empty and reapply
pnpm run test:live     # full suite with the live Postgres and REST tests
pnpm run db:stop
```

`pnpm run test` alone runs the static tests and skips the live ones. A skipped
test proves nothing.

## Open defect, PostGIS is client writable

**Verified 2026-09-20. Not fixed. Needs a CKC decision.**

The Supabase Postgres image installs PostGIS into `public` as `supabase_admin`
and grants `anon` and `authenticated` INSERT, UPDATE, DELETE, TRUNCATE and
REFERENCES on `public.spatial_ref_sys`, plus `geography_columns` and
`geometry_columns`. PostgREST exposes `public`, so those grants are reachable
from the internet with the publishable key alone.

Reproduced end to end. A `PATCH /rest/v1/spatial_ref_sys?srid=eq.4326` carrying
only the publishable key returned 204 and rewrote the WGS 84 definition. A
`DELETE` of another row returned 204 and the row count fell from 8500 to 8499.

Measured blast radius, so the risk is not overstated:

| Surface                                                            | Effect                                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `ST_Transform` from 4326                                           | Real. Corrupting `proj4text` moved a Heathrow point about 479 m in EPSG:3857                       |
| `geography` columns, `captured_geo`, `display_geo`, `airports.geo` | None measured. PostGIS hardcodes the WGS 84 spheroid for geography, so `ST_Distance` was unchanged |
| Availability                                                       | `spatial_ref_sys` is deletable and truncatable by `anon`, which would break every `ST_Transform`   |

It cannot be fixed from a migration. Migrations run as `postgres`, which is not
a member of `supabase_admin`, and Postgres silently ignores a revoke of another
role's grant. The first attempt at a fix, a `revoke` in a migration `0011`, ran
without error and changed nothing. It was deleted rather than left in place
looking like protection.

The durable fix is installing PostGIS into the `extensions` schema, which
already exists. Proven in a scratch database on this stack:
`create extension postgis with schema extensions` puts `spatial_ref_sys` there
with zero grants to `anon` or `authenticated`. It cannot be applied here
because the extension is already installed and owned by `supabase_admin`, so
`create extension if not exists` is a no-op and `alter extension set schema`
needs ownership.

Options for CKC, none of which an agent should pick alone:

1. Confirm whether a hosted Supabase project grants `postgres` enough to move
   the extension. Untested, this finding is from the local stack only.
2. Raise it with Supabase support as a platform default.
3. Accept the risk for Phase S, which runs internally with operator fixtures,
   and make it a Phase 0 release blocker.

Tracked by `it.fails` tests in `tests/policy/live-grants.test.ts` and
`tests/policy/live-rest.test.ts`. They pass while the defect stands and start
failing the moment it is fixed, which forces them to be rewritten instead of
quietly rotting.
