/**
 * Gate 2, concurrency half: one airframe for one new registration.
 * Author CKC. Version 1.0.
 *
 * Runs against independent connections so the transactions genuinely contend,
 * rather than serialising on one client.
 */
import { Client } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATABASE_URL, createAirport, hasDatabase, one, resetData, sql } from './fixtures.js';

const live = hasDatabase ? describe : describe.skip;

/** Resolves a registration on its own connection. */
async function resolveOnOwnConnection(registration: string, takenAt: string): Promise<string> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(
      'select outcome from public.resolve_airframe($1, $2::timestamptz)',
      [registration, takenAt],
    );
    return (result.rows[0] as { outcome: string }).outcome;
  } finally {
    await client.end();
  }
}

live('gate 2, concurrent resolution of one new registration', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('eight racing resolutions create exactly one airframe', async () => {
    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () => resolveOnOwnConnection('G-RACE', '2026-09-20T09:00:00Z')),
    );

    const { count } = await one<{ count: string }>('select count(*) from public.airframes');
    expect(Number(count)).toBe(1);

    const registrations = await sql<{ id: string }>(
      `select id from public.airframe_registrations where registration = 'GRACE'`,
    );
    expect(registrations).toHaveLength(1);

    // Exactly one creator, the rest adopt it. Both outcomes are correct.
    expect(outcomes.filter((o) => o === 'stub_pending')).toHaveLength(1);
    expect(outcomes.filter((o) => o === 'matched')).toHaveLength(7);
  });

  it('leaves no orphan airframe behind from the losing transactions', async () => {
    await Promise.all(
      Array.from({ length: 6 }, () => resolveOnOwnConnection('G-ORPH', '2026-09-20T09:00:00Z')),
    );

    const orphans = await sql(
      `select a.id from public.airframes a
        where not exists (select 1 from public.airframe_registrations r where r.airframe_id = a.id)`,
    );
    expect(orphans).toEqual([]);
  });

  it('the unique current-registration index is what enforces it', async () => {
    await resolveOnOwnConnection('G-UNIQ', '2026-09-20T09:00:00Z');
    const airframe = await one<{ id: string }>(
      `insert into public.airframes (is_stub) values (true) returning id`,
    );
    await expect(
      sql(
        `insert into public.airframe_registrations (airframe_id, registration, is_current)
         values ($1, 'GUNIQ', true)`,
        [airframe.id],
      ),
    ).rejects.toThrow(/uq_current_registration/);
  });
});
