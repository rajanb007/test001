/**
 * PlaneSpotter, registration validator v2.
 * Author CKC. Version 2.0. Date 2026-09-19.
 *
 * Data lives in registration-prefixes.json, the single source that also
 * generates the Postgres registration_prefixes table. Never edit the table
 * here. Edit the JSON, run the generator, commit both.
 *
 * Contract, fixes the v1 defects found in review.
 * 1. Normalize first. Uppercase, strip whitespace and hyphens. Every
 *    equivalent input form yields the same normalized string, so B-HABC and
 *    BHABC resolve identically, VP-CABC and VPCABC resolve identically.
 * 2. Charset. After normalization the string must be [A-Z0-9]{2,10}.
 *    Punctuation never reaches matching.
 * 3. Longest prefix wins on the normalized string. Multi-country families
 *    are disambiguated by what follows the shared letter, see disambiguate().
 * 4. Rows with a pattern enforce it. Rows without a pattern enforce the
 *    generic rule, suffix of 1 to 5 alphanumerics. A bare prefix is never
 *    valid.
 */

import data from './registration-prefixes.json';

export type RegistrationPrefix = {
  prefix: string;    // stripped form, no hyphen
  display: string;   // display form, may include hyphen, e.g. VP-C
  country: string;   // ISO 3166-1 alpha-2
  hyphen: boolean;   // display form uses a hyphen after the prefix
  pattern: string | null; // regex source over the full normalized string, when the format is well defined
};

export type ValidationResult =
  | { ok: true; normalized: string; country: string; display: string; prefix: string }
  | { ok: false; reason: 'empty' | 'bad_charset' | 'unknown_prefix' | 'bad_format' };

const rows: RegistrationPrefix[] = (data as { rows: RegistrationPrefix[] }).rows;
const byLength = [...rows].sort((a, b) => b.prefix.length - a.prefix.length);
const compiled = new Map<string, RegExp>();
for (const r of rows) if (r.pattern) compiled.set(r.prefix, new RegExp(r.pattern));

const GENERIC_SUFFIX = /^[A-Z0-9]{1,5}$/;
const CHARSET = /^[A-Z0-9]{2,10}$/;

export function normalizeRegistration(input: string): string {
  return input.toUpperCase().replace(/[\s\-\u2010-\u2015]/g, '');
}

/**
 * Families where one letter is shared by several countries.
 * B, mainland China uses B followed by digits. Hong Kong uses BH, BK, BL.
 * Macau uses BM. Taiwan also uses B followed by digits and is not in the
 * table, so B plus digits resolves to CN until a Taiwan row is added.
 * VP, British Overseas Territories. VPC Cayman is the only one in the
 * table today. VP followed by anything else is unknown until rows exist.
 */
function disambiguate(norm: string): RegistrationPrefix | null {
  if (norm.startsWith('B')) {
    const next = norm.charAt(1);
    if ('HKL'.includes(next) && next !== '') return rows.find(r => r.prefix === 'B' + next) ?? null;
    if (next === 'M') return rows.find(r => r.prefix === 'BM') ?? null;
    if (/[0-9]/.test(next)) return rows.find(r => r.prefix === 'B') ?? null;
    return null;
  }
  if (norm.startsWith('VP')) {
    return rows.find(r => r.prefix === 'VP' + norm.charAt(2)) ?? null;
  }
  return null;
}

export function matchPrefix(norm: string): RegistrationPrefix | null {
  if (norm.startsWith('B') || norm.startsWith('VP')) return disambiguate(norm);
  for (const r of byLength) {
    if (norm.startsWith(r.prefix)) return r;
  }
  return null;
}

export function validateRegistration(rawInput: string): ValidationResult {
  const norm = normalizeRegistration(rawInput ?? '');
  if (norm.length === 0) return { ok: false, reason: 'empty' };
  if (!CHARSET.test(norm)) return { ok: false, reason: 'bad_charset' };
  const p = matchPrefix(norm);
  if (!p) return { ok: false, reason: 'unknown_prefix' };
  const suffix = norm.slice(p.prefix.length);
  const re = compiled.get(p.prefix);
  if (re) {
    if (!re.test(norm)) return { ok: false, reason: 'bad_format' };
  } else if (!GENERIC_SUFFIX.test(suffix)) {
    return { ok: false, reason: 'bad_format' };
  }
  const display = p.display.includes('-') || !p.hyphen ? `${p.display}${suffix}` : `${p.display}-${suffix}`;
  return { ok: true, normalized: norm, country: p.country, display, prefix: p.prefix };
}
