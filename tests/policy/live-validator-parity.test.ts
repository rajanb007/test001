/**
 * The SQL registration validator must agree with the TypeScript one.
 * Author CKC. Version 1.0.
 *
 * resolve_airframe validates in SQL and the client validates in TypeScript.
 * Two implementations of one contract drift, and a drift here means the client
 * accepts a registration the server rejects, or worse the reverse. Both read
 * the same JSON source, so this asserts they read it the same way.
 */
import { describe, expect, it } from 'vitest';
import data from '../../packages/shared/registration-prefixes.json' with { type: 'json' };
import {
  normalizeRegistration,
  validateRegistration,
} from '@planespotter/shared/registration-prefixes';
import type { RegistrationPrefix } from '@planespotter/shared/registration-prefixes';
import { hasDatabase, sql } from './fixtures.js';

const live = hasDatabase ? describe : describe.skip;

const rows = (data as { rows: RegistrationPrefix[] }).rows;

/**
 * A corpus wide enough to exercise every branch: one case per row from the
 * JSON itself, plus the families, the format rules and the rejections.
 */
function corpus(): string[] {
  const cases: string[] = [
    '',
    '   ',
    '-',
    'G',
    'G-',
    'G-ABCD',
    'GABCD',
    'g-abcd',
    '  g abcd  ',
    'G.ABCD',
    'G/ABCD',
    'G_ABCD',
    'GABCDEFGHIJK',
    'N12345',
    'N1234',
    'N0123',
    'N1234IO',
    'N99999',
    'C-FGAX',
    'C-ZGAX',
    'CFGAX',
    'B-2033',
    'B2033',
    'B-HABC',
    'B-KABC',
    'B-LABC',
    'B-MABC',
    'B-ZABC',
    'BH',
    'VP-CABC',
    'VPCABC',
    'VP-ZABC',
    'VP-C',
    '9V-SKA',
    '9VSKA',
    'JA-8089',
    'JA8089',
    'QQABC',
    'XZ1234',
  ];
  for (const row of rows) {
    cases.push(`${row.prefix}ABC`);
    cases.push(`${row.prefix}-ABC`);
    cases.push(row.prefix);
    cases.push(`${row.prefix}123456`);
  }
  return cases;
}

live('normalisation agrees', () => {
  it('produces the same normalised string for every case', async () => {
    const cases = corpus();
    const sqlResults = await sql<{ input: string; normalized: string }>(
      `select c.input, public.app_normalize_registration(c.input) as normalized
         from unnest($1::text[]) as c(input)`,
      [cases],
    );

    const mismatches = sqlResults.filter(
      (row) => row.normalized !== normalizeRegistration(row.input),
    );
    expect(mismatches).toEqual([]);
  });
});

live('validity agrees', () => {
  it('accepts and rejects the same registrations', async () => {
    const cases = corpus();
    const sqlResults = await sql<{ input: string; valid: boolean }>(
      `select c.input, public.app_registration_is_valid(c.input) as valid
         from unnest($1::text[]) as c(input)`,
      [cases],
    );

    const mismatches = sqlResults
      .map((row) => ({
        input: row.input,
        sql: row.valid,
        ts: validateRegistration(row.input).ok,
      }))
      .filter((row) => row.sql !== row.ts);

    expect(mismatches).toEqual([]);
  });

  it('covers every row in the JSON, so the corpus cannot go stale', () => {
    const covered = new Set(corpus().map((c) => normalizeRegistration(c)));
    for (const row of rows) {
      expect(covered.has(`${row.prefix}ABC`)).toBe(true);
    }
  });
});

live('prefix selection agrees', () => {
  it('picks the same prefix for every valid case', async () => {
    const cases = corpus().filter((c) => validateRegistration(c).ok);
    const sqlResults = await sql<{ input: string; prefix: string | null }>(
      `select c.input, (public.app_match_prefix(public.app_normalize_registration(c.input))).prefix
         from unnest($1::text[]) as c(input)`,
      [cases],
    );

    const mismatches = sqlResults
      .map((row) => {
        const ts = validateRegistration(row.input);
        return { input: row.input, sql: row.prefix, ts: ts.ok ? ts.prefix : null };
      })
      .filter((row) => row.sql !== row.ts);

    expect(mismatches).toEqual([]);
  });

  it('agrees on country for every valid case', async () => {
    const cases = corpus().filter((c) => validateRegistration(c).ok);
    const sqlResults = await sql<{ input: string; country: string | null }>(
      `select c.input, (public.app_match_prefix(public.app_normalize_registration(c.input))).country
         from unnest($1::text[]) as c(input)`,
      [cases],
    );

    const mismatches = sqlResults
      .map((row) => {
        const ts = validateRegistration(row.input);
        return { input: row.input, sql: row.country, ts: ts.ok ? ts.country : null };
      })
      .filter((row) => row.sql !== row.ts);

    expect(mismatches).toEqual([]);
  });
});
