# Doc Review v1.0, Personal Finance Platform doc set

| Field | Value |
|---|---|
| Author | CKC |
| Version | 1.0 |
| Date | 2026-09-27 |
| Reviewed | Personal-Finance-Platform-Spec-v1.1.md, CLAUDE.md v1.0 (finance), Memory-v1.md, Architecture-v1.md, Data-Model-v1.md, UI-UX-v1.md, Security-v1.md. All dated 2026-09-26 |
| Scope | Contradictions, gaps and unverified items found before any code. First task per finance CLAUDE.md "Current phase" |
| Not in scope | PlaneSpotter. This file sits in the PlaneSpotter repo only because that is the repo attached to the session. See section 1 |
| Status | Findings only. No doc edited. Rulings needed in section 7 |

Numbering matches the chat review of 2026-09-27 so items can be cross-referenced. #53 is new, found during source verification.

## 1. Blocker, repo mismatch

The attached repo `rajanb007/test001` is PlaneSpotter. Its CLAUDE.md v2.6 describes a pnpm monorepo with Expo, migrations 0001 to 0018 and a PlaneSpotter doc set in `docs/`. The finance CLAUDE.md describes a `finance-app/` root using npm. Two projects cannot share one CLAUDE.md, one `supabase/migrations/` folder or one `package.json`.

Ruling needed. New repo for the finance app, a subfolder here, or wrong repo attached.

## 2. Doc vs doc contradictions

