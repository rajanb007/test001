# Package 2.5 validation

Date: 2026-09-19. Input: package v2.4. Output: package v2.5 with BuildPack v1.7.

These are static document and package checks. No PostgreSQL, app, storage integration or push-provider tests were executed. SQL snippets were checked for named fields and contract consistency, not compiled. Phase S remains 0 of 7 gates passed; Phase 0 remains 0 of 15 gates passed.

| Check | Result |
|---|---|
| No empty files | PASS |
| Active package and BuildPack versions synchronized | PASS |
| Referenced new schema fields exist | PASS |
| Job lifecycle stages equal SQL constraint; preflight not persisted | PASS |
| Every submission transition target exists in SQL enum | PASS |
| Normal fanout SQL cannot reclaim sending rows | PASS |
| Recovery claim increments and bounds retry, with age/lease/attempt guards | PASS |
| Current publication contract parks jobs and commits manifests before copy | PASS |
| Obsolete queue and rejected-media wording removed from active build instructions | PASS |
| Agent instructions preserve acceptance terminology and empty-row RLS rule | PASS |
| Active supporting references point to BuildPack 1.7 | PASS |
| Scope/design background and registration assets preserved byte-for-byte | PASS |
| Markdown code fences balanced | PASS |
| Owner column allowlist exists in schema and excludes caption, approval and worker internals | PASS |
| User mutation RPCs return explicit JSON, not submissions rows | PASS |
| Owner approval and moderation summary projections specified | PASS |
| Both advisory lock mechanisms and global acquisition order specified | PASS |
| Phase S has seven gates; Phase 0 keeps fifteen gates | PASS |
| Phase S tasks exclude authorize_submission; Phase 0 owns authorization and cleanup | PASS |
| T2 and supporting planning documents contain revised cost and calendar | PASS |
| No stale active BuildPack references | PASS |

## Correction traceability

| Finding | Changed contract | Required implementation evidence |
|---|---|---|
| Owner projection exposes moderator identity | BuildPack 4/5.1; SPEC 3/4; AGENTS 4/8 | Phase 0 gate 3: forbidden columns denied to owners, safe other-owner query empty; RPC approval boolean and sanitized audit summary, including retry responses |
| Policy/publication lock mechanism unspecified | BuildPack 5.5; SPEC 4; AGENTS 4 | Phase 0 gate 14: independent transactions contend on identical airframe/registration advisory keys in specified order; test both winners |
| Spike includes full fenced pipeline | BuildPack 5.5/9; AGENTS 5/8; CLAUDE status; SPEC 4 | Phase S happy path and gate 7 crash recovery; Phase 0 authorization, manifest cleanup and full fencing, including gates 12 to 14 |
| Phase 0 effort understated | BuildPack 9/12 T2; CLAUDE T2; PRD constraints | Estimate accepted for planning: added 80 to 120 hours, roughly 3 to 5 weeks at 25 hours/week, total roughly 30 to 39; Phase S stays 5 to 6 |

## Remaining execution gates

Implement and execute the phase-owned gates against real services. Owner field confidentiality, SQL compilation, advisory lock contention, authorization, crash recovery, storage cleanup, device, accessibility and push evidence remain unproven. The estimate is not a measured delivery result. Original scope/design background and registration assets remain unchanged; their historical estimates do not override restated T2.

## Package 2.6 validation, 2026-09-19

Input: reviewer package v2.5. Output: package v2.6 with BuildPack v1.8. Static checks only.

| Check | Result |
|---|---|
| No empty files | PASS |
| Six package docs at 2.6, BuildPack 1.8, no active reference to 1.7 outside history | PASS |
| No 30 to 39 figure outside history and pressure notes | PASS |
| No DesignSpec v1.1 reference anywhere | PASS |
| Sighting insert once, advisory locks, is_approved, owner allowlist all present | PASS |
| Seven background files byte identical to reviewer v2.5 | PASS |
| Registration validator 0 failures | PASS |
| Zip integrity and round trip | PASS |
