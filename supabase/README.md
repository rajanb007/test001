# supabase

Numbered SQL migrations and Edge Functions. BuildPack v1.8 sections 3, 4, 5, 6.

## Migration naming

Files are `NNNN_name.sql`. This is the one place underscores appear, against
the hyphens-only rule in `AGENTS.md` section 4, because the Supabase CLI parses
the version and name across an underscore and will not pick up a hyphenated
file. `AGENTS.md` exempts existing package conventions, and
`packages/shared/generate-prefix-migration.ts` already documents its output as
`supabase/migrations/<n>_registration_prefixes.sql`. Flagged for CKC.

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

## Not here yet

- No triggers migration. `airframes.updated_at` and `submissions.updated_at`
  have defaults but nothing maintains them on update, and BuildPack section 3
  specifies no trigger. Adding one is a schema change beyond section 3, so it
  needs a CKC ruling. Open question, see `CHANGELOG.md`.
- No `published_sightings` view, no `app_reader` role, no `is_suppressed`.
  BuildPack section 4 structural rules 1 and 5 place them in Phase 0.
- No RPCs. `create_submission`, `advance_submission`, `resolve_airframe` and
  `publish_submission` are Phase S Block 4.
- No Edge Functions. `process-media` lands in Block 5 and is scaffolded as an
  Edge Function; the worker fallback stays open until the gate 5 benchmark.

## Applying

Nothing here has been applied to any database. Supabase is parked.

```bash
supabase start
supabase db reset
```
