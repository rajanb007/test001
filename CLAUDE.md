# PlaneSpotter, project memory

| Field | Value |
|---|---|
| File role | Session memory for coding agents. Facts, status, open decisions. No build rules here, those live in AGENTS.md |
| Author | CKC |
| Version | 2.6 |
| Date | 2026-09-19 |
| Update rule | Agents edit sections 4 and 6 only, at end of session. All other sections change only through a CKC-approved doc revision |

## 1. What this is

PlaneSpotter is a planespotting social app, iOS and Android, plus a thin public web layer and a minimal admin console. The core object is the airframe, a persistent aircraft identity that accumulates community sightings over time. One product loop, a user photographs an aircraft, the sighting attaches to that airframe's permanent history, another user who follows that airframe gets one push alert and returns.

The Validation MVP exists to answer one question. Will people contribute to a shared aircraft history and return because other people keep adding to the same airframes.

North Star metric, Airframe Triggered Return Rate. Among users following a specific airframe with a provider-receipt-confirmed alert, the percentage returning to the sighting or Aircraft Passport within 24 and 72 hours. Total registered users is never the North Star. Archive content never counts.

Working name is PlaneSpotter. Store name, wordmark, icon and domain are undecided, see section 6.

## 2. Domain and brand context

- Domain, hobbyist planespotting. Users stand at airport fences with cameras, outdoors, one hand free, in direct sun. Registration, the painted tail identifier, is how spotters name aircraft. Per-airframe photo histories exist elsewhere, Planespotters.net has them. This product's claim is the mobile loop, capture at the fence, credit, follow one airframe, one alert when it is seen again, return. That no competitor ships this loop is a hypothesis, not verified.
- Community norms, provenance matters, duplicates are frowned on, location of private and sensitive aircraft is a real safety concern. Moderation is expected, not resented.
- Voice, plain, specific, spotter-literate, zero hype. No exclamation marks. Sentence case. Newcomers are never tested.
- Aesthetic, calm expressive. Dark theme default, photo first, chrome recedes, registration is the typographic protagonist in monospace. Bold color only on Follow, Spot and Capture.
- Terminology, Sighting not post, Spot not like, Follow not subscribe, Aircraft Passport not profile, Registration in UI not airframe, Archive not imported. Full table in docs/DESIGN.md section 7.

## 3. Document map and conflict order

| Doc | Role | Authority |
|---|---|---|
| docs/PlaneSpotterMVP-v1.3.2.md | Product scope, in repo | Scope authority |
| docs/PlaneSpotterBuildPack-v1.8.md | Full build instruction pack, in docs/ | Build authority, wins all conflicts. Carve-out, docs/DESIGN.md owns token hex under D1 |
| docs/PlaneSpotterDesignSpec-v1.0.md | Design rationale, in repo | Background |
| AGENTS.md | Build rules for agents, condensed | Binding, defers to BuildPack on conflict |
| docs/SPEC.md | Architecture, schema summary, contracts, UI frame | Reference, defers to BuildPack |
| docs/DESIGN.md | Frozen tokens, components, microcopy | Binding for visuals, wins over DesignSpec v1.0 on token hex values, D1 |
| docs/PRD.md | Condensed product requirements | Reference, defers to MVP v1.3.2 |
| docs/user-profiles.md | Archetypes and scenarios | Reference |

Conflict order. BuildPack, then MVP v1.3.2 on scope, then DESIGN.md on visuals, then everything else. Decision priority when two valid implementations conflict, safety and privacy, data integrity, recoverability, accessibility, thesis clarity, speed, visual polish.

## 4. Current status

