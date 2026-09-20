# Policy tests

`AGENTS.md` section 7 requires every new table to ship with RLS enabled and a
policy test in the same PR. These are those tests, in three layers.

| File                      | Needs a stack | What it proves                                                 |
| ------------------------- | ------------- | -------------------------------------------------------------- |
| `schema-contract.test.ts` | No            | The migration text matches the BuildPack claims                |
| `rls-coverage.test.ts`    | No            | Every table is revoked and granted per the section 4 matrix    |
| `live-grants.test.ts`     | Postgres      | What Postgres actually enforces, as `anon` and `authenticated` |
| `live-rest.test.ts`       | PostgREST     | What a client holding the anon key can actually reach          |

The static layer always runs, so a table added without RLS fails CI with no
database. The live layer skips without `DATABASE_URL`, and the REST layer skips
without `SUPABASE_URL` and `SUPABASE_ANON_KEY`. A skipped test proves nothing.

## Running

```bash
pnpm run db:start     # boots the stack and applies every migration
pnpm run test:live    # exports the stack's env and runs all four files
```

`pnpm run test` on its own runs the static layer and skips the other two, which
is what CI does today.

## Why REST matters and SQL does not replace it

BuildPack section 4 structural rule 4 is explicit that the negative tests run
against the REST endpoint with real keys, never through the app. The reason is
concrete. PostgREST expands `select *`, so a bare `GET /rest/v1/users` is
denied by the column grant even though the six public columns are readable when
named. A psql session that selects those six columns directly would never see
that, and the client contract would be wrong.

The same rule separates denied from empty. A permitted-column read of another
owner's submissions returns `[]` with status 200, because RLS filters rows and
never raises. A forbidden-column read returns 401 with SQLSTATE 42501, even for
the owner. Asserting denial for the first case would be a false test.

## What these do not cover

Phase 0 gate 3 needs a low-trust **authenticated** key as well as the anon key,
exercising moderator-approved, trusted-auto, edited and idempotent responses
through `get_my_submissions`. Those RPCs do not exist yet, so the live tests
cover the anon half only. Phase S exit gates remain 0 of 7; none of them are
grant tests.
