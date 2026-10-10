/**
 * Reproductions for the second code review, 2026-09-21.
 * Author CKC. Version 1.0.
 *
 * Each test asserts the correct behaviour. All eight findings were fixed on
 * 2026-10-10, so every test here is a plain regression.
 *
 * Finding 2, the reconcile race, cannot be reproduced on the unfixed code
 * from a test because the window sits inside one plpgsql body. Its test
 * proves the lock the fix adds does not deadlock against a concurrent
 * receipt and that accepted wins. Finding 5, display_geo, CKC ruled null
 * for Phase S on 2026-10-10.
 */
import { FakeStorage } from './fake-storage.js';
import { Client } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';
import { runOnce } from '@planespotter/shared/publish/runner';
import {
  DATABASE_URL,
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

  it('is not re-claimed on the next tick', async () => {
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

  it('publishes on the corrected revision instead of failing forever', async () => {
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

  it('reconciles to skipped when the only token lost permission before fanout', async () => {
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
  it('is a no-op with two nulls rather than a plpgsql error', async () => {
    await expect(sql('select public.app_lock_identity(null, null)')).resolves.toBeDefined();
  });
});

live('finding 7, publish_resolve is fenced on stage', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('refuses to re-resolve a job that is already verified', async () => {
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

live('finding 5, display_geo is not the captured point', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('publishes with captured_geo private and display_geo null', async () => {
    const user = await createUser(uniqueHandle('geo'));
    await createAirframe('GGEOX', { validFrom: '2000-01-01', validTo: null, isCurrent: true });
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: 'G-GEOX',
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
      captured_geo: { latitude: 51.4775, longitude: -0.4614 },
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    const run = await runOnce(publishDb, new FakeStorage());
    expect(run?.reachedStage).toBe('committed');

    const row = await one<{ has_captured: boolean; has_display: boolean }>(
      `select captured_geo is not null as has_captured, display_geo is not null as has_display
         from public.sightings where submission_id = $1`,
      [id],
    );
    expect(row.has_captured).toBe(true);
    expect(row.has_display).toBe(false);
  });
});

live('finding 3, the zero-delivery close respects the materialise limit', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('does not skip an eligible event that is merely past the limit', async () => {
    const author = await createUser(uniqueHandle('lb'));
    const followers = await Promise.all([
      createUser(uniqueHandle('lf')),
      createUser(uniqueHandle('lg')),
      createUser(uniqueHandle('lh')),
    ]);
    const { airframeId } = await createAirframe('GLIMT', {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    for (const [i, f] of followers.entries()) {
      await sql(
        `insert into public.follows (user_id, target_type, target_id) values ($1, 'airframe', $2)`,
        [f, airframeId],
      );
      await sql(
        `insert into public.device_push_tokens (user_id, token, platform, permission_state)
         values ($1, $2, 'ios', 'granted')`,
        [f, `ExponentPushToken[limit${i}]`],
      );
    }
    const submission = await createSubmissionAs(author, {
      client_submission_id: nextClientId(),
      registration_text: 'G-LIMT',
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    // Three pending events, a limit of one. Two events have zero rows after
    // this tick and both are still eligible, so neither may be closed.
    await sql('select public.materialize_deliveries(1)');
    const states = await sql<{ status: string; n: string }>(
      'select status, count(*) as n from public.alert_events group by status',
    );
    expect(states).toEqual([{ status: 'pending', n: '3' }]);

    // The backlog drains on later ticks.
    await sql('select public.materialize_deliveries(1)');
    await sql('select public.materialize_deliveries(1)');
    const { n } = await one<{ n: string }>('select count(*) as n from public.alert_deliveries');
    expect(Number(n)).toBe(3);
  });
});

live('finding 2, reconcile_alert_event holds the event row', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('a concurrent receipt waits for the reconciler and accepted wins', async () => {
    const author = await createUser(uniqueHandle('ra'));
    const follower = await createUser(uniqueHandle('rf'));
    const { airframeId } = await createAirframe('GRACE', {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await sql(
      `insert into public.follows (user_id, target_type, target_id) values ($1, 'airframe', $2)`,
      [follower, airframeId],
    );
    for (const t of ['ExponentPushToken[race1]', 'ExponentPushToken[race2]']) {
      await sql(
        `insert into public.device_push_tokens (user_id, token, platform, permission_state)
         values ($1, $2, 'ios', 'granted')`,
        [follower, t],
      );
    }
    const submission = await createSubmissionAs(author, {
      client_submission_id: nextClientId(),
      registration_text: 'G-RACE',
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());
    await sql('select public.materialize_deliveries()');

    const event = await one<{ id: string }>('select id from public.alert_events');
    const deliveries = await sql<{ id: string }>(
      'select id from public.alert_deliveries order by id',
    );
    expect(deliveries).toHaveLength(2);
    const [d1, d2] = deliveries as [{ id: string }, { id: string }];
    const claimed = await sql<{ id: string; send_attempt_id: string }>(
      'select * from public.claim_deliveries($1::uuid[])',
      [[d1.id, d2.id]],
    );
    for (const c of claimed) {
      await sql('select public.record_delivery_ticket($1, $2, $3)', [c.id, c.send_attempt_id, 't']);
    }
    await sql('select public.mark_alert_event_sent($1)', [event.id]);

    // Session A rejects d1 and reconciles inside an open transaction. With the
    // fix the reconciler now holds the alert_events row until commit.
    const a = new Client({ connectionString: DATABASE_URL });
    await a.connect();
    try {
      await a.query('begin');
      await a.query(
        `update public.alert_deliveries set status = 'provider_rejected' where id = $1`,
        [d1.id],
      );
      const mid = await a.query('select public.reconcile_alert_event($1) as s', [event.id]);
      expect((mid.rows[0] as { s: string }).s).toBe('sent');

      // Session B accepts d2. Its reconcile must block on A's row lock rather
      // than count under A's uncommitted write, and must not deadlock.
      let settled = false;
      const b = sql('select public.record_delivery_receipt($1, $2)', [d2.id, 'ok']).then(() => {
        settled = true;
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(settled).toBe(false);

      await a.query('commit');
      await b;
      expect(settled).toBe(true);
    } finally {
      await a.end();
    }

    const after = await one<{ status: string }>(
      'select status from public.alert_events where id = $1',
      [event.id],
    );
    expect(after.status).toBe('provider_accepted');
  });
});
