/**
 * Registration validator equivalence tests. Phase S task, BuildPack section 9,
 * "hyphenated and stripped forms resolve identically".
 * Author CKC. Version 1.0.
 *
 * The validator and the Postgres registration_prefixes table are generated
 * from one JSON source. These tests cover the TypeScript half; the migration
 * half is covered by scripts/check-prefix-drift.ts in CI.
 *
 * Final ICAO Annex 7 sign-off is CKC's, Phase 0 gate 4, and the Argentina LQ
 * row is still open. These tests assert the validator behaves as specified,
 * not that the data set is complete.
 */
import { describe, expect, it } from 'vitest';
import data from './registration-prefixes.json' with { type: 'json' };
import {
  matchPrefix,
  normalizeRegistration,
  validateRegistration,
} from './registration-prefixes.js';
import type { RegistrationPrefix } from './registration-prefixes.js';

const rows = (data as { rows: RegistrationPrefix[] }).rows;

describe('the JSON source is well formed', () => {
  it('has no duplicate prefixes', () => {
    const prefixes = rows.map((r) => r.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('carries a two letter ISO 3166-1 alpha-2 country on every row', () => {
    for (const row of rows) {
      expect(row.country).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('stores prefixes in stripped uppercase form', () => {
    for (const row of rows) {
      expect(row.prefix).toBe(normalizeRegistration(row.prefix));
    }
  });

  it('compiles every pattern it declares', () => {
    for (const row of rows) {
      if (row.pattern !== null) {
        expect(() => new RegExp(row.pattern as string)).not.toThrow();
      }
    }
  });

  it('anchors every pattern, an unanchored one would match a substring', () => {
    for (const row of rows) {
      if (row.pattern !== null) {
        expect(row.pattern.startsWith('^')).toBe(true);
        expect(row.pattern.endsWith('$')).toBe(true);
      }
    }
  });
});

describe('normalisation, contract rule 1', () => {
  it.each([
    ['g-abcd', 'GABCD'],
    ['G-ABCD', 'GABCD'],
    ['  g abcd  ', 'GABCD'],
    ['VP-CABC', 'VPCABC'],
    ['vpcabc', 'VPCABC'],
  ])('%s normalises to %s', (input, expected) => {
    expect(normalizeRegistration(input)).toBe(expected);
  });

  it('strips unicode dashes, not only the ASCII hyphen', () => {
    // A registration pasted from a PDF or a web page often carries U+2011 or
    // U+2013 rather than U+002D.
    expect(normalizeRegistration('G‑ABCD')).toBe('GABCD');
    expect(normalizeRegistration('G–ABCD')).toBe('GABCD');
  });
});

/**
 * The equivalence property the Phase S task names. Every row is exercised with
 * a suffix that suits its pattern, in both hyphenated and stripped form.
 */
const EQUIVALENCE_CASES: ReadonlyArray<[string, string]> = [
  ['G-ABCD', 'GABCD'],
  ['D-AIBL', 'DAIBL'],
  ['F-GKXA', 'FGKXA'],
  ['VP-CABC', 'VPCABC'],
  ['B-HABC', 'BHABC'],
  ['9V-SKA', '9VSKA'],
  ['VH-OQA', 'VHOQA'],
  ['JA-8089', 'JA8089'],
  ['C-FGAX', 'CFGAX'],
  ['PH-BFA', 'PHBFA'],
];

describe('contract rule 1, equivalent input forms resolve identically', () => {
  it.each(EQUIVALENCE_CASES)('%s and %s agree', (hyphenated, stripped) => {
    const a = validateRegistration(hyphenated);
    const b = validateRegistration(stripped);
    expect(a).toEqual(b);
  });

  it('agrees for lowercase and padded input too', () => {
    const canonical = validateRegistration('G-ABCD');
    expect(validateRegistration('  g-abcd ')).toEqual(canonical);
    expect(validateRegistration('gabcd')).toEqual(canonical);
  });

  it('holds for every row in the JSON, generated from its own prefix', () => {
    for (const row of rows) {
      if (row.pattern !== null) continue; // Patterned rows need a real suffix.
      const stripped = `${row.prefix}ABC`;
      const hyphenated = row.hyphen ? `${row.prefix}-ABC` : stripped;
      expect(validateRegistration(hyphenated)).toEqual(validateRegistration(stripped));
    }
  });
});

describe('contract rule 2, charset', () => {
  it.each(['', '   ', '-'])('%s is empty', (input) => {
    expect(validateRegistration(input)).toEqual({ ok: false, reason: 'empty' });
  });

  it.each(['G', 'N'])('%s is too short after normalisation', (input) => {
    expect(validateRegistration(input).ok).toBe(false);
  });

  it.each(['G.ABCD', 'G/ABCD', 'G_ABCD', 'GÅBCD'])('%s is rejected on charset', (input) => {
    expect(validateRegistration(input)).toEqual({ ok: false, reason: 'bad_charset' });
  });

  it('rejects anything longer than ten characters', () => {
    expect(validateRegistration('GABCDEFGHIJK')).toEqual({ ok: false, reason: 'bad_charset' });
  });
});

describe('contract rule 3, longest prefix wins and families disambiguate', () => {
  it('resolves mainland China from B plus digits', () => {
    const result = validateRegistration('B-2033');
    expect(result.ok && result.country).toBe('CN');
  });

  it.each([
    ['B-HABC', 'HK'],
    ['B-KABC', 'HK'],
    ['B-LABC', 'HK'],
    ['B-MABC', 'MO'],
  ])('%s resolves to %s', (input, country) => {
    const result = validateRegistration(input);
    expect(result.ok && result.country).toBe(country);
  });

  it('resolves VP-C to Cayman and leaves other VP families unknown', () => {
    const cayman = validateRegistration('VP-CABC');
    expect(cayman.ok && cayman.country).toBe('KY');
    expect(validateRegistration('VP-ZABC')).toEqual({ ok: false, reason: 'unknown_prefix' });
  });

  it('matches the longest prefix, not the first that fits', () => {
    const match = matchPrefix('9VSKA');
    expect(match?.prefix).toBe('9V');
  });
});

describe('contract rule 4, a bare prefix is never valid', () => {
  it.each(['G-', 'VP-C', 'B-H'])('%s has no suffix and is rejected', (input) => {
    expect(validateRegistration(input).ok).toBe(false);
  });
});

describe('patterned rows enforce their pattern', () => {
  it('accepts a real US registration', () => {
    const result = validateRegistration('N12345');
    expect(result.ok && result.country).toBe('US');
  });

  it.each(['N0123', 'N1234IO'])('%s fails the US format rule', (input) => {
    // Leading zero is invalid, and I and O are excluded to avoid confusion
    // with 1 and 0 on a painted tail.
    expect(validateRegistration(input)).toEqual({ ok: false, reason: 'bad_format' });
  });

  it('enforces the Canadian C-F, C-G or C-I rule', () => {
    expect(validateRegistration('C-FGAX').ok).toBe(true);
    expect(validateRegistration('C-ZGAX')).toEqual({ ok: false, reason: 'bad_format' });
  });
});

describe('display form', () => {
  it('reinserts the hyphen for hyphenated countries', () => {
    const result = validateRegistration('GABCD');
    expect(result.ok && result.display).toBe('G-ABCD');
  });

  it('leaves unhyphenated countries alone', () => {
    const result = validateRegistration('N12345');
    expect(result.ok && result.display).toBe('N12345');
  });

  it('round trips, the display form revalidates to itself', () => {
    for (const input of ['GABCD', 'N12345', 'VPCABC', 'BHABC', '9VSKA']) {
      const first = validateRegistration(input);
      expect(first.ok).toBe(true);
      if (!first.ok) continue;
      expect(validateRegistration(first.display)).toEqual(first);
    }
  });
});

describe('unknown prefixes create nothing, R5 tier 3', () => {
  it.each(['QQABC', 'XZ1234'])('%s is an unknown prefix', (input) => {
    expect(validateRegistration(input)).toEqual({ ok: false, reason: 'unknown_prefix' });
  });
});
