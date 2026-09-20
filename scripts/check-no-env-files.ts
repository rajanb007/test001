/**
 * Fails if any .env file is tracked by git. AGENTS.md section 4, never commit
 * .env files or secrets; .env.example documents every variable.
 * Author CKC. Version 0.1.0.
 *
 * Runnable locally like every other check, so CI holds no surprise.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const offenders = tracked.filter((path) => {
  const name = path.split('/').pop() ?? '';
  return name.startsWith('.env') && name !== '.env.example';
});

if (offenders.length > 0) {
  console.error(
    'These .env files are tracked by git. AGENTS.md section 4 forbids it:\n' +
      offenders.map((path) => `  ${path}`).join('\n') +
      '\nRemove them from the index and document the variables in .env.example.',
  );
  process.exit(1);
}

console.log('No tracked .env files.');