| # | Conflict | Sources | Proposed resolution |
|---|---|---|---|
| 1 | Migration filenames must use dashes, `NNNN-description.sql`, with a down file. Supabase CLI reads `<version>_name.sql` only. PlaneSpotter verified on 2026-09-20 that a hyphenated migration is silently skipped, not rejected. Supabase CLI has no down migrations | Data-Model 1, 13. Finance CLAUDE.md rule 10. Memory "never do". Architecture 5 uses `supabase db push`. Evidence in PlaneSpotter CLAUDE.md section 6 | Carve-out for `supabase/migrations/` only, `NNNN_name.sql`. Replace down files with forward fix migrations |
| 2 | Signed URL expiry is 30 days in one doc, 30 minutes view and 5 minutes upload in another | Spec 2.5 step 1 vs Architecture 2.4 | Keep 30 and 5 minutes. Fix Spec |
| 3 | Upload route receives the file, validates, hashes, writes Storage. Dropzone accepts 32 MB. Vercel Functions cap the request body at 4.5 MB (memory, not fetched, see section 6) | Architecture 4 step 1. UI-UX 3.10. Spec 2.5 | Browser uploads straight to Storage with a signed upload URL. Job hashes the object and rejects duplicates |
| 4 | JOB_SECRET lives in Vercel env per three docs. Architecture reads it from `app.setting('job_secret')`, a plaintext row that lands in every backup | Spec 3, 8.4. Security S1 vs Architecture 2.3 | Store in Vault. pg_cron reads it through a security definer function |
| 5 | Audit trigger coverage has three different lists. Data-Model names 12 tables. Spec names 7 categories. Security says all mutating tables. Missing from Data-Model list are categories, properties, entities, recurring_series, loan_payments, allocation_targets, receipts, settings, schedule_e_map | Data-Model 4. Spec 8.10. Security AU2 | One rule. Every mutating table in `public` except audit_log, webhook_events and jobs. pgTAP enumerates it |
| 6 | Alert channels are `push, email, slack` in UI and DDL. Spec uses `push, digest, digest + Todoist`. Todoist has no toggle and no channel value | UI-UX 3.12, 5. Data-Model 9 vs Spec 6 | One enum, `push, digest, slack, todoist` |
| 7 | Alerts settings screen appears twice, as an Inbox tab and a Settings tab | UI-UX 2, 3.12. Spec 12.1 | Settings only. Inbox keeps the fired alerts feed |
| 8 | P1 Home has six cards. Budget top 5 is P2, upcoming recurring is P2, latest insight is P3. Safe to spend needs fixed recurring, which is P2 | Spec 9 P1. UI-UX 3.1. Spec 5 matrix | P1 ships attention strip, net worth, month cash flow without safe to spend. Other cards arrive with their phase |
| 9 | "No third-party browser scripts", CSP `default-src 'self'`, no inline. Plaid Link loads a third-party script and iframe. Next.js App Router emits inline scripts and needs a nonce CSP | Spec 8.5. Security P3, P4 vs Architecture 3.1 | Allow the Plaid Link origin on the Connections route only. Nonce based CSP |
| 10 | "Never `NEXT_PUBLIC_`" includes the anon key. Any browser Supabase client, for login or TOTP enrolment, needs URL and anon key | Spec 12.2. Security S2 | Decide if the browser ever talks to Supabase. If never, state it. If yes, exempt URL and publishable key |
| 11 | Backup credential is write-only, no list. Same job syncs the storage bucket and checks size. Sync needs list, size check needs HEAD | Security S4, B1. Spec 8.11 | Two credentials, or a manifest the job writes itself |
| 12 | Restore drill runs `pg_restore` of a full dump, then "run migrations to head". The dump already carries schema and migration history | Security 5 steps 3 to 4 | Replace with "verify migration history equals head" |
| 13 | Originals purge is "optional" in one place and mandatory at 90 days in two others | Spec 2.5 step 10 vs Security L3, Spec 8.6 | Mandatory unless pinned |
| 14 | Enum and column drift between Spec 4 and DDL. insights status lacks `resolved` in Spec. goals lacks `done`. plaid_items lacks `removed`. audit_log lacks owner_id. settings key shape differs | Spec 4 vs Data-Model 5, 6, 9 | Data-Model wins. Spec 4 becomes a pointer |
| 15 | Anthropic retention is `[VERIFY]` in Spec and "confirmed 2026-09-26" in Memory | Spec 7.7, 11 vs Memory "Confirmed facts" | Remove the Spec tag and cite the source in Memory |
| 16 | visx Sankey is conditional in Spec and final in UI-UX and Memory | Spec 12.5 vs UI-UX 7, Memory | Final. Fix Spec |
| 17 | Sync stale thresholds differ, 48 hour alert vs 7 day badge for synced accounts | Spec 6 vs UI-UX 3.7 | Document both on purpose or align |
| 18 | "pdf-parse or pdfplumber via Python" in a TypeScript stack on Vercel Node | Spec 2.5 step 4 vs finance CLAUDE.md stack | Node only. Drop Python |
| 19 | Memory file carries a version in its name yet is append only. Content changes, version never moves | Memory header vs finance CLAUDE.md rule 10 | Bump the minor version on every append, or exempt Memory from versioning |
| 20 | Only five job kinds have a scheduler entry. `ibkr_flex` 06:00 ET, `plaid_holdings`, `loan_match`, `transfer_match`, `recurring_detect`, `insights_run` have none | Architecture 2.3 vs Architecture 3.2, Spec 2.4, 2.6 | One schedule table covering all 15 kinds, cron or chained |

## 3. Platform facts and SQL defects

Verification column. "Sourced" means checked against vendor docs on 2026-09-27, link in section 8. "Memory" means not fetched because egress to the vendor site was blocked.

