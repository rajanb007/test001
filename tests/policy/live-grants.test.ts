/**
 * Executes the BuildPack v1.8 section 4 matrix against a real database.
 * Author CKC. Version 0.1.0.
 *
 * The static tests assert what the SQL says. These assert what Postgres does.
 * They found one defect the static tests could not see, see 0011.
 */
import { describe, expect, it } from 'vitest';
import { asRole, hasDatabase, query } from './live-db.js';

const live = hasDatabase ? describe : describe.skip;

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

/** Revoked outright. A direct select must be denied, not empty. */
const REVOKED_TABLES = [
  'sightings',
  'media',
  'alert_deliveries',
  'publish_jobs',
  'moderation_actions',
  'import_conflicts',
] as const;

live('every Phase S table exists with RLS enabled', () => {
  it.each(PHASE_S_TABLES)('%s', async (table) => {
    const rows = await query<{ relrowsecurity: boolean }>(
      `select c.relrowsecurity
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = $1 and c.relkind = 'r'`,
      [table],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.relrowsecurity).toBe(true);
  });
});

live('revoked tables are denied, not merely empty', () => {
  it.each(REVOKED_TABLES)('anon selecting %s is denied', async (table) => {
    const result = await asRole('anon', `select * from public.${table} limit 1`);
    expect(result.denied).toBe(true);
  });

  it.each(REVOKED_TABLES)('authenticated selecting %s is denied', async (table) => {
    const result = await asRole('authenticated', `select * from public.${table} limit 1`);
    expect(result.denied).toBe(true);
  });
});

live('submissions owner projection', () => {
  it('denies select star even before any row exists', async () => {
    const result = await asRole('authenticated', 'select * from public.submissions limit 1');
    expect(result.denied).toBe(true);
  });

  it.each(['caption', 'approved_by', 'approval_kind', 'approved_revision', 'lease_token'])(
    'denies the forbidden column %s',
    async (column) => {
      const result = await asRole(
        'authenticated',
        `select ${column} from public.submissions limit 1`,
      );
      expect(result.denied).toBe(true);
    },
  );

  it('permits the allowlisted columns and returns empty, not denied', async () => {
    const result = await asRole(
      'authenticated',
      'select id, state, registration_text, taken_at from public.submissions limit 1',
    );
    expect(result.denied).toBe(false);
    expect(result.rowCount).toBe(0);
  });

  it('grants anon nothing at all', async () => {
    const result = await asRole('anon', 'select id from public.submissions limit 1');
    expect(result.denied).toBe(true);
  });
});

live('users public projection', () => {
  it.each(['strike_count', 'anonymized_at'])('denies %s to anon', async (column) => {
    const result = await asRole('anon', `select ${column} from public.users limit 1`);
    expect(result.denied).toBe(true);
  });

  it('permits the public profile columns', async () => {
    const result = await asRole(
      'anon',
      'select id, handle, display_name, avatar_url, trust_tier, home_airport from public.users limit 1',
    );
    expect(result.denied).toBe(false);
  });
});

live('alert_events owner projection', () => {
  it.each(['window_key', 'session_attributed_at'])('denies %s', async (column) => {
    const result = await asRole(
      'authenticated',
      `select ${column} from public.alert_events limit 1`,
    );
    expect(result.denied).toBe(true);
  });
});

live('PostGIS metadata, known defect, see supabase/README.md', () => {
  // Verified 2026-09-20 on supabase/postgres:17.6.1.167. The image installs
  // PostGIS into public as supabase_admin and grants anon and authenticated
  // INSERT, UPDATE, DELETE, TRUNCATE and REFERENCES on spatial_ref_sys. A
  // migration cannot revoke this: it runs as postgres, which is not a member
  // of supabase_admin and cannot revoke another role's grants. Open for CKC.
  //
  // These are it.fails, so they pass while the defect stands and start failing
  // the moment it is fixed, which forces this block to be rewritten rather
  // than quietly left behind.

  it.fails('anon cannot insert into spatial_ref_sys', async () => {
    const result = await asRole(
      'anon',
      "insert into public.spatial_ref_sys (srid, auth_name, auth_srid, proj4text) values (990002, 'probe', 990002, 'probe')",
    );
    expect(result.denied).toBe(true);
  });

  it.fails('anon cannot rewrite the srid 4326 definition', async () => {
    const result = await asRole(
      'anon',
      'update public.spatial_ref_sys set proj4text = proj4text where srid = 4326',
    );
    expect(result.denied).toBe(true);
  });

  it.fails('anon cannot delete spatial reference rows', async () => {
    const result = await asRole('anon', 'delete from public.spatial_ref_sys where srid = 990002');
    expect(result.denied).toBe(true);
  });

  it('anon can read spatial_ref_sys, PostGIS functions need it', async () => {
    const result = await asRole(
      'anon',
      'select srid from public.spatial_ref_sys where srid = 4326',
    );
    expect(result.denied).toBe(false);
    expect(result.rowCount).toBe(1);
  });

  it('records that the grants come from supabase_admin, not from our migrations', async () => {
    const rows = await query<{ grantor: string }>(
      `select distinct grantor from information_schema.table_privileges
        where table_schema = 'public' and table_name = 'spatial_ref_sys'
          and grantee = 'anon' and privilege_type = 'UPDATE'`,
    );
    expect(rows[0]?.grantor).toBe('supabase_admin');
  });
});

live('registration_prefixes seed applied', () => {
  it('has the same row count as the JSON source', async () => {
    const { default: data } = (await import('../../packages/shared/registration-prefixes.json', {
      with: { type: 'json' },
    })) as { default: { rows: unknown[] } };
    const rows = await query<{ count: string }>(
      'select count(*) from public.registration_prefixes',
    );
    expect(Number(rows[0]?.count)).toBe(data.rows.length);
  });
});

live('write paths are closed until the Block 4 RPCs exist', () => {
  it('authenticated cannot insert a submission directly', async () => {
    const result = await asRole(
      'authenticated',
      'insert into public.submissions (user_id, client_submission_id) values (gen_random_uuid(), gen_random_uuid())',
    );
    expect(result.denied).toBe(true);
  });

  it('authenticated cannot insert a sighting directly, invariant 3', async () => {
    const result = await asRole('authenticated', 'insert into public.sightings default values');
    expect(result.denied).toBe(true);
  });
});
