/**
 * Fails CI when the committed registration_prefixes migration no longer matches
 * what registration-prefixes.json generates. BuildPack v1.8 section 3.1, one
 * JSON source produces both the TypeScript module and the migration.
 * Author CKC. Version 0.1.0.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const migration = join(root, 'supabase', 'migrations', '0010_registration_prefixes_seed.sql');
const generator = join(root, 'packages', 'shared', 'generate-prefix-migration.ts');

const generated = execFileSync('pnpm', ['exec', 'tsx', generator], {
  cwd: root,
  encoding: 'utf8',
});

let committed: string;
try {
  committed = readFileSync(migration, 'utf8');
} catch {
  console.error(
    `Missing ${migration}. Run: pnpm run prefixes:generate > supabase/migrations/0010_registration_prefixes_seed.sql`,
  );
  process.exit(1);
}

if (committed !== generated) {
  console.error(
    'registration_prefixes migration has drifted from registration-prefixes.json.\n' +
      'Edit the JSON, never the migration, then regenerate:\n' +
      '  pnpm run prefixes:generate > supabase/migrations/0010_registration_prefixes_seed.sql',
  );
  process.exit(1);
}

console.log('registration_prefixes migration matches the JSON source.');