| # | Item | Sources | Verification | Proposed fix |
|---|---|---|---|---|
| 21 | `get_plaid_token` checks `current_setting('request.jwt.claim.role')`. Supabase documents claims as one JSON object in `request.jwt.claims`. The per-claim form is legacy PostgREST. Check as written likely raises `forbidden` for every caller. Over a direct connection there are no claims at all | Data-Model 11 | Sourced for the documented form. Behaviour of the legacy form not tested | `(current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'`, plus pgTAP |
| 22 | `create role analyst_ro ... password '<set in Vault>'` inside a migration commits the password to git | Data-Model 10 | Logic | Create the role in the migration without password. Set it out of band |
| 23 | Session lifetime 24 hours. Supabase time-boxed sessions and inactivity timeout are Pro plan and up. Refresh token reuse detection is on by default | Security A3. Spec 8.2 | Sourced | On Free, drop the 24 hour claim or enforce it in app middleware from the JWT `iat` of the session |
| 24 | Runner pops up to 10 jobs at up to 250 s each inside a 300 s function. pg_net `http_post` default `timeout_milliseconds` is 2000, so pg_cron's call gives up after 2 s and the response is never recorded | Architecture 2.3. Spec 3 | Sourced for pg_net. Vercel 300 s from Memory-v1.md. Whether Vercel keeps running after the caller disconnects is unverified | Route acks in under 2 s, work continues in `after()` or `waitUntil`, one long job per invocation |
| 25 | Schedules are written in ET. Supabase databases run in UTC by default. pg_cron schedule timezone on Supabase not confirmed | Architecture 2.3. Spec 3 | Partly sourced, UTC default. pg_cron behaviour unverified | Write cron in UTC and accept a one hour DST shift, or confirm `cron.timezone` is settable |
| 26 | Keepalive runs `select 1` from pg_cron. Supabase pauses Free projects for too little "user database activity" and says a few user requests a day is typical. Whether an internal pg_cron query counts is not stated | Security H1. Spec 3 | Partly sourced | Keep pg_cron heartbeat, add a daily external request through the API from GitHub Actions |
| 27 | Nightly `pg_dump` from GitHub Actions. Free direct connection is IPv6 only. Supabase lists GitHub Actions and Vercel as IPv4 only. Supavisor session mode on port 5432 is IPv4 on every tier | Spec 8.11. Architecture 5 | Sourced | Use the session pooler string. Pin `pg_dump` major version to server |
| 28 | sharp converts HEIC. Prebuilt sharp ships without a HEIC decoder because of patents | Spec 2.5 step 2. Architecture 4 step 2 | Memory | `heic-convert` or a custom libvips. Test with one iPhone photo before P2 |
| 29 | qpdf decrypts PDFs in memory on Vercel. qpdf is a native binary absent from the Node runtime | Spec 2.5 step 3 | Memory | WASM build or a pure JS decryptor. Spike first |
| 30 | `force row level security` on base tables while analytics views run as owner and "read everything". Works only if the view owner has `bypassrls` | Data-Model 3 vs 10 | Unverified | `select rolbypassrls from pg_roles where rolname = 'postgres'` on local stack, then pgTAP as analyst_ro |
| 31 | `revoke all on schema public from analyst_ro` does not remove grants made to PUBLIC. Test D4 passes for the wrong reason | Data-Model 10. Security AI4 | Postgres semantics, memory | Test by attempting a select on a public table as analyst_ro |
| 32 | Webhook dedupe key is sha256 of item_id, code and body. Plaid `SYNC_UPDATES_AVAILABLE` bodies can repeat byte for byte, so a real second event is dropped. Daily sweep hides it | Spec 2.2 step 3 | Logic | Exempt sync codes from dedupe. Sync is idempotent anyway |
| 33 | Append-only trigger covers UPDATE and DELETE only. TRUNCATE bypasses it. `audit_row` is security definer with no `set search_path` | Data-Model 4. Security AU1 | Postgres semantics | Add a `before truncate` statement trigger. Add `set search_path = ''` |
| 34 | `owner_id default auth.uid()` is null under service role and pg_cron. No owner uuid constant exists anywhere | Data-Model 1, 9. Architecture 2.3 | Logic | One owner id in Vault or settings, set explicitly by every job |
| 35 | Connections shows "5 of 10" slots. Plaid exposes no slot count. Items linked from Dashboard or Quickstart burn slots unseen | UI-UX 3.13. Spec 9 P1 acceptance | Memory | Local count including removed Items, labelled as local |
| 36 | PII scrubber test "log line with amount is rejected". A pattern cannot tell a count of 42 from an amount of 42 | Security L1 | Logic | Field allowlist logger. Test that a disallowed field name is dropped |
| 37 | Instant alert test asserts "no digits". A deep link with a uuid contains digits | Security N1 | Logic | Assert no amount pattern and no merchant string, allow ids |

## 4. Gaps