| Item | State |
|---|---|
| Phase | Phase S, Blocks 1 to 5 of 6 partly done. Server side complete through storage and the push chain; the device half of Block 5 needs hardware |
| Current doc set | BuildPack v1.8, MVP v1.3.2, DesignSpec v1.0, repo doc set v2.5; corrections requested by user on 2026-09-19 |
| Pending doc revision | None for the requested correction set. Static package checks recorded in docs/VALIDATION.md; implementation and phase gates remain unpassed |
| Token freeze | Frozen at DESIGN.md v1.0, ruling D1. tokens.ts generated from section 2.4, CI fails on drift. All 62 documented ratios recomputed, one defect found in the dark error row, see section 6 |
| Phase S exit gates | 0 of 7 passed. Gate 2 identity and concurrency pass live. Gate 7 passes against real Supabase Storage, still needs a rerun on the completed Phase 0 pipeline. Gate 3 is exercised end to end in SQL but needs one real Expo push on a device. Gates 1, 4, 5, 6 need hardware, a NativeTabs spike, a benchmark in the real Edge runtime, and a cohort |
| Repo | pnpm workspaces. apps/mobile and apps/web still empty manifests. packages/shared holds tokens, contrast, types, events, schemas and the registration validator. CI runs format, lint, typecheck, prefix drift, token drift and tests |
| Migrations | 0001 to 0018. Tables, RLS, grants, then the transition helper, create_submission, resolve_airframe, the publication stage machine and the Phase S fixture harness. Applied clean from empty repeatedly |
| Verification | 621 tests, 438 static plus 183 live. Blocks 1 to 5 reviewed 2026-09-20, ten defects found and fixed, each with a regression test. Live layer runs as anon and authenticated against Postgres and against PostgREST with a real anon key. Grants verified against the engine, not the SQL text. CI runs the static layer only, the live layer skips without a stack |
| Supabase | Unparked 2026-09-20, local Docker stack, zero cost. No hosted project provisioned. pnpm run db:start, db:reset, test:live |
| Branches | main, phase-s, feature branches off phase-s per AGENTS.md section 6. Default branch and protection not yet set in GitHub settings |
| Storage | originals and pending private, derivatives public read. Buckets and policies in migration 0016, exercised by live tests against real objects |
| Known gap | No terminal failure path for publish jobs. An uncommittable job is re-claimed at lease expiry rather than moving to failed. Needs the cleanup stage, which BuildPack section 5.5 places in Phase 0 |
| Fixture harness | Phase S only, migration 0015. Confined to app_fixture_ names, service-role only, audit rows tagged fixture true. Phase 0 deletes it and adds authorize_submission |
| Open defect | DESIGN.md section 2.1 dark error row prints three wrong ratios. Hex is safe, all pairings pass, printed values understate. See packages/shared/README.md |
| Open defect | PostGIS is client writable. anon holds INSERT, UPDATE, DELETE and TRUNCATE on public.spatial_ref_sys through the image's own grants, reachable over REST with the publishable key. Reproduced over HTTP. No migration can fix it. See supabase/README.md |
| Cohort recruiting | Not started, outreach draft not written |
| Hub airports | Archetypes defined, real airports not picked |
| NativeTabs | Undecided, spike pending. Scaffold defaults to the JS tabs fallback until gate 4 passes |
| Processing platform | Undecided, gate 5 pending. process-media scaffolds as an Edge Function, worker fallback stays open |

## 5. Decision log summary

Full text in docs/PlaneSpotterBuildPack-v1.8.md section 12 and docs/PlaneSpotterDesignSpec-v1.0.md section 14.

