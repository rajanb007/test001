/**
 * Asserts the migration set matches the BuildPack v1.8 section 4 matrix.
 * Author CKC. Version 0.1.0.
 *
 * Two layers. The static layer reads the SQL and always runs, so a table added
 * without RLS or without a revoke fails CI with no database. The live layer
 * needs DATABASE_URL and skips without it; skipping proves nothing, see
 * tests/policy/README.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = join(import.meta.dirname, '..', '..', 'supabase', 'migrations');
const read = (file: string): string => readFileSync(join(migrations, file), 'utf8');

/**
 * Strips `--` comments and splits into statements. Comments in a grants file
 * name the columns they exclude, so matching raw text would read an exclusion
 * note as a grant.
 */
const statements = (sql: string): string[] =>
  sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

/** The column list of the single grant statement touching `table`. */
const grantedColumns = (sql: string, table: string): string[] => {
  const stmt = statements(sql).find(
    (s) => s.startsWith('grant') && s.includes(`on public.${table} to`),
  );
  if (stmt === undefined) return [];
  const columns = /^grant\s+\w+\s*\(([^)]*)\)/.exec(stmt);
  if (columns === null || columns[1] === undefined) return ['*'];
  return columns[1].split(',').map((c) => c.trim());
};

/** The Phase S table subset, AGENTS.md section 5. airports carries the FKs. */
const PHASE_S_TABLES = [
  'users',
  'airframes',
  'airframe_registrations',
  'registration_prefixes',
  'airports',
  'submissions',
  'sightings',
  'media',
  'publish_jobs',
  'follows',
  'device_push_tokens',
  'alert_events',
  'alert_deliveries',
  'moderation_actions',
  'import_conflicts',
] as const;

/** Revoked outright, reachable only via service_role, a view or an RPC. */
const NO_CLIENT_GRANT = [
  'sightings',
  'media',
  'alert_deliveries',
  'publish_jobs',
  'moderation_actions',
  'import_conflicts',
] as const;

/** Binding owner allowlist, BuildPack section 4. */
const SUBMISSION_OWNER_COLUMNS = [
  'id',
  'user_id',
  'client_submission_id',
  'state',
  'registration_text',
  'taken_at',
  'captured_geo',
  'airport_icao',
  'ingestion_source',
  'contribution_batch_id',
  'resolved_airframe_id',
  'resolved_registration_id',
  'resolution_outcome',
  'sighting_id',
  'rejection_reason',
  'resubmit_count',
  'created_at',
  'updated_at',
] as const;

/** Never reachable by the owner through a direct column grant. */
const SUBMISSION_FORBIDDEN_COLUMNS = [
  'caption',
  'approved_by',
  'approval_kind',
  'approved_revision',
  'approved_at',
  'lease_token',
] as const;

describe('RLS is enabled on every Phase S table', () => {
  const rls = read('0008_rls.sql');

  it.each(PHASE_S_TABLES)('%s has row level security enabled', (table) => {
    expect(rls).toContain(`alter table public.${table} enable row level security;`);
  });
});

describe('client privileges are revoked before anything is granted back', () => {
  const grants = read('0009_grants.sql');

  it.each(PHASE_S_TABLES)('%s is revoked from anon, authenticated and public', (table) => {
    expect(grants).toContain(`revoke all on public.${table} from anon, authenticated, public;`);
  });

  it.each(NO_CLIENT_GRANT)('%s is never granted back to a client role', (table) => {
    const granting = statements(grants).filter(
      (s) => s.startsWith('grant') && s.includes(`public.${table}`),
    );
    expect(granting).toEqual([]);
  });

  it('the grant parser finds the grants that do exist, so absence means absence', () => {
    expect(grantedColumns(grants, 'submissions')).toHaveLength(18);
    expect(grantedColumns(grants, 'airports')).toEqual(['*']);
  });

  it('revokes precede grants in file order', () => {
    const lastRevoke = grants.lastIndexOf('revoke all on public.');
    const firstGrant = grants.indexOf('grant select');
    expect(lastRevoke).toBeGreaterThan(-1);
    expect(firstGrant).toBeGreaterThan(lastRevoke);
  });
});

describe('submissions owner projection', () => {
  const columns = grantedColumns(read('0009_grants.sql'), 'submissions');
  const grants = read('0009_grants.sql');

  it.each(SUBMISSION_OWNER_COLUMNS)('grants %s', (column) => {
    expect(columns).toContain(column);
  });

  it.each(SUBMISSION_FORBIDDEN_COLUMNS)('never grants %s', (column) => {
    expect(columns).not.toContain(column);
  });

  it('grants the allowlist and nothing beyond it', () => {
    expect([...columns].sort()).toEqual([...SUBMISSION_OWNER_COLUMNS].sort());
  });

  it('grants nothing on submissions to anon', () => {
    const toAnon = statements(grants).some(
      (s) => s.startsWith('grant') && s.includes('on public.submissions to') && s.includes('anon'),
    );
    expect(toAnon).toBe(false);
  });
});

describe('users public profile projection', () => {
  const columns = grantedColumns(read('0009_grants.sql'), 'users');

  it('exposes exactly the six public profile columns', () => {
    expect([...columns].sort()).toEqual([
      'avatar_url',
      'display_name',
      'handle',
      'home_airport',
      'id',
      'trust_tier',
    ]);
  });

  it.each(['strike_count', 'anonymized_at', 'created_at'])('never exposes %s', (column) => {
    expect(columns).not.toContain(column);
  });
});

describe('alert_events owner projection', () => {
  const columns = grantedColumns(read('0009_grants.sql'), 'alert_events');

  it('exposes exactly the six owner columns', () => {
    expect([...columns].sort()).toEqual([
      'airframe_id',
      'created_at',
      'id',
      'opened_at',
      'sighting_id',
      'status',
    ]);
  });

  it.each(['window_key', 'session_attributed_at'])('never grants %s', (column) => {
    expect(columns).not.toContain(column);
  });
});

describe('owner row predicates exist', () => {
  const rls = read('0008_rls.sql');

  it.each(['submissions', 'follows', 'device_push_tokens', 'alert_events'])(
    '%s is filtered to the calling user',
    (table) => {
      const policy = new RegExp(
        `create policy ${table}_select_own on public\\.${table}[\\s\\S]*?using \\(user_id = \\(select auth\\.uid\\(\\)\\)\\);`,
      );
      expect(rls).toMatch(policy);
    },
  );
});