| # | Gap | Sources |
|---|---|---|
| 38 | `v_net_worth_daily` sums `balance_snapshots` only. Property values, manual loans, 401k and HSA are absent unless something writes snapshots for them. No forward fill, so a missing row understates net worth. Balance sign for credit and loan is undefined, the view guesses with `-abs()` | Data-Model 10 |
| 39 | Storage path scheme. RLS is "by owner_id path prefix" while IBKR writes `imports/ibkr/YYYY-MM-DD.xml` with no prefix | Architecture 2.4, 3.2 |
| 40 | Type 1 "balances only" in P1 has no defined write. `balance_snapshots.source` is free text | Spec 9 P1. Data-Model 5 |
| 41 | `loan_match` and `transfer_match` both claim a mortgage payment. Order undefined. Split level transfer needs `splits.is_transfer`, which does not exist. `transfer_pair_id` has no FK | Spec 2.4, 2.6. Data-Model 5 |
| 42 | Missing FKs on `entities.property_id`, `recurring_series.loan_id`, `goals.loan_id`, `receipts.import_batch_id`, `rental_statements.import_batch_id` | Data-Model 5, 6, 8 |
| 43 | `import_rows on delete cascade` erases provenance of committed rows. Conflicts with "never hard delete financial rows" | Data-Model 1, 9 |
| 44 | `accounts.type 'manual'` overlaps `accounts.source 'manual'`. Balance sheet groups Retirement and Real estate have no type value | Data-Model 5. UI-UX 3.7 |
| 45 | `budget_actuals` view is named with no DDL. Must carry `security_invoker` | Spec 4 |
| 46 | No data source for benchmark prices, expense ratios or `nights_available` | UI-UX 3.8, 3.9. Data-Model 7, 8 |
| 47 | Backup bucket provider undecided. Cost row says $0 to $12 | Spec 10 |
| 48 | Owner bootstrap is undocumented. Sign-ups are disabled, the wizard assumes an account exists | Spec 8.2. UI-UX 3.15 |
| 49 | `get_plaid_token` revokes from public but never grants execute to service_role | Data-Model 11 |
| 50 | `weekly_digest` is stored in `insights`, where severity is not null. No value defined | Spec 7.2. Data-Model 9 |
| 51 | `apps/web/` implies a workspace, no workspace file exists. Root `parsers/` is imported from `apps/web/server/`. Commands assume a single package | Spec 12.1. Finance CLAUDE.md commands |
| 52 | Supabase Free allows two projects. Production plus restore drill fits. Any branch or second environment does not | Architecture 5. Security 5 |
| 53 | Dates are "`date` in America/New_York". Supabase databases default to UTC. `current_date` or `now()::date` between 20:00 and midnight ET returns tomorrow. No doc says whether to set the database timezone or convert in adapters | Data-Model 1. Spec 0 |

## 5. Unverified, consolidated

From the docs themselves.

| Item | Source | Next check |
|---|---|---|
| Structured outputs parameter name | Spec 7.7. Memory | Current Anthropic SDK reference at build |
| Recurring Transactions on Trial | Spec 2.2 | Plaid Dashboard product list |
| Supabase MCP execution role | Memory | Not needed, spec uses analyst_ro |
| IBKR Flex rate limit 1 per second, 10 per minute | Spec 2.3 | IBKR Flex Web Service guide |
| Brokerage link quirks | Spec 2.2 | First production link |
| OAuth delay 24 hours after Trial | Memory | First production link |
| Plaid post-Trial pricing | Spec 10 | Screenshot in Production request flow |
| HSA and 401k text layer | Memory | First import |
| New PM statement format | Memory | Ask manager in October |

Added by this review.

