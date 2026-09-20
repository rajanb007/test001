# Policy tests

`AGENTS.md` section 7 requires every new table to ship with RLS enabled and a
policy test in the same PR. These are those tests.

They need a live Postgres with the migrations applied. Supabase is parked for
now, so every test here **skips** unless `DATABASE_URL` is set. A skipped test
proves nothing. Phase S gates stay at 0 of 7 until these run green against a
real stack and, per BuildPack section 4 structural rule 4, until the REST-level
negative tests run against the Supabase REST endpoint with real anon and
low-trust keys. A direct Postgres connection cannot substitute for that.

Run locally:

```bash
supabase start
export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
pnpm run test
```
