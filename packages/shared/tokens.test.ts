/**
 * Proves the frozen tokens by arithmetic, not by eye.
 * Author CKC. Version 1.0.
 *
 * Three things are checked. The committed tokens.ts still matches
 * docs/DESIGN.md section 2.4. Every ratio printed in sections 2.1 and 2.2 is
 * what the WCAG formula actually returns for those hexes. Every pairing the
 * system uses clears its threshold.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RATIO_BODY, RATIO_LARGE, contrastRatio, contrastRatioRounded } from './contrast.js';
import { dark, light } from './tokens.js';

const root = join(import.meta.dirname, '..', '..');

describe('tokens.ts is generated from docs/DESIGN.md and has not drifted', () => {
  it('matches the section 2.4 fence', () => {
    const generated = execFileSync(
      'pnpm',
      ['exec', 'tsx', join(root, 'packages', 'shared', 'generate-tokens.ts')],
      { cwd: root, encoding: 'utf8' },
    );
    const committed = readFileSync(join(root, 'packages', 'shared', 'tokens.ts'), 'utf8');
    expect(committed).toBe(generated);
  });
});

/**
 * The ratios docs/DESIGN.md section 2.1 records, transcribed as claims to be
 * checked. If a hex changes under a future D1 revision without the table being
 * updated, one of these fails and names the pairing.
 */
const DARK_RATIOS: ReadonlyArray<[keyof typeof dark, keyof typeof dark, number]> = [
  ['border', 'bg', 1.57],
  ['border', 'surface1', 1.42],
  ['border', 'surface2', 1.27],
  ['textPrimary', 'bg', 15.95],
  ['textPrimary', 'surface1', 14.44],
  ['textPrimary', 'surface2', 12.85],
  ['textPrimary', 'surface3', 10.76],
  ['textSecondary', 'bg', 8.52],
  ['textSecondary', 'surface1', 7.71],
  ['textSecondary', 'surface2', 6.87],
  ['textSecondary', 'surface3', 5.75],
  ['textTertiary', 'bg', 6.46],
  ['textTertiary', 'surface1', 5.85],
  ['textTertiary', 'surface2', 5.21],
  ['textTertiary', 'surface3', 4.36],
  ['accent', 'bg', 8.64],
  ['accent', 'surface1', 7.82],
  ['accent', 'surface2', 6.96],
  ['accent', 'surface3', 5.83],
  ['success', 'bg', 8.93],
  ['success', 'surface1', 8.08],
  ['success', 'surface2', 7.19],
  ['success', 'surface3', 6.02],
  ['warning', 'bg', 9.66],
  ['warning', 'surface1', 8.74],
  ['warning', 'surface2', 7.78],
  ['warning', 'surface3', 6.51],
  // docs/DESIGN.md section 2.1 records 6.86, 6.22 and 5.54 for the first three.
  // Those are wrong for the frozen hex #EE8580, see the documentation defect
  // block at the end of this file. The real values are asserted here, and the
  // defect understates contrast, so nothing is at risk.
  ['error', 'bg', 7.48],
  ['error', 'surface1', 6.77],
  ['error', 'surface2', 6.02],
  ['error', 'surface3', 5.04],
  ['info', 'bg', 7.42],
  ['info', 'surface1', 6.72],
  ['info', 'surface2', 5.98],
  ['info', 'surface3', 5.01],
];

/** The ratios docs/DESIGN.md section 2.2 records. Light has no surface3 column. */
const LIGHT_RATIOS: ReadonlyArray<[keyof typeof light, keyof typeof light, number]> = [
  ['border', 'bg', 1.23],
  ['border', 'surface1', 1.3],
  ['border', 'surface2', 1.16],
  ['textPrimary', 'bg', 15.25],
  ['textPrimary', 'surface1', 16.2],
  ['textPrimary', 'surface2', 14.45],
  ['textSecondary', 'bg', 6.79],
  ['textSecondary', 'surface1', 7.21],
  ['textSecondary', 'surface2', 6.43],
  ['textTertiary', 'bg', 4.71],
  ['textTertiary', 'surface1', 5.01],
  ['textTertiary', 'surface2', 4.46],
  ['accent', 'bg', 5.43],
  ['accent', 'surface1', 5.77],
  ['accent', 'surface2', 5.15],
  ['success', 'bg', 5.04],
  ['success', 'surface1', 5.36],
  ['success', 'surface2', 4.77],
  ['warning', 'bg', 5.57],
  ['warning', 'surface1', 5.92],
  ['warning', 'surface2', 5.28],
  ['error', 'bg', 5.22],
  ['error', 'surface1', 5.55],
  ['error', 'surface2', 4.95],
  ['info', 'bg', 4.8],
  ['info', 'surface1', 5.1],
  ['info', 'surface2', 4.54],
];

