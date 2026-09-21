/**
 * Reproductions for the second code review, 2026-09-21.
 * Author CKC. Version 1.0.
 *
 * Each test asserts the CORRECT behaviour and is marked it.fails while the
 * defect stands. When a fix lands, drop the .fails on that test so it turns
 * into a plain regression. A test that starts passing while still marked
 * it.fails errors, so a fix cannot land silently.
 *
 * Findings 2 (reconcile race) and 5 (display_geo) have no test here. The race
 * needs two sessions, display_geo needs a CKC ruling on derivation first.
 */
import { FakeStorage } from './fake-storage.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { runOnce } from '@planespotter/shared/publish/runner';
import {
  createAirframe,
  createAirport,
  createSubmissionAs,
  createUser,
  hasDatabase,
  one,
  readyForPublish,
  resetData,
  sql,
  uniqueHandle,
} from './fixtures.js';
import { publishDb } from './publish-db.js';

const live = hasDatabase ? describe : describe.skip;
let counter = 0;
const nextClientId = (): string => `55556666-0000-0000-0000-${String(++counter).padStart(12, '0')}`;

async function parkedOnInvalid(): Promise<string> {
  const user = await createUser(uniqueHandle('park'));
  const submission = await createSubmissionAs(user, {
    client_submission_id: nextClientId(),
    registration_text: 'QQ-ZZZ',
    taken_at: new Date().toISOString(),
    airport_icao: 'EGLL',
  });
  const id = submission['id'] as string;
  await readyForPublish(id);
  await sql('select public.publish_submission($1)', [id]);
  const first = await runOnce(publishDb, new FakeStorage());
  expect(first?.reachedStage).toBe('waiting_authorization');
  return id;
}

live('finding 1, a parked job is excluded from worker selection', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it.fails('is not re-claimed on the next tick', async () => {
    const id = await parkedOnInvalid();
    const before = await one<{ attempts: number }>(
      'select attempts from public.publish_jobs where submission_id = $1',
      [id],
    );

    const second = await runOnce(publishDb, new FakeStorage());
    expect(second).toBeNull();

    const after = await one<{ attempts: number; stage: string }>(
      'select attempts, stage from public.publish_jobs where submission_id = $1',
      [id],
    );
    expect(after.attempts).toBe(before.attempts);
    expect(after.stage).toBe('waiting_authorization');
  });
});

live('finding 4, re-approval after a park stamps the current revision', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it.fails('publishes on the corrected revision instead of failing forever', async () => {
    const id = await parkedOnInvalid();

    // The user corrects the registration. A real edit bumps the revision and
    // clears approval in one statement, which the check constraint permits.
    await createAirframe('GABCD', { validFrom: '2000-01-01', validTo: null, isCurrent: true });
    await sql(
      `update public.submissions
          set registration_text = 'G-ABCD', content_revision = content_revision + 1,
              approved_revision = null, approval_kind = null, approved_at = null, approved_by = null
        where id = $1`,
      [id],
    );
    // awaiting_identification -> awaiting_review is the documented path, then approve.
    await sql(`select public.advance_submission($1, 'awaiting_review')`, [id]);
    await sql('select public.app_fixture_approve_submission($1)', [id]);

    const outcome = await runOnce(publishDb, new FakeStorage());
    expect(outcome?.reachedStage).toBe('committed');

    const job = await one<{ submission_revision: number }>(
      'select submission_revision from public.publish_jobs where submission_id = $1',
      [id],
    );
    expect(Number(job.submission_revision)).toBe(2);
  });
});

live('finding 3, an event that produces no deliveries is closed, not stranded', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it.fails('reconciles to skipped when the only token lost permission before fanout', async () => {
    const author = await createUser(uniqueHandle('za'));
    const follower = await createUser(uniqueHandle('zf'));
    const { airframeId } = await createAirframe('GSTRD', {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await sql(
      `insert into public.follows (user_id, target_type, target_id) values ($1, 'airframe', $2)`,
      [follower, airframeId],
    );
    await sql(
      `insert into public.device_push_tokens (user_id, token, platform, permission_state)
       values ($1, 'ExponentPushToken[strand]', 'ios', 'granted')`,
      [follower],
    );
    const submission = await createSubmissionAs(author, {
      client_submission_id: nextClientId(),
      registration_text: 'G-STRD',
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    const enqueued = await one<{ status: string }>('select status from public.alert_events');
    expect(enqueued.status).toBe('pending');

    // Permission revoked between enqueue and the first fanout tick.
    await sql(`update public.device_push_tokens set permission_state = 'denied'`);
    const materialised = await sql('select public.materialize_deliveries()');
    expect(materialised).toHaveLength(0);

    const after = await one<{ status: string }>('select status from public.alert_events');
    expect(after.status).toBe('skipped');
  });
});

live('finding 6, the identity lock helper tolerates no identity', () => {
  it.fails('is a no-op with two nulls rather than a plpgsql error', async () => {
    await expect(sql('select public.app_lock_identity(null, null)')).resolves.toBeDefined();
  });
});

live('finding 7, publish_resolve is fenced on stage', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it.fails('refuses to re-resolve a job that is already verified', async () => {
    const user = await createUser(uniqueHandle('fence'));
    await createAirframe('GFNCE', { validFrom: '2000-01-01', validTo: null, isCurrent: true });
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: 'G-FNCE',
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);

    const run = await runOnce(publishDb, new FakeStorage(), { stopAfter: 'verified' });
    expect(run?.reachedStage).toBe('verified');
    const job = await one<{ lease_token: string }>(
      'select lease_token from public.publish_jobs where id = $1',
      [run!.jobId],
    );

    await expect(publishDb.resolve(run!.jobId, job.lease_token)).rejects.toThrow();

    const stage = await one<{ stage: string }>(
      'select stage from public.publish_jobs where id = $1',
      [run!.jobId],
    );
    expect(stage.stage).toBe('verified');
  });
});