| Item | Ref | Next check |
|---|---|---|
| pg_cron timezone on Supabase | #25 | `show cron.timezone` on local stack |
| Pause activity definition | #26 | Watch for warning email in week one, external ping regardless |
| sharp HEIC support | #28 | Convert one HEIC in a Vercel preview |
| qpdf on Vercel | #29 | Spike a WASM build |
| `postgres` has bypassrls | #30 | Query `pg_roles` on local stack |
| Vercel request body cap 4.5 MB | #3 | Vercel Functions limits page |
| Vercel keeps running after caller disconnect | #24 | Test with a 10 s route called with a 2 s timeout |
| Vercel Authentication on Hobby previews | Security P1 | Vercel deployment protection page |
| Supavisor login for a custom role like analyst_ro | Data-Model 10 | Connect as analyst_ro through the pooler |
| Plaid Investments billing per Item | Spec 2.1 | Plaid pricing in Production request flow |
| RentCast free tier call limit | Spec 10 | RentCast pricing page |
| IBKR Flex token max validity 1 year | Spec 2.3 | Client Portal token screen |
| Anthropic Files API beta header still required | Architecture 3.3 | Anthropic Files API reference |

## 6. Suggested order to close

1. Section 1 repo ruling. Nothing else moves without it.
2. #1 migration naming, #21 token function, #22 role password, #33 truncate. These are in the first migration of build step 1.
3. #24 runner shape and #4 job secret. Build step 3.
4. #27 backup connection and #11, #12 restore drill. Build step 4 gates everything after it.
5. #3 upload path, #9 CSP, #10 browser client. Needed before Plaid Link in step 5.
6. Everything else during the phase that touches it.

## 7. Rulings needed from CKC

| # | Question | Recommendation |
|---|---|---|
| Q1 | Repo. New repo, subfolder here, or wrong repo attached | New repo. Two CLAUDE.md files in one tree will mislead every agent |
| Q2 | Migration names. Grant the `NNNN_name.sql` carve-out | Yes. PlaneSpotter already proved the dashed form is silently skipped |
| Q3 | Plaid Link CSP. Allow the Plaid origin as the one third-party script | Yes, scoped to the Connections route |
| Q4 | Browser Supabase client, yes or no | No. Server actions only, then #10 holds as written |
| Q5 | Upload path. Direct to Storage, or cap size at 4.5 MB | Direct to Storage |
| Q6 | 24 hour session on Free | Enforce in middleware from session start, keep A3 |
| Q7 | Alerts settings screen, Inbox or Settings | Settings |
| Q8 | P1 Home, six cards with empty states or three cards | Three cards |

## 8. Verification log

Checked 2026-09-27 through the Supabase docs connector. Direct fetches of supabase.com and vercel.com were blocked by the session egress proxy, and the Vercel docs connector did not return the limits pages.

| Claim | Result | Source |
|---|---|---|
| Session time-box and inactivity timeout plan | Pro plans and up | https://supabase.com/docs/guides/auth/sessions |
| Refresh token reuse detection default | On, 10 second reuse interval | https://supabase.com/docs/guides/auth/sessions |
| pg_net `http_post` default timeout | 2000 ms. Chat review said 5 s, corrected here | https://supabase.com/docs/guides/database/extensions/pg_net |
| Database default timezone | UTC | https://supabase.com/docs/guides/database/postgres/configuration |
| Free direct connection IP version | IPv6. Supavisor is IPv4. GitHub Actions and Vercel listed as IPv4 only | https://supabase.com/docs/guides/database/connecting-to-postgres and https://supabase.com/docs/guides/platform/ipv4-address |
| JWT claims setting name | `request.jwt.claims` as JSON, `role` claim holds `service_role` | https://supabase.com/docs/guides/realtime/authorization and https://supabase.com/docs/guides/auth/jwt-fields |
| Free project pausing trigger | Low user database activity over 7 days | https://supabase.com/docs/guides/platform/free-project-pausing |
| Hyphenated migration skipped by CLI | Verified in PlaneSpotter on 2026-09-20 | PlaneSpotter CLAUDE.md section 6 |

## 9. Known weaknesses of this review

- No SQL was executed. #30, #31 and #33 rest on Postgres semantics from memory.
- #3 and #24 depend on Vercel limits not fetched in this session.
- #35 assumes Plaid has no slot count endpoint. Not checked against the current Plaid API reference.
- Proposed resolutions are recommendations, not rulings. None of the source docs were edited.