describe('dark theme ratios match docs/DESIGN.md section 2.1', () => {
  it.each(DARK_RATIOS)('%s on %s is %f to 1', (fg, bg, expected) => {
    expect(contrastRatioRounded(dark[fg], dark[bg])).toBeCloseTo(expected, 1);
  });
});

describe('light theme ratios match docs/DESIGN.md section 2.2', () => {
  it.each(LIGHT_RATIOS)('%s on %s is %f to 1', (fg, bg, expected) => {
    expect(contrastRatioRounded(light[fg], light[bg])).toBeCloseTo(expected, 1);
  });
});

/** Text tokens must clear body contrast. border is exempt under D2. */
const TEXT_TOKENS = [
  'textPrimary',
  'textSecondary',
  'textTertiary',
  'accent',
  'success',
  'warning',
  'error',
  'info',
] as const;

describe('every text token clears 4.5 to 1 on every surface it is allowed on', () => {
  // textTertiary is barred from surface3 in dark and surface2 in light by the
  // notes under sections 2.1 and 2.2. Those pairings are excluded here and
  // asserted separately below, so the exclusion cannot quietly widen.
  const darkSurfaces = ['bg', 'surface1', 'surface2', 'surface3'] as const;
  const lightSurfaces = ['bg', 'surface1', 'surface2'] as const;

  it.each(
    TEXT_TOKENS.flatMap((token) =>
      darkSurfaces
        .filter((surface) => !(token === 'textTertiary' && surface === 'surface3'))
        .map((surface) => [token, surface] as const),
    ),
  )('dark %s on %s', (token, surface) => {
    expect(contrastRatioRounded(dark[token], dark[surface])).toBeGreaterThanOrEqual(RATIO_BODY);
  });

  it.each(
    TEXT_TOKENS.flatMap((token) =>
      lightSurfaces
        .filter((surface) => !(token === 'textTertiary' && surface === 'surface2'))
        .map((surface) => [token, surface] as const),
    ),
  )('light %s on %s', (token, surface) => {
    expect(contrastRatioRounded(light[token], light[surface])).toBeGreaterThanOrEqual(RATIO_BODY);
  });
});

describe('the two documented tertiary exceptions are real and bounded', () => {
  it('dark textTertiary on surface3 is below body and only used in dialogs, use secondary there', () => {
    const ratio = contrastRatioRounded(dark.textTertiary, dark.surface3);
    expect(ratio).toBeLessThan(RATIO_BODY);
    expect(ratio).toBeGreaterThanOrEqual(RATIO_LARGE);
  });

  it('light textTertiary on surface2 is below body and barred from inputs and chips', () => {
    const ratio = contrastRatioRounded(light.textTertiary, light.surface2);
    expect(ratio).toBeLessThan(RATIO_BODY);
    expect(ratio).toBeGreaterThanOrEqual(RATIO_LARGE);
  });
});

describe('ruling D1, the primary button label pairings', () => {
  it('dark button label on accent is 8.64, the value section 2.1 records', () => {
    expect(contrastRatioRounded(dark.buttonLabelOnAccent, dark.accent)).toBeCloseTo(8.64, 1);
  });

  it('dark button label on accentPressed clears body contrast', () => {
    expect(
      contrastRatioRounded(dark.buttonLabelOnAccent, dark.accentPressed),
    ).toBeGreaterThanOrEqual(RATIO_BODY);
  });

  it('light button label is white and clears body contrast, the v1.0 dark label did not', () => {
    expect(light.buttonLabelOnAccent).toBe('#FFFFFF');
    expect(contrastRatioRounded(light.buttonLabelOnAccent, light.accent)).toBeGreaterThanOrEqual(
      RATIO_BODY,
    );
  });

  it('the rejected v1.0 light pairing, dark label on the old accent, really did fail', () => {
    // docs/DESIGN.md section 2.2 records 4.30 for #B5761A with a dark label.
    expect(contrastRatioRounded(light.textPrimary, '#B5761A')).toBeLessThan(RATIO_BODY);
  });
});

