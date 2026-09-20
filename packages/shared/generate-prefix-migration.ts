/**
 * Generates supabase/migrations/<n>_registration_prefixes.sql from
 * registration-prefixes.json. Run in CI, fail the build if the committed
 * migration differs from the generated one. Author CKC. Version 1.0.
 */
import data from './registration-prefixes.json';
type Row = { prefix: string; country: string; hyphen: boolean; pattern: string | null };
const rows = (data as { rows: Row[] }).rows;
const esc = (s: string) => s.replace(/'/g, "''");
const values = rows
  .map(r => `('${esc(r.prefix)}','${r.country}',${r.hyphen},${r.pattern ? `'${esc(r.pattern)}'` : 'null'})`)
  .join(',\n');
process.stdout.write(
  `-- generated from packages/shared/registration-prefixes.json, do not edit\ndelete from public.registration_prefixes;\ninsert into public.registration_prefixes (prefix, country, uses_hyphen, pattern) values\n${values};\n`
);
