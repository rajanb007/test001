/**
 * Guards the Phase S fixture harness so it cannot outlive Phase S or leak.
 * Author CKC. Version 1.0.
 *
 * BuildPack v1.8 section 9: "do not expose an approval bypass to clients or
 * ship the harness." These are the checks that make that enforceable rather
 * than a note in a file nobody rereads.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const migrations = join(root, 'supabase', 'migrations');
const harnessFile = '0015_phase_s_fixture_harness.sql';
const harness = readFileSync(join(migrations, harnessFile), 'utf8');

const allMigrations = readdirSync(migrations)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({ name: f, body: readFileSync(join(migrations, f), 'utf8') }));

describe('the harness is confined to one file', () => {
  it('every fixture function lives in the harness migration', () => {
    for (const migration of allMigrations) {
      if (migration.name === harnessFile) continue;
      expect(migration.body).not.toMatch(
        /create\s+(or\s+replace\s+)?function\s+public\.app_fixture_/i,
      );
    }
  });

  it('every function it defines carries the app_fixture_ prefix, so a grep finds them all', () => {
    const defined = [...harness.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)/gi)].map(
      (m) => m[1] as string,
    );
    expect(defined.length).toBeGreaterThan(0);
    for (const name of defined) {
      expect(name.startsWith('app_fixture_')).toBe(true);
    }
  });

  it('says plainly that it is Phase S only and must be deleted', () => {
    expect(harness).toContain('PHASE S ONLY');
    expect(harness.toLowerCase()).toContain('delete in phase 0');
  });
});

describe('the harness is never reachable by a client', () => {
  it('revokes from public, anon and authenticated', () => {
    expect(harness).toContain(
      'revoke all on function public.app_fixture_approve_submission(uuid, text)\n  from public, anon, authenticated;',
    );
  });

  it('grants only to service_role', () => {
    const grants = [...harness.matchAll(/grant execute on function [^;]+ to ([^;]+);/g)].map((m) =>
      (m[1] as string).trim(),
    );
    expect(grants).toEqual(['service_role']);
  });

  it('requires the service role at runtime, not just by grant', () => {
    expect(harness).toContain('perform public.app_require_service();');
  });
});

describe('the harness is not authorization and does not pretend to be', () => {
  it('never defines authorize_submission, which is Phase 0 work', () => {
    for (const migration of allMigrations) {
      expect(migration.body).not.toMatch(/function\s+public\.authorize_submission/i);
    }
  });

  it('marks its audit row as a fixture so a real approval stays distinguishable', () => {
    expect(harness).toContain("'phase_s_fixture_approval'");
    expect(harness).toContain("'fixture', true");
  });
});

describe('Phase S scope boundaries hold', () => {
  const everything = allMigrations.map((m) => m.body).join('\n');

  it('no migration implements manifest cleanup, which is Phase 0', () => {
    // cleanup is a declared stage, but nothing may drive a job into it yet.
    expect(everything).not.toMatch(/set\s+stage\s*=\s*'cleanup'/i);
  });

  it('the cleanup and failed stages still exist in the constraint for Phase 0', () => {
    expect(everything).toContain("'cleanup','failed'");
  });

  it('publication never inserts a sighting outside publish_commit', () => {
    const inserts = [...everything.matchAll(/insert into public\.sightings/gi)];
    expect(inserts).toHaveLength(1);
  });

  it('the commit path writes the sighting after the key manifest is committed', () => {
    const publish = allMigrations.find((m) => m.name === '0014_rpc_publish_submission.sql');
    const body = publish?.body ?? '';
    expect(body.indexOf('public_keys = public.app_publish_keys')).toBeLessThan(
      body.indexOf('insert into public.sightings'),
    );
  });
});
