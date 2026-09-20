/**
 * create_submission, advance_submission and the transition guard, live.
 * Author CKC. Version 1.0.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createAirport,
  createSubmissionAs,
  createUser,
  hasDatabase,
  one,
  resetData,
  sql,
} from './fixtures.js';

const live = hasDatabase ? describe : describe.skip;

live('create_submission', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('creates one submission in state received', async () => {
    const user = await createUser('ckc');
    const out = await createSubmissionAs(user, {
      client_submission_id: '11111111-1111-1111-1111-111111111111',
      registration_text: 'G-ABCD',
      taken_at: '2026-09-20T09:00:00.000Z',
      airport_icao: 'EGLL',
      caption: 'Morning arrival',
    });
    expect(out['state']).toBe('received');
    expect(out['registration_text']).toBe('G-ABCD');
    expect(out['caption']).toBe('Morning arrival');
  });

  it('invariant 1, repeated calls produce exactly one submission', async () => {
    const user = await createUser('ckc');
    const payload = { client_submission_id: '22222222-2222-2222-2222-222222222222' };

    const first = await createSubmissionAs(user, payload);
    const second = await createSubmissionAs(user, payload);
    const third = await createSubmissionAs(user, payload);

    expect(second['id']).toBe(first['id']);
    expect(third['id']).toBe(first['id']);

    const { count } = await one<{ count: string }>('select count(*) from public.submissions');
    expect(Number(count)).toBe(1);
  });

  it('a retry writes no second audit row', async () => {
    const user = await createUser('ckc');
    const payload = { client_submission_id: '33333333-3333-3333-3333-333333333333' };
    await createSubmissionAs(user, payload);
    await createSubmissionAs(user, payload);

    const { count } = await one<{ count: string }>(
      'select count(*) from public.moderation_actions',
    );
    expect(Number(count)).toBe(1);
  });

  it('two users may use the same client_submission_id', async () => {
    const a = await createUser('one');
    const b = await createUser('two');
    const payload = { client_submission_id: '44444444-4444-4444-4444-444444444444' };
    const first = await createSubmissionAs(a, payload);
    const second = await createSubmissionAs(b, payload);
    expect(second['id']).not.toBe(first['id']);
  });

  it('section 4, the response carries no approval metadata', async () => {
    const user = await createUser('ckc');
    const out = await createSubmissionAs(user, {
      client_submission_id: '55555555-5555-5555-5555-555555555555',
    });
    for (const forbidden of [
      'approved_by',
      'approval_kind',
      'approved_revision',
      'approved_at',
      'lease_token',
      'content_revision',
      'review_required',
      'captured_geo',
    ]) {
      expect(out).not.toHaveProperty(forbidden);
    }
    expect(out).toHaveProperty('is_approved', false);
  });

  it('section 5.5, a client cannot set state or approval fields', async () => {
    const user = await createUser('ckc');
    const out = await createSubmissionAs(user, {
      client_submission_id: '66666666-6666-6666-6666-666666666666',
      state: 'published',
      review_required: false,
      approved_revision: 1,
      approval_kind: 'moderator',
    });
    expect(out['state']).toBe('received');
    const row = await one<{ review_required: boolean; approved_revision: number | null }>(
      'select review_required, approved_revision from public.submissions where id = $1',
      [out['id']],
    );
    expect(row.approved_revision).toBeNull();
  });

  it('server trust decides review_required, a new user is reviewed', async () => {
    const newUser = await createUser('fresh', 'new');
    const trusted = await createUser('veteran', 'trusted');

    const a = await createSubmissionAs(newUser, {
      client_submission_id: '77777777-7777-7777-7777-777777777777',
    });
    const b = await createSubmissionAs(trusted, {
      client_submission_id: '88888888-8888-8888-8888-888888888888',
    });

    const rowA = await one<{ review_required: boolean }>(
      'select review_required from public.submissions where id = $1',
      [a['id']],
    );
    const rowB = await one<{ review_required: boolean }>(
      'select review_required from public.submissions where id = $1',
      [b['id']],
    );
    expect(rowA.review_required).toBe(true);
    expect(rowB.review_required).toBe(false);
  });

  it('stores captured_geo as a WGS 84 point without returning it', async () => {
    const user = await createUser('ckc');
    const out = await createSubmissionAs(user, {
      client_submission_id: '99999999-9999-9999-9999-999999999999',
      captured_geo: { longitude: -0.4543, latitude: 51.47 },
    });
    const row = await one<{ lon: number; lat: number }>(
      'select st_x(captured_geo::geometry) as lon, st_y(captured_geo::geometry) as lat from public.submissions where id = $1',
      [out['id']],
    );
    expect(row.lon).toBeCloseTo(-0.4543, 4);
    expect(row.lat).toBeCloseTo(51.47, 4);
  });
});

live('the guarded transition helper, invariant 10', () => {
  beforeEach(async () => {
    await resetData();
  });

  async function newSubmission(): Promise<string> {
    const user = await createUser('ckc');
    const out = await createSubmissionAs(user, {
      client_submission_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    });
    return out['id'] as string;
  }

  it('allows a transition in the SPEC section 3.3 table', async () => {
    const id = await newSubmission();
    const row = await one<{ state: string }>(
      `select state from public.advance_submission($1, 'processing')`,
      [id],
    );
    expect(row.state).toBe('processing');
  });

  it('a disallowed transition is a no-op, not an error', async () => {
    const id = await newSubmission();
    const row = await one<{ state: string }>(
      `select state from public.advance_submission($1, 'published')`,
      [id],
    );
    expect(row.state).toBe('received');
  });

  it('a disallowed transition writes no audit row', async () => {
    const id = await newSubmission();
    const before = await one<{ count: string }>('select count(*) from public.moderation_actions');
    await sql(`select public.advance_submission($1, 'published')`, [id]);
    const after = await one<{ count: string }>('select count(*) from public.moderation_actions');
    expect(after.count).toBe(before.count);
  });

  it('a repeated transition to the current state adds no duplicate audit row', async () => {
    const id = await newSubmission();
    await sql(`select public.advance_submission($1, 'processing')`, [id]);
    const before = await one<{ count: string }>('select count(*) from public.moderation_actions');
    await sql(`select public.advance_submission($1, 'processing')`, [id]);
    const after = await one<{ count: string }>('select count(*) from public.moderation_actions');
    expect(after.count).toBe(before.count);
  });

  it('every actual transition is audited with both states', async () => {
    const id = await newSubmission();
    await sql(`select public.advance_submission($1, 'processing')`, [id]);
    const row = await one<{ from_state: string; to_state: string; actor_kind: string }>(
      `select from_state, to_state, actor_kind from public.moderation_actions
        where submission_id = $1 and to_state = 'processing'`,
      [id],
    );
    expect(row.from_state).toBe('received');
    expect(row.actor_kind).toBe('system');
  });

  it('rejection clears approval and sets review_required, section 5.5', async () => {
    const id = await newSubmission();
    await sql(`select public.advance_submission($1, 'processing')`, [id]);
    await sql(`select public.advance_submission($1, 'awaiting_review')`, [id]);
    await sql(`select public.app_fixture_approve_submission($1)`, [id]);
    await sql(`select public.advance_submission($1, 'rejected', 'blurry')`, [id]);

    const row = await one<{
      approved_revision: number | null;
      approval_kind: string | null;
      review_required: boolean;
      rejection_reason: string | null;
    }>(
      'select approved_revision, approval_kind, review_required, rejection_reason from public.submissions where id = $1',
      [id],
    );
    expect(row.approved_revision).toBeNull();
    expect(row.approval_kind).toBeNull();
    expect(row.review_required).toBe(true);
    expect(row.rejection_reason).toBe('blurry');
  });

  it('the helper is not reachable by a client role', async () => {
    const id = await newSubmission();
    const denied = await sql(
      `select has_function_privilege('authenticated', 'public.app_transition_submission(uuid, submission_state, text, uuid, text, jsonb)', 'execute') as allowed`,
    );
    expect((denied[0] as { allowed: boolean }).allowed).toBe(false);
    expect(id).toBeTruthy();
  });

  it.each(['anon', 'authenticated'])('advance_submission is not executable by %s', async (role) => {
    const rows = await sql<{ allowed: boolean }>(
      `select has_function_privilege($1, 'public.advance_submission(uuid, submission_state, text)', 'execute') as allowed`,
      [role],
    );
    expect(rows[0]?.allowed).toBe(false);
  });
});