| ID | One line | Status |
|---|---|---|
| R1 | Pre-build spike as Phase S, production code in real monorepo | CKC ruled |
| R2 | Usability cohort pre-build, 5 contributors plus 5 collectors, 8 scenarios, 80 percent thresholds | CKC ruled |
| R3 | MVP v1.3.2 is scope authority, contributor profile stands | CKC ruled |
| R4 | Install attribution Android Install Referrer only, iOS blind spot accepted | CKC ruled |
| R5 | Non-US registrations, three resolution tiers, FAA RAD, OpenSky, user stub with ICAO prefix check | CKC ruled 2026-09-18 |
| D1 | Token freeze with contrast-corrected hexes plus new semantic token buttonLabelOnAccent, DESIGN.md owns hex values | CKC ruled 2026-09-18 |
| D2 | Hairline borders exempt from 3 to 1 non-text contrast, decorative per WCAG 1.4.11, no component relies on border as sole affordance | CKC ruled 2026-09-18 |
| A1 | Performance budgets are numeric release gates | Adopted |
| A2 | Canonical event taxonomy is the only analytics surface | Adopted |
| A3 | SaveConfirmation, ArchiveBadge, VerificationState, InlineEducation required | Adopted |
| A4 | Post-publish routes to Passport, offline gets SaveConfirmation only | Adopted |
| A5 | Capture flow 4 UI steps, 5 telemetry milestones | Adopted |
| A6 | Alerts tab kept for beta, 20 percent rolling 7-day demotion rule | Adopted |
| A7 | Two-stage hub gates, activation then promotion | Adopted |
| A8 | Pro fake door, passive Settings row, active surfacing after repeat value | Reconciled |
| A9 | Decision priority order | Adopted |
| A10 | Standalone hi-fi prototype phase | Rejected |
| T1 | Earlier estimate, 16 to 21 weeks full-time solo | Historical; current calendar is restated T2 |
| T2 | Real capacity 20 to 30 hours per week, planning basis 25, calendar 26 to 34 weeks, Phase S 5 to 6 weeks. Phase 0 pressure of 80 to 120 hours noted, not folded in | Held 2026-09-19, recalculate at Phase S exit |
| R6 | Alert eligibility requires taken_at within 7 days of publish, freshness separate from provenance | CKC ruled 2026-09-19 |
| R7 | Submission-first write path, sightings exist only after publish, airframe_id never null | CKC ruled 2026-09-19 |
| R8 | Canonical Passport route is airframe id, registration is a discovery alias with disambiguation | CKC ruled 2026-09-19 |
| R9 | Provider receipt is acceptance not delivery, state is provider_accepted, nothing is called delivered | CKC ruled 2026-09-19 |
| R10 | Users anonymized never hard deleted, audit rows survive | CKC ruled 2026-09-19 |
| R11 | Rejected submissions reopen in place, cap 3, photo immutable, prior values snapshotted | CKC ruled 2026-09-19 |
| R12 | moderation_actions never cascades, users.id restricts auth deletion | Adopted 2026-09-19 |
| A11 | Onboarding follows fan out alerts, created_via affects only the permission moment | Adopted 2026-09-19, CKC may override |
| R13 | Public derivative keys carry a per-job nonce, undiscoverable until commit, never reused | Adopted 2026-09-19 |

Corrections requested on 2026-09-19: revision-bound authorization, parked jobs, manifest-before-copy cleanup, pending-only fanout and one fenced recovery retry. Implementation detail is binding in BuildPack sections 5.5 and 6.2; R13 and product scope are unchanged.

## 6. Open decisions

