/**
 * Fails when packages/shared/tokens.ts no longer matches what
 * docs/DESIGN.md section 2.4 generates. Ruling D1, the document owns the hex
 * values, so a hand edit to the token file is a drift, not a change.
 * Author CKC. Version 0.1.0.
 *
 * This is a script rather than an inline CI step on purpose. An inline step is
 * invisible to `pnpm run verify`, so it cannot be run before pushing, and the
 * first version of this check went red on CI for exactly that reason.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const tokens = join(root, 'packages', 'shared', 'tokens.ts');
const generator = join(root, 'packages', 'shared', 'generate-tokens.ts');

// pnpm exec, never pnpm run. `pnpm run` prints its own banner to stdout and
// would be captured as part of the generated file.
const generated = execFileSync('pnpm', ['exec', 'tsx', generator], {
  cwd: root,
  encoding: 'utf8',
});

const committed = readFileSync(tokens, 'utf8');

if (committed !== generated) {
  console.error(
    'packages/shared/tokens.ts has drifted from docs/DESIGN.md section 2.4.\n' +
      'Token hex values are frozen under ruling D1 and the document owns them.\n' +
      'To change one, get a CKC-approved doc revision first, then regenerate:\n' +
      '  pnpm run tokens:generate > packages/shared/tokens.ts',
  );
  process.exit(1);
}

console.log('packages/shared/tokens.ts matches docs/DESIGN.md section 2.4.');
