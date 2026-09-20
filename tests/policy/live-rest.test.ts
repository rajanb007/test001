/**
 * REST negative tests against PostgREST with a real anon key.
 * Author CKC. Version 0.1.0.
 *
 * BuildPack v1.8 section 4 structural rule 4 is explicit that these run
 * against the Supabase REST endpoint, never through the app, and that denied
 * and empty are different outcomes. A direct Postgres connection cannot stand
 * in for this: PostgREST expands `select *`, so a column grant that looks fine
 * in SQL still decides what a client can ask for.
 *
 * Needs SUPABASE_URL and SUPABASE_ANON_KEY. `supabase status -o env` prints
 * both for a local stack. Skips without them, and a skipped test proves
 * nothing. The full Phase 0 matrix, including a low-trust authenticated key,
 * is Phase 0 gate 3; this covers the anon half that exists today.
 */
import { describe, expect, it } from 'vitest';

const baseUrl = process.env['SUPABASE_URL'];
const anonKey = process.env['SUPABASE_ANON_KEY'];
const configured = Boolean(baseUrl) && Boolean(anonKey);
const live = configured ? describe : describe.skip;

type RestResult = { status: number; body: string };

async function getAsAnon(path: string): Promise<RestResult> {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: anonKey as string, Authorization: `Bearer ${anonKey as string}` },
  });
  return { status: response.status, body: await response.text() };
}

/** PostgREST answers a missing column privilege with 401 and SQLSTATE 42501. */
const isDenied = (result: RestResult): boolean =>
  result.status === 401 && result.body.includes('42501');

live('revoked tables are denied over REST', () => {
  it.each([
    'sightings',
    'media',
    'alert_deliveries',
    'publish_jobs',
    'moderation_actions',
    'import_conflicts',
  ])('%s', async (table) => {
    expect(isDenied(await getAsAnon(`${table}?limit=1`))).toBe(true);
  });
});

live('users public projection over REST', () => {
  it('a bare select star is denied, the column grant blocks it', async () => {
    expect(isDenied(await getAsAnon('users?limit=1'))).toBe(true);
  });

  it('the six public columns are permitted, not denied', async () => {
    // Asserts permitted versus denied, which is the contract. It deliberately
    // does not assert an empty result: the earlier version did, and broke as
    // soon as another test suite created a user. Emptiness is a property of
    // the fixture data, not of the grant.
    const result = await getAsAnon(
      'users?select=id,handle,display_name,avatar_url,trust_tier,home_airport&limit=1',
    );
    expect(result.status).toBe(200);
    expect(Array.isArray(JSON.parse(result.body))).toBe(true);
  });

  it('exposes only the six granted columns on a real row', async () => {
    const result = await getAsAnon(
      'users?select=id,handle,display_name,avatar_url,trust_tier,home_airport&limit=1',
    );
    const rows = JSON.parse(result.body) as Array<Record<string, unknown>>;
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([
        'avatar_url',
        'display_name',
        'handle',
        'home_airport',
        'id',
        'trust_tier',
      ]);
    }
  });

  it.each(['strike_count', 'anonymized_at'])('asking for %s is denied', async (column) => {
    expect(isDenied(await getAsAnon(`users?select=${column}&limit=1`))).toBe(true);
  });
});

live('submissions are invisible to anon over REST', () => {
  it('denies a bare read', async () => {
    expect(isDenied(await getAsAnon('submissions?limit=1'))).toBe(true);
  });

  it('denies an allowlisted column too, anon holds no grant at all', async () => {
    expect(isDenied(await getAsAnon('submissions?select=id,state&limit=1'))).toBe(true);
  });
});

live('public reference data is readable over REST', () => {
  it('registration_prefixes is readable and seeded', async () => {
    const result = await getAsAnon('registration_prefixes?select=prefix&limit=5');
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).length).toBe(5);
  });

  it.each(['airframes', 'airframe_registrations', 'airports'])('%s is readable', async (table) => {
    expect((await getAsAnon(`${table}?limit=1`)).status).toBe(200);
  });
});

live('PostGIS metadata is reachable over REST, known defect', () => {
  // Verified 2026-09-20 by PATCH and DELETE with only the publishable key,
  // both answered 204. See supabase/README.md. it.fails so this flips loudly
  // once the placement is ruled on and fixed.
  it.fails('spatial_ref_sys is not exposed to anon over REST', async () => {
    expect(isDenied(await getAsAnon('spatial_ref_sys?limit=1'))).toBe(true);
  });
});
