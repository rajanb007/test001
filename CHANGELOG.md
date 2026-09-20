# Change log

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
