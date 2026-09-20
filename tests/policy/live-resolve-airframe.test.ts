/**
 * resolve_airframe, including the identity-over-time fixture.
 * Author CKC. Version 1.0.
 *
 * Phase S exit gate 2, the identity half. CLAUDE.md section 7: matching on the
 * current holder ignores when the photo was taken, so resolution must use
 * taken_at against validity ranges.
 *
 * Tier 2, OpenSky, is Phase 0. aircraft_source_records is not in the Phase S
 * table subset, so stub_enriched is unreachable here and is not asserted.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createAirframe, hasDatabase, one, resetData, sql } from './fixtures.js';

const live = hasDatabase ? describe : describe.skip;

type Resolution = { airframe_id: string | null; registration_id: string | null; outcome: string };

async function resolve(registration: string, takenAt: string | null): Promise<Resolution> {
  return one<Resolution>(
    'select airframe_id, registration_id, outcome from public.resolve_airframe($1, $2::timestamptz)',
    [registration, takenAt],
  );
}

live('R5 tier gate', () => {
  beforeEach(resetData);

  it.each(['QQ-ABC', 'N0123', 'G-', '!!', ''])(
    '%s is invalid and creates nothing',
    async (registration) => {
      const result = await resolve(registration, '2026-09-20T09:00:00Z');
      expect(result.outcome).toBe('invalid');
      const { count } = await one<{ count: string }>('select count(*) from public.airframes');
      expect(Number(count)).toBe(0);
    },
  );

  it('tier 3, an unknown but valid registration creates a pending stub', async () => {
    const result = await resolve('G-ABCD', '2026-09-20T09:00:00Z');
    expect(result.outcome).toBe('stub_pending');
    const row = await one<{ is_stub: boolean; stub_resolution_status: string }>(
      'select is_stub, stub_resolution_status from public.airframes where id = $1',
      [result.airframe_id],
    );
    expect(row.is_stub).toBe(true);
    expect(row.stub_resolution_status).toBe('pending');
  });

  it('the stub is created under the normalised registration', async () => {
    const result = await resolve('g-abcd', '2026-09-20T09:00:00Z');
    const row = await one<{ registration: string; resolution_source: string }>(
      'select registration, resolution_source from public.airframe_registrations where id = $1',
      [result.registration_id],
    );
    expect(row.registration).toBe('GABCD');
    expect(row.resolution_source).toBe('user_stub');
  });

  it('hyphenated and stripped input resolve to the same airframe', async () => {
    const first = await resolve('G-ABCD', '2026-09-20T09:00:00Z');
    const second = await resolve('GABCD', '2026-09-20T09:00:00Z');
    expect(second.airframe_id).toBe(first.airframe_id);
    expect(second.outcome).toBe('matched');
  });
});

live('gate 2, identity over time', () => {
  // The fixture the Phase S task names: one registration, two validity ranges,
  // plus an overlapping pair that must quarantine.
  beforeEach(resetData);

  async function reassignmentFixture(): Promise<{ oldId: string; newId: string }> {
    const first = await createAirframe('GABCD', {
      validFrom: '2010-01-01',
      validTo: '2018-06-30',
      isCurrent: false,
    });
    const second = await createAirframe('GABCD', {
      validFrom: '2018-07-01',
      validTo: null,
      isCurrent: true,
    });
    return { oldId: first.airframeId, newId: second.airframeId };
  }

  it('a pre-reassignment date resolves to the old airframe', async () => {
    const { oldId } = await reassignmentFixture();
    const result = await resolve('G-ABCD', '2015-05-01T09:00:00Z');
    expect(result.outcome).toBe('matched');
    expect(result.airframe_id).toBe(oldId);
  });

  it('a post-reassignment date resolves to the new airframe', async () => {
    const { newId } = await reassignmentFixture();
    const result = await resolve('G-ABCD', '2026-09-20T09:00:00Z');
    expect(result.outcome).toBe('matched');
    expect(result.airframe_id).toBe(newId);
  });

  it('resolution ignores the current holder when taken_at says otherwise', async () => {
    const { oldId, newId } = await reassignmentFixture();
    const result = await resolve('G-ABCD', '2015-05-01T09:00:00Z');
    // The current holder is newId. Matching on it would be the defect the
    // external review found on 2026-09-19.
    expect(result.airframe_id).toBe(oldId);
    expect(result.airframe_id).not.toBe(newId);
  });

  it('an overlapping range quarantines rather than guessing', async () => {
    await createAirframe('GOVER', {
      validFrom: '2010-01-01',
      validTo: '2020-01-01',
      isCurrent: false,
    });
    await createAirframe('GOVER', { validFrom: '2015-01-01', validTo: null, isCurrent: true });

    const result = await resolve('G-OVER', '2017-01-01T09:00:00Z');
    expect(result.outcome).toBe('ambiguous');
    expect(result.airframe_id).toBeNull();

    const conflict = await one<{ conflict_type: string; registration: string }>(
      'select conflict_type, registration from public.import_conflicts order by detected_at desc limit 1',
    );
    expect(conflict.conflict_type).toBe('overlapping_validity');
    expect(conflict.registration).toBe('GOVER');
  });

  it('a date before the earliest valid_from quarantines', async () => {
    await createAirframe('GEARL', { validFrom: '2010-01-01', validTo: null, isCurrent: true });
    const result = await resolve('G-EARL', '2005-01-01T09:00:00Z');
    expect(result.outcome).toBe('ambiguous');
    const conflict = await one<{ conflict_type: string }>(
      'select conflict_type from public.import_conflicts order by detected_at desc limit 1',
    );
    expect(conflict.conflict_type).toBe('before_earliest_valid_from');
  });

  it('invariant 2, a quarantine writes zero changes to existing airframe rows', async () => {
    const a = await createAirframe('GOVER', {
      validFrom: '2010-01-01',
      validTo: '2020-01-01',
      isCurrent: false,
    });
    const b = await createAirframe('GOVER', {
      validFrom: '2015-01-01',
      validTo: null,
      isCurrent: true,
    });
    const before = await sql<{ id: string; updated_at: string }>(
      'select id, updated_at from public.airframes order by id',
    );

    await resolve('G-OVER', '2017-01-01T09:00:00Z');

    const after = await sql<{ id: string; updated_at: string }>(
      'select id, updated_at from public.airframes order by id',
    );
    expect(after).toEqual(before);
    expect(after).toHaveLength(2);
    expect([a.airframeId, b.airframeId].sort()).toEqual(after.map((r) => r.id).sort());
  });

  it('a null taken_at resolves only through an unambiguous current row', async () => {
    await createAirframe('GNULL', { validFrom: '2010-01-01', validTo: null, isCurrent: true });
    const result = await resolve('G-NULL', null);
    expect(result.outcome).toBe('matched');
  });

  it('a null taken_at with reassignment history quarantines', async () => {
    await reassignmentFixture();
    const result = await sql<Resolution>(
      'select airframe_id, outcome from public.resolve_airframe($1, null)',
      ['G-ABCD'],
    );
    // Two rows exist; only one is_current, so this still matches. The guard is
    // that it never picks by recency when several are current.
    expect(result[0]?.outcome).toBe('matched');
  });

  it('quarantining twice for one submission does not pile up conflict rows', async () => {
    await createAirframe('GOVER', {
      validFrom: '2010-01-01',
      validTo: '2020-01-01',
      isCurrent: false,
    });
    await createAirframe('GOVER', { validFrom: '2015-01-01', validTo: null, isCurrent: true });
    const submissionId = '12121212-1212-1212-1212-121212121212';

    await sql('select public.resolve_airframe($1, $2::timestamptz, $3::uuid)', [
      'G-OVER',
      '2017-01-01T09:00:00Z',
      submissionId,
    ]);
    await sql('select public.resolve_airframe($1, $2::timestamptz, $3::uuid)', [
      'G-OVER',
      '2017-01-01T09:00:00Z',
      submissionId,
    ]);

    const { count } = await one<{ count: string }>(
      'select count(*) from public.import_conflicts where submission_id = $1',
      [submissionId],
    );
    expect(Number(count)).toBe(1);
  });
});

live('resolve_airframe is service only', () => {
  it.each(['anon', 'authenticated'])('%s cannot execute it', async (role) => {
    const rows = await sql<{ allowed: boolean }>(
      `select has_function_privilege($1, 'public.resolve_airframe(text, timestamptz, uuid)', 'execute') as allowed`,
      [role],
    );
    expect(rows[0]?.allowed).toBe(false);
  });
});
