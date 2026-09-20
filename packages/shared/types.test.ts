/**
 * Holds types.ts to the database. CLAUDE.md section 7, prose that names a
 * column is a schema claim, and a TypeScript union of enum members is the
 * same kind of claim. Parses the migration rather than trusting the copy.
 * Author CKC. Version 1.0.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALERT_EVENT_STATUSES,
  CONFLICT_STATUSES,
  DELIVERY_STATUSES,
  FOLLOW_TARGETS,
  INGESTION_SOURCES,
  LOCAL_QUEUE_STATES,
  POLICY_STATUSES,
  PRIVACY_POLICY_TYPES,
  PUBLISH_JOB_STAGES,
  QUEUE_STATE_LABELS,
  REPORT_STATUSES,
  RESOLUTION_OUTCOMES,
  SIGHTING_STATUSES,
  STUB_STATUSES,
  SUBMISSION_STATES,
  TRUST_TIERS,
} from './types.js';

const migrations = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
const enumsSql = readFileSync(join(migrations, '0002_enums.sql'), 'utf8');
const contentSql = readFileSync(join(migrations, '0004_content.sql'), 'utf8');

/** Reads the members of one `create type ... as enum (...)` block. */
function sqlEnum(name: string): string[] {
  const pattern = new RegExp(`create type ${name} as enum\\s*\\(([^)]*)\\)`, 'i');
  const match = pattern.exec(enumsSql);
  if (match === null || match[1] === undefined) throw new Error(`No enum ${name} in 0002`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
}

const PAIRS: ReadonlyArray<[string, readonly string[]]> = [
  ['submission_state', SUBMISSION_STATES],
  ['sighting_status', SIGHTING_STATUSES],
  ['ingestion_source', INGESTION_SOURCES],
  ['stub_status', STUB_STATUSES],
  ['trust_tier', TRUST_TIERS],
  ['follow_target', FOLLOW_TARGETS],
  ['conflict_status', CONFLICT_STATUSES],
  ['report_status', REPORT_STATUSES],
  ['privacy_policy_type', PRIVACY_POLICY_TYPES],
  ['policy_status', POLICY_STATUSES],
  ['alert_event_status', ALERT_EVENT_STATUSES],
  ['delivery_status', DELIVERY_STATUSES],
  ['resolution_outcome', RESOLUTION_OUTCOMES],
];

describe('every TypeScript enum matches its Postgres enum exactly', () => {
  it.each(PAIRS)('%s', (sqlName, tsMembers) => {
    expect([...tsMembers]).toEqual(sqlEnum(sqlName));
  });

  it('covers every enum the migration declares, so none is forgotten', () => {
    const declared = [...enumsSql.matchAll(/create type (\w+) as enum/g)].map((m) => m[1]);
    expect(declared.sort()).toEqual(PAIRS.map(([name]) => name).sort());
  });
});

describe('publish job stages match the SQL check constraint', () => {
  it('is the same set in the same order', () => {
    const block = contentSql.slice(
      contentSql.indexOf("stage text not null default 'waiting_authorization'"),
    );
    const constraint = block.slice(0, block.indexOf('),'));
    const members = [...constraint.matchAll(/'([a-z_]+)'/g)]
      .map((m) => m[1] as string)
      .filter((m) => m !== 'waiting_authorization' || true);
    // The default literal repeats the first member, so dedupe while keeping order.
    expect([...new Set(members)]).toEqual([...PUBLISH_JOB_STAGES]);
  });

  it('never persists a preflight stage, BuildPack section 5.5', () => {
    expect(PUBLISH_JOB_STAGES).not.toContain('preflight');
  });
});

describe('queue labels', () => {
  it('cover every submission state plus the two local-only substates', () => {
    expect(Object.keys(QUEUE_STATE_LABELS).sort()).toEqual(
      [...SUBMISSION_STATES, ...LOCAL_QUEUE_STATES].sort(),
    );
  });

  it('are sentence case with no exclamation marks, binding rule 7.2.8', () => {
    for (const label of Object.values(QUEUE_STATE_LABELS)) {
      expect(label).not.toContain('!');
      expect(label[0]).toBe(label[0]?.toUpperCase());
    }
  });

  it('never promise background upload, AGENTS.md section 4', () => {
    for (const label of Object.values(QUEUE_STATE_LABELS)) {
      expect(label.toLowerCase()).not.toMatch(/background|while closed|when closed/);
    }
  });

  it('R9, no label says delivered', () => {
    for (const label of Object.values(QUEUE_STATE_LABELS)) {
      expect(label.toLowerCase()).not.toContain('deliver');
    }
  });
});
