/**
 * Guards the invariants a reader can check without a database.
 * Author CKC. Version 0.1.0.
 *
 * CLAUDE.md section 7, "prose that names a column is a schema claim". These
 * tests hold the migration set to the claims the BuildPack makes about it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
const files = readdirSync(migrations)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const all = files.map((f) => readFileSync(join(migrations, f), 'utf8')).join('\n');

describe('migration file set', () => {
  it('is numbered and ordered', () => {
    for (const file of files) {
      expect(file).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    }
  });

  it('numbers are sequential from 0001 with no gaps or duplicates', () => {
    // Structural rather than a hardcoded list. An earlier version pinned the
    // exact filenames and had to be hand edited on every migration, which made
    // it a chore rather than a check. Gaps and duplicates are the real risks:
    // both break `supabase db reset` ordering or silently skip a file.
    const numbers = files.map((f) => Number(f.slice(0, 4)));
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  });

  it('splits the schema by concern per AGENTS.md section 7, in dependency order', () => {
    const concerns = files.slice(0, 9).map((f) => f.slice(5, -4));
    expect(concerns).toEqual([
      'extensions',
      'enums',
      'identity',
      'content',
      'social',
      'safety',
      'indexes',
      'rls',
      'grants',
    ]);
  });

  it('every migration past the schema split names what it adds', () => {
    for (const file of files.slice(9)) {
      expect(file.slice(5, -4).length).toBeGreaterThan(3);
    }
  });
});

describe('invariant 3, sightings.airframe_id is never null, R7', () => {
  it('declares airframe_id not null', () => {
    expect(all).toMatch(/airframe_id uuid not null references public\.airframes\(id\)/);
  });

  it('ties every sighting to exactly one submission', () => {
    expect(all).toMatch(/submission_id uuid not null unique references public\.submissions\(id\)/);
  });
});

describe('invariant 1, idempotent contribution', () => {
  it('makes (user_id, client_submission_id) unique on submissions', () => {
    expect(all).toContain('unique (user_id, client_submission_id)');
  });

  it('allows at most one publish job series per submission', () => {
    expect(all).toMatch(
      /submission_id uuid not null unique references public\.submissions\(id\) on delete cascade/,
    );
  });
});

describe('invariant 7, one alert per user per airframe per 24-hour bucket', () => {
  it('enforces the rate limit with a unique index, not a lookup', () => {
    expect(all).toContain('unique (user_id, airframe_id, window_key)');
  });

  it('allows at most one delivery row per token per alert', () => {
    expect(all).toContain('unique (alert_event_id, token)');
  });

  it('bounds the uncertain-send retry to one, BuildPack section 6.2', () => {
    expect(all).toContain('retry_count int not null default 0 check (retry_count between 0 and 1)');
  });
});

describe('R12, moderation_actions never cascades', () => {
  const safety = readFileSync(join(migrations, '0006_safety.sql'), 'utf8');
  const table = safety.slice(
    safety.indexOf('create table public.moderation_actions'),
    safety.indexOf('create table public.import_conflicts'),
  );

  it('uses on delete set null, never on delete cascade', () => {
    expect(table).not.toContain('on delete cascade');
    expect(table).toContain('on delete set null');
  });

  it('keeps target_ref as a surviving text reference', () => {
    expect(table).toContain('target_ref text not null');
  });
});

describe('R10, auth deletion is restricted, never cascaded', () => {
  it('users.id restricts deletion of the auth row', () => {
    expect(all).toContain('references auth.users(id) on delete restrict');
  });
});

describe('R11, resubmission cap of three', () => {
  it('constrains resubmit_count', () => {
    expect(all).toContain('resubmit_count int not null default 0 check (resubmit_count <= 3)');
  });
});

describe('approval is bound to the current content revision', () => {
  it('carries the revision-binding check constraint', () => {
    expect(all).toContain('approved_revision = content_revision');
  });
});

describe('invariant 4, derivatives start private', () => {
  it('defaults media to the pending bucket', () => {
    expect(all).toContain(
      "derivatives_bucket text not null default 'pending' check (derivatives_bucket in ('pending','derivatives'))",
    );
  });
});

describe('R13, per-job publish nonce', () => {
  it('generates a fresh nonce per publish job', () => {
    expect(all).toContain(
      "publish_nonce text not null default encode(gen_random_bytes(16), 'hex')",
    );
  });

  it('persists the intended-key manifest on the job row', () => {
    expect(all).toContain("public_keys text[] not null default '{}'");
  });
});

describe('BuildPack section 5.5, preflight is never a persisted stage', () => {
  it('omits preflight from the publish_jobs stage constraint', () => {
    const stages = all.slice(all.indexOf("stage text not null default 'waiting_authorization'"));
    const constraint = stages.slice(0, stages.indexOf('),'));
    expect(constraint).not.toContain('preflight');
    expect(constraint).toContain('waiting_authorization');
    expect(constraint).toContain('cleanup');
  });
});

describe('identity over time', () => {
  it('keeps one current registration globally', () => {
    expect(all).toContain(
      'create unique index uq_current_registration\n  on public.airframe_registrations (registration) where is_current;',
    );
  });

  it('indexes the validity ranges resolution reads', () => {
    expect(all).toContain(
      'create index ix_registrations_history\n  on public.airframe_registrations (registration, valid_from, valid_to);',
    );
  });
});
