/**
 * Keeps CI runnable locally.
 * Author CKC. Version 0.1.0.
 *
 * Written after a real failure. An inline `run:` block was added to the
 * workflow that `pnpm run verify` did not cover, so there was no way to catch
 * it before pushing, and it went red on the first CI run. The fix is
 * structural: every check in the workflow must be a package script that
 * `verify` also runs, so a contributor can reproduce CI with one command.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const workflow = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

/** Every `run:` command in the workflow, single line form only. */
const runCommands = [...workflow.matchAll(/^\s+run:\s+(.+)$/gm)].map((m) =>
  (m[1] as string).trim(),
);

/** The commands CI runs through pnpm scripts. */
const scriptCommands = runCommands
  .filter((command) => command.startsWith('pnpm run '))
  .map((command) => command.slice('pnpm run '.length));

describe('CI is reproducible with one local command', () => {
  it('runs at least the checks we expect', () => {
    expect(scriptCommands.length).toBeGreaterThanOrEqual(5);
  });

  it.each(scriptCommands)('pnpm run %s exists in package.json', (script) => {
    expect(Object.keys(pkg.scripts)).toContain(script);
  });

  it.each(scriptCommands)('pnpm run %s is covered by verify', (script) => {
    expect(pkg.scripts['verify']).toContain(`pnpm run ${script}`);
  });

  it('uses no multi line run block, those cannot be run locally', () => {
    // A `run: |` block is the shape that caused the original failure.
    expect(workflow).not.toMatch(/^\s+run:\s*\|\s*$/m);
  });

  it('never redirects pnpm run output to a file', () => {
    // `pnpm run` prints a banner to stdout, so a redirect captures it. Any
    // generator must be invoked with `pnpm exec` instead.
    for (const command of runCommands) {
      expect(command).not.toMatch(/pnpm run .*>/);
    }
  });
});

describe('verify covers the drift checks', () => {
  it.each(['prefixes:check', 'tokens:check'])('%s', (script) => {
    expect(pkg.scripts['verify']).toContain(script);
  });
});
