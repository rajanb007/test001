/**
 * Generates packages/shared/tokens.ts from the frozen block in
 * docs/DESIGN.md section 2.4. Run in CI, fail the build if the committed
 * file differs from the generated one.
 * Author CKC. Version 1.0.
 *
 * The values are never typed by hand. CLAUDE.md section 7 records that
 * rebuilding a file from memory reintroduced two lines earlier reviews had
 * removed, and ruling D1 makes docs/DESIGN.md the authority on token hex.
 * Extracting the fence keeps the document the single source.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const design = readFileSync(join(import.meta.dirname, '..', '..', 'docs', 'DESIGN.md'), 'utf8');

const section = design.slice(design.indexOf('### 2.4 tokens.ts'));
const fence = /```ts\n([\s\S]*?)```/.exec(section);
if (fence === null || fence[1] === undefined) {
  throw new Error('docs/DESIGN.md section 2.4 has no ts code fence');
}

const body = fence[1].trimEnd().replace(/^export const /gm, 'export const ');

process.stdout.write(
  `/**
 * PlaneSpotter design tokens.
 * Author CKC. Version 1.0.
 *
 * GENERATED from docs/DESIGN.md section 2.4. Do not edit.
 * Regenerate with: pnpm run tokens:generate > packages/shared/tokens.ts
 *
 * Frozen under ruling D1, 2026-09-18. docs/DESIGN.md owns these hex values and
 * wins over DesignSpec v1.0. Changing one needs a CKC-approved doc revision,
 * AGENTS.md section 3. Feature components import the semantic names from here
 * and never write a raw hex, AGENTS.md section 4.
 *
 * Contrast is proved, not assumed. tokens.test.ts recomputes every ratio in
 * docs/DESIGN.md sections 2.1 and 2.2 from these hexes with the WCAG relative
 * luminance formula and fails if any drops below its threshold.
 */

${body}

/** A theme is dark or light. Both carry the same semantic token names. */
export type ThemeName = 'dark' | 'light';

/** Every semantic color token. Adding one needs a D1 revision. */
export type ColorToken = keyof typeof dark;

/** Every typography token. */
export type TypeToken = keyof typeof type;

export const themes = { dark, light } as const;

/**
 * Large text under WCAG is 18pt regular or 14pt bold. In this system only
 * regLarge at 24 bold and display at 28 bold qualify, docs/DESIGN.md section 2.
 * Everything else is body and needs 4.5 to 1.
 */
export const LARGE_TEXT_TOKENS = ['display', 'regLarge'] as const satisfies readonly TypeToken[];
`,
);
