/**
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

export const dark = {
  bg: '#0E1116', surface1: '#171C23', surface2: '#1F2630', surface3: '#2A3340',
  border: '#2E3743',
  textPrimary: '#E9ECEF', textSecondary: '#A6AFBA', textTertiary: '#8E98A4',
  accent: '#E6A23C', accentPressed: '#C98A2E', buttonLabelOnAccent: '#0E1116',
  success: '#57C785', warning: '#E0B34C', error: '#EE8580', info: '#6BA6E8',
};
export const light = {
  bg: '#F7F8FA', surface1: '#FFFFFF', surface2: '#F0F2F5', surface3: '#FFFFFF',
  border: '#DDE2E8',
  textPrimary: '#1B2129', textSecondary: '#4E5866', textTertiary: '#667080',
  accent: '#8F5A0E', accentPressed: '#7A4C0B', buttonLabelOnAccent: '#FFFFFF',
  success: '#1B7A47', warning: '#7F5F0F', error: '#B83E37', info: '#2D6FBD',
};
export const type = {
  display: { size: 28, weight: '700' }, title: { size: 22, weight: '600' },
  reg: { size: 17, weight: '700', mono: true },
  regLarge: { size: 24, weight: '700', mono: true },
  headline: { size: 17, weight: '600' }, body: { size: 15, weight: '400' },
  caption: { size: 13, weight: '400' }, micro: { size: 11, weight: '500' },
};
export const space = [4, 8, 12, 16, 24, 32];
export const radius = { card: 16, sheet: 20, button: 12, chip: 8 };
export const minTarget = 44;

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