| Decision | Owner | Blocks |
|---|---|---|
| App name, wordmark, icon, domain | CKC | Share card, store assets, ambassador outreach, public web |
| Hub airports, two or three, first hub GA or domestic heavy per R5 rationale | CKC | Cohort recruiting, onboarding seed content |
| Ambassador outreach draft | CKC | Phase S gate 6 recruiting |
| NativeTabs adopt or JS fallback | Spike | Phase S gate 4 |
| O1, Stage 2 thesis gate thresholds, opportunity rate, return rate, minimum events, window, repeat contribution, founder hours, continue revise stop | CKC | Beta week 1, which has no date. Placeholder table in BuildPack v1.8 section 8.5 |
| Beta calendar, Phase S start date and beta week 1 date | CKC | O1 deadline, ambassador outreach dates |
| Kill criteria after Phase S, what result ends the project before beta | CKC | Nothing today, everything later. Reviewer and founder both flagged, still open |
| Competitor loop claim, no competitor ships mobile capture plus follow plus alert plus credit | CKC | Hypothesis. Feature matrix against Planespotters.net, JetPhotos, FR24 before any external use |
| Processing platform, Edge Function or worker, decided by Phase S benchmark | Spike | Phase S gate 5 |
| Fresh DSLR to phone weekly workflow, does it exist for real contributors | CKC | Ambassador supply assumption |
| Ambassador operating plan, benefit, commitment, onboarding support, first target | CKC | Phase S gate 6 recruiting |
| Pro price hypothesis for fake door | CKC | Phase 3 |
| Cost model at 1k and 10k MAU | CKC | Phase 3 hub promotion |
| Blurhash variant in derivative pipeline | Engineering | Phase 1 |
| OpenSky aircraft DB license and attribution terms | CKC | Phase 0, first import-opensky production run |
| registration-prefixes.ts final sign-off against ICAO Annex 7, secondary-source cross-check done 2026-09-19 | CKC | Phase 0 gate 4 |
| Argentina LQ prefix, state aircraft, confirm with ANAC or drop | CKC | Phase 0 gate 4 |
| Capture tab raised circle feasibility per platform | Engineering | Phase 1, cosmetic |
| Supabase project provisioning, local stack or hosted, and who pays | CKC | Every Phase S exit gate, Phase 0 gate 1 |
| Migration file naming carve-out in AGENTS.md section 4. Verified 2026-09-20, a hyphenated migration is silently skipped by the CLI, not rejected. Recommendation, keep NNNN_name.sql and document the exception | CKC | Doc revision only, nothing blocked |
| PostGIS placement. anon can write and delete public.spatial_ref_sys over REST with the publishable key. Unfixable from a migration, postgres is not a member of supabase_admin. Options and measured blast radius in supabase/README.md | CKC | Phase 0 release. Accepted risk for internal Phase S if CKC rules so |
| updated_at on airframes only. Withdrawn for submissions and publish_jobs, their RPCs and workers set it in Block 4 with no schema change. Phase 0 importers write airframes in bulk | CKC | Phase 0 |
| BuildPack section 2.1 places BuildPack.md at the repo root while the doc set lives in docs/. Read as a stale line, not a ruling | CKC | Nothing today, doc hygiene |
| DESIGN.md section 2.1 dark error row, correct 6.86, 6.22 and 5.54 to the computed 7.48, 6.77 and 6.02 for the frozen hex #EE8580. Token freeze itself is unaffected, the values understate and every pairing passes | CKC | Doc revision only, nothing blocked |
| resolve_airframe takes an optional third argument p_submission_id. The documented two-argument call still works. SPEC section 3.4 needs it, the ambiguous branch must write import_conflicts with submission_id | CKC | Doc revision only, nothing blocked |
| SPEC section 3.4 is silent on taken_at falling in a gap or after every valid_to where history exists. Implemented as quarantine, per decision priority data integrity over speed | CKC | Phase 0 resolution work |

## 7. Learnings, do not relearn

- Entity resolution. Registration-only matching without reassignment history creates false merges. Never auto-merge, quarantine conflicts for a human.
- Identity over time. Matching on current holder ignores when the photo was taken. Resolution must use taken_at against validity ranges, and Passport URLs must be airframe ids not registrations. Found in external review 2026-09-19.
- Write path shape. A sighting that can exist before identity is settled forces nulls through every downstream query. Submissions first, sightings only after publish.
- Notifications are the thesis mechanic, not a nice-to-have. Deferring them broke validation logic in an earlier spec revision.
- Minimal contributor profile is required, not deferrable. Contributors need a home for their work or they do not contribute.
- Backfilled content is visible with an Archive label and invisible to every KPI. Mixing it in contaminates the thesis answer.
- Concierge backfill exists because DSLR photographers will not phone-upload their archive. Intake mechanism is a CSV manifest plus private bucket, Phase 3.
- The light theme accent was never viable as text. Verified by ratio, not by eye. Run ratios before freezing anything.
- Receipt is not delivery. Expo receipts confirm APNs or FCM acceptance. Naming a state delivered corrupts the North Star denominator.
- Freshness is not provenance. Native upload of an old photo must not fire spotted again.
- Storage is not in the transaction. Supabase object copy and delete are HTTP calls. Publication must be staged with the SQL commit last.
- A state check is not a lock. Claim with an atomic update returning the row or exit.
- Public bucket URLs outlive projection changes. Revocation is object deletion, tested by 404 on the old URL.
- Prose that names a column is a schema claim. Every field referenced in a contract must exist in the SQL block or the doc is lying. Third review caught two.
- Reconstructing a file from memory reintroduced two lines that earlier reviews had already removed. After any rebuild, grep for every term the last review told you to delete.

## 8. People and capacity

- CKC, founder, solo builder, 20 to 30 hrs per week alongside consulting.
- No other contributors. Ambassadors are testers and content seeders, not builders.
