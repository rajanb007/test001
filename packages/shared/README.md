# packages/shared

Tokens, types, events and schemas shared by mobile and web. BuildPack v1.8
section 2.1.

| File                           | Role                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| `tokens.ts`                    | **Generated** from `docs/DESIGN.md` section 2.4. Frozen under D1        |
| `generate-tokens.ts`           | The generator. CI fails on drift                                        |
| `contrast.ts`                  | WCAG relative luminance and contrast ratio                              |
| `types.ts`                     | Domain enums, checked against `supabase/migrations/0002_enums.sql`      |
| `events.ts`                    | The only path to analytics. Redaction is enforced here                  |
| `schemas.ts`                   | Zod schemas for the section 5.1 RPC payloads                            |
| `registration-prefixes.ts`     | **CKC authored.** Validator v2, never reformatted                       |
| `registration-prefixes.json`   | **CKC authored.** The single source for the validator and the migration |
| `generate-prefix-migration.ts` | **CKC authored.** Emits migration 0010                                  |

## Two files are generated, neither is edited

`tokens.ts` comes from `docs/DESIGN.md`, which owns the hex values under ruling
D1. `supabase/migrations/0010_registration_prefixes_seed.sql` comes from
`registration-prefixes.json`. Both are in `.prettierignore`, because
reformatting them would break the drift checks that compare the committed file
to fresh generator output.

```bash
pnpm run tokens:generate > packages/shared/tokens.ts
pnpm run prefixes:generate > supabase/migrations/0010_registration_prefixes_seed.sql
```

The reason tokens are generated rather than typed is in `CLAUDE.md` section 7:
rebuilding a file from memory once reintroduced two lines earlier reviews had
removed.

## Contrast is proved, not asserted

`tokens.test.ts` recomputes every ratio printed in `docs/DESIGN.md` sections
2.1 and 2.2 from the hexes with the WCAG relative luminance formula, and checks
every pairing the system uses against its threshold. It also encodes the two
documented tertiary exceptions and ruling D2's border exemption, so neither can
quietly widen.

**Documentation defect found by this, 2026-09-20, open for CKC.** The dark
`error` row in section 2.1 prints 6.86, 6.22 and 5.54 for `bg`, `surface1` and
`surface2`. The frozen hex `#EE8580` actually gives 7.48, 6.77 and 6.02. Only
the `surface3` cell, 5.04, is right.

The hex is safe. All four pairings clear 4.5 to 1 with margin and no component
is at risk, so nothing needs to change in code. Only the printed table is
wrong, and it understates.

It is provably wrong rather than rounding. For a foreground lighter than every
surface, `ratio(fg, S) = (Lf + 0.05) / (LS + 0.05)`, so `ratio_on_bg` divided
by `ratio_on_S` depends only on the surfaces. Those constants are 1.1048,
1.2411 and 1.4823. Every other row in both tables reproduces them. The `error`
row implies 1.1029, 1.2383 and 1.3611, so its cells cannot all describe one
colour. It reads like a partial update after the hex changed, which is the
failure `CLAUDE.md` section 7 already warns about. An agent may not edit `docs/`
without an approved revision, AGENTS.md section 9.4, so it is recorded and not
fixed.

## Analytics

`EVENT_NAMES` is exhaustive, BuildPack section 8.1. `buildEvent` throws on a
name outside it, ruling A2. `redact` strips every prohibited key at any depth
and drops any URL value whatever the key is called, because a private media URL
under an innocent name is the same leak as one under an obvious name. Enforcing
it in the wrapper rather than at call sites is deliberate: a call site only has
to be wrong once.

## Not here yet

`ThemedText`, the variant typing that refuses tertiary tone on `surface3` in
dark and `surface2` in light at compile time, is a mobile component and lands
with the app in Block 5. The tokens and the exceptions it encodes are ready for
it.