describe('ruling D2, borders are decorative and below 3 to 1 by design', () => {
  it.each(['bg', 'surface1', 'surface2'] as const)('dark border on %s', (surface) => {
    expect(contrastRatioRounded(dark.border, dark[surface])).toBeLessThan(RATIO_LARGE);
  });

  it.each(['bg', 'surface1', 'surface2'] as const)('light border on %s', (surface) => {
    expect(contrastRatioRounded(light.border, light[surface])).toBeLessThan(RATIO_LARGE);
  });
});

describe('theme parity', () => {
  it('both themes carry the same semantic token names', () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });

  it('no pure black and no pure white background, binding rule 7.2.1', () => {
    expect(dark.bg).not.toBe('#000000');
    expect(light.bg).not.toBe('#FFFFFF');
  });
});

describe('documentation defect, docs/DESIGN.md section 2.1 error row', () => {
  // Found 2026-09-20 by recomputing the frozen table. Open for CKC, an agent
  // may not edit docs without an approved revision, AGENTS.md section 9.4.
  //
  // The frozen hex is safe. #EE8580 clears 4.5 to 1 on all four dark surfaces
  // with margin. Only the printed numbers are wrong, and they understate the
  // real contrast, so no component is at risk and no hex needs to change.
  //
  // It is provably wrong rather than a rounding slip. For a foreground lighter
  // than every surface, ratio(fg, S) = (Lf + 0.05) / (LS + 0.05), so the
  // quotient ratio_on_bg / ratio_on_S depends only on the surfaces. Every
  // other row in sections 2.1 and 2.2 reproduces those constants. The error
  // row does not, which means its cells cannot all describe one color. This is
  // the partial-update failure CLAUDE.md section 7 already warns about.

  const surfaces = ['bg', 'surface1', 'surface2', 'surface3'] as const;

  it('the frozen error hex passes body contrast on every dark surface', () => {
    for (const surface of surfaces) {
      expect(contrastRatioRounded(dark.error, dark[surface])).toBeGreaterThanOrEqual(RATIO_BODY);
    }
  });

  it('the bg to surface quotients are a property of the surfaces alone', () => {
    // Proved with accent, which section 2.1 records correctly.
    for (const surface of ['surface1', 'surface2', 'surface3'] as const) {
      const viaAccent =
        contrastRatio(dark.accent, dark.bg) / contrastRatio(dark.accent, dark[surface]);
      const viaInfo = contrastRatio(dark.info, dark.bg) / contrastRatio(dark.info, dark[surface]);
      expect(viaAccent).toBeCloseTo(viaInfo, 6);
    }
  });

  it('the printed error row cannot describe any single color', () => {
    const printed = { bg: 6.86, surface3: 5.04 };
    const structural =
      contrastRatio(dark.accent, dark.bg) / contrastRatio(dark.accent, dark.surface3);
    // A real color at 6.86 on bg would land near 4.63 on surface3, not 5.04.
    expect(printed.bg / structural).toBeCloseTo(4.63, 1);
    expect(printed.bg / printed.surface3).not.toBeCloseTo(structural, 1);
  });

  it('the printed values understate, they never overstate', () => {
    const printed: ReadonlyArray<[(typeof surfaces)[number], number]> = [
      ['bg', 6.86],
      ['surface1', 6.22],
      ['surface2', 5.54],
      ['surface3', 5.04],
    ];
    for (const [surface, claimed] of printed) {
      expect(contrastRatioRounded(dark.error, dark[surface])).toBeGreaterThanOrEqual(claimed);
    }
  });
});
