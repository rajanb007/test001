# PlaneSpotter

Planespotting social app. The core object is the airframe, a persistent aircraft
identity that accumulates community sightings over time.

Working name. Store name, wordmark, icon and domain are undecided, see
`CLAUDE.md` section 6.

## Read these first

| File                                 | Role                                              |
| ------------------------------------ | ------------------------------------------------- |
| `AGENTS.md`                          | Binding build rules. Read before writing any code |
| `CLAUDE.md`                          | Project memory, status, rulings, open decisions   |
| `docs/PlaneSpotterBuildPack-v1.8.md` | Build authority. Wins every conflict              |
| `docs/PlaneSpotterMVP-v1.3.2.md`     | Scope authority                                   |
| `docs/DESIGN.md`                     | Frozen tokens, binding for visuals, ruling D1     |

Conflict order: BuildPack, then MVP v1.3.2 on scope, then DESIGN.md on visuals,
then everything else.

## Layout

```text
apps/mobile/          Expo, expo-router. Not scaffolded yet
apps/web/             Next.js App Router. Not scaffolded yet
packages/shared/      Tokens, types, events, zod schemas, registration validator
supabase/migrations/  Numbered SQL, split by concern
supabase/functions/   Edge Functions. process-media lands in Block 5
docs/                 The document set
tests/policy/         RLS and schema contract tests
```

## Commands

```bash
pnpm install
pnpm run verify        # format, lint, typecheck, prefix drift, tests
pnpm run test
pnpm run prefixes:generate > supabase/migrations/0010_registration_prefixes_seed.sql
```

## Status

Phase S, Blocks 1 and 2 of 6. Monorepo scaffold and the schema subset exist.
**Phase S exit gates remain 0 of 7.** No migration has been applied to a
database, no RPC exists, no app code exists. See `CLAUDE.md` section 4.

Supabase is parked by decision, so every test that needs a live stack skips.
A skipped test proves nothing.

## Branches

`main` protected. Phase branches `phase-s`, `phase-0` and so on. Feature
branches off the phase branch. `AGENTS.md` section 6.
