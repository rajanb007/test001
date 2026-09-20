/**
 * Alert enqueue, send, recovery and receipts. BuildPack v1.8 section 6.
 * Author CKC. Version 1.0.
 *
 * This is the push chain minus the APNs hop. Gate 3 additionally needs one
 * real push to a physical device, which no test here can supply.
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
  uniqueHandle,
  one,
  readyForPublish,
  resetData,
  sql,
  withClient,
} from './fixtures.js';
import { publishDb } from './publish-db.js';

const live = hasDatabase ? describe : describe.skip;

let counter = 0;
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nextRegistration = (): string => {
  counter += 1;
  return `GA${letters[Math.floor(counter / 26) % 26]}${letters[counter % 26]}A`;
};

async function follow(userId: string, airframeId: string, via = 'deliberate'): Promise<void> {
  await sql(
    `insert into public.follows (user_id, target_type, target_id, created_via)
     values ($1, 'airframe', $2, $3) on conflict do nothing`,
    [userId, airframeId, via],
  );
}

async function givePushToken(userId: string, token: string, permission = 'granted'): Promise<void> {
  await sql(
    `insert into public.device_push_tokens (user_id, token, platform, permission_state)
     values ($1, $2, 'ios', $3)
     on conflict (user_id, token) do update set permission_state = excluded.permission_state`,
    [userId, token, permission],
  );
}

/** Publishes a native sighting for a registration, returning ids. */
async function publishSighting(options: {
  registration: string;
  authorId: string;
  takenAt?: string;
  ingestionSource?: 'native_mobile' | 'concierge_backfill';
}): Promise<{ submissionId: string; sightingId: string; airframeId: string }> {
  const { airframeId } = await createAirframe(options.registration, {
    validFrom: '2000-01-01',
    validTo: null,
    isCurrent: true,
  });
  counter += 1;
  const submission = await createSubmissionAs(options.authorId, {
    client_submission_id: `aaaabbbb-0000-0000-0000-${String(counter).padStart(12, '0')}`,
    registration_text: options.registration,
    taken_at: options.takenAt ?? new Date().toISOString(),
    airport_icao: 'EGLL',
  });
  const submissionId = submission['id'] as string;

  if (options.ingestionSource !== undefined && options.ingestionSource !== 'native_mobile') {
    await sql('update public.submissions set ingestion_source = $2 where id = $1', [
      submissionId,
      options.ingestionSource,
    ]);
  }

  await readyForPublish(submissionId);
  await sql('select public.publish_submission($1)', [submissionId]);
  const outcome = await runOnce(publishDb, new FakeStorage());
  if (outcome?.sightingId === null || outcome?.sightingId === undefined) {
    throw new Error(`publish did not commit, reached ${outcome?.reachedStage}`);
  }
  return { submissionId, sightingId: outcome.sightingId, airframeId };
}

const countAlerts = async (where = '', params: unknown[] = []): Promise<number> => {
  const { count } = await one<{ count: string }>(
    `select count(*) from public.alert_events ${where}`,
    params,
  );
  return Number(count);
};

live('section 6.1, enqueue', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('the alert row carries the airframe, the sighting and the day bucket', async () => {
    const author = await createUser(uniqueHandle('author'));
    const follower = await createUser(uniqueHandle('follower'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await follow(follower, airframeId);
    await givePushToken(follower, `ExponentPushToken[one${counter}]`);

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `99990000-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    const outcome = await runOnce(publishDb, new FakeStorage());

    const alert = await one<{
      user_id: string;
      airframe_id: string;
      sighting_id: string;
      status: string;
      window_key: string;
    }>('select user_id, airframe_id, sighting_id, status, window_key from public.alert_events');

    expect(alert.user_id).toBe(follower);
    expect(alert.airframe_id).toBe(airframeId);
    expect(alert.sighting_id).toBe(outcome?.sightingId);
    expect(alert.status).toBe('pending');
    expect(Number(alert.window_key)).toBe(Math.floor(Date.now() / 1000 / 86400));
  });

  it('enqueues exactly one alert per follower', async () => {
    const author = await createUser(uniqueHandle('a'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    const followers = [];
    for (let i = 0; i < 3; i += 1) {
      const u = await createUser(uniqueHandle('f'));
      await follow(u, airframeId);
      await givePushToken(u, `ExponentPushToken[${counter}-${i}]`);
      followers.push(u);
    }

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `bbbbcccc-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    expect(await countAlerts()).toBe(3);
    for (const f of followers) {
      expect(await countAlerts('where user_id = $1', [f])).toBe(1);
    }
  });

  it('never alerts the author of the sighting', async () => {
    const author = await createUser(uniqueHandle('selfa'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await follow(author, airframeId);
    await givePushToken(author, `ExponentPushToken[self${counter}]`);

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `ccccdddd-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    expect(await countAlerts()).toBe(0);
  });

  it('A11, an onboarding follow fans out exactly like a deliberate one', async () => {
    const author = await createUser(uniqueHandle('oa'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    const onboarded = await createUser(uniqueHandle('onb'));
    await follow(onboarded, airframeId, 'onboarding');
    await givePushToken(onboarded, `ExponentPushToken[onb${counter}]`);

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `ddddeeee-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    expect(await countAlerts()).toBe(1);
  });

  it('a follower without a granted token gets nothing', async () => {
    const author = await createUser(uniqueHandle('na'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    const quiet = await createUser(uniqueHandle('quiet'));
    await follow(quiet, airframeId);
    await givePushToken(quiet, `ExponentPushToken[q${counter}]`, 'denied');

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `eeeeffff-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    expect(await countAlerts()).toBe(0);
  });

  it('R6, freshness, a taken_at older than 7 days publishes and alerts nobody', async () => {
    const author = await createUser(uniqueHandle('fa'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    const watcher = await createUser(uniqueHandle('fw'));
    await follow(watcher, airframeId);
    await givePushToken(watcher, `ExponentPushToken[fw${counter}]`);

    counter += 1;
    const old = new Date(Date.now() - 30 * 86400_000).toISOString();
    const submission = await createSubmissionAs(author, {
      client_submission_id: `ffff0000-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: old,
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    const outcome = await runOnce(publishDb, new FakeStorage());

    // It publishes. It just never alerts.
    expect(outcome?.reachedStage).toBe('committed');
    expect(await countAlerts()).toBe(0);
  });

  it('invariant 5, provenance, an archive publication alerts nobody', async () => {
    const author = await createUser(uniqueHandle('pa'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    const watcher = await createUser(uniqueHandle('pw'));
    await follow(watcher, airframeId);
    await givePushToken(watcher, `ExponentPushToken[pw${counter}]`);

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `00001111-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await sql(
      `update public.submissions set ingestion_source = 'concierge_backfill' where id = $1`,
      [id],
    );
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    const outcome = await runOnce(publishDb, new FakeStorage());

    expect(outcome?.reachedStage).toBe('committed');
    expect(await countAlerts()).toBe(0);
  });
});

live('invariant 7, one alert per user per airframe per 24 hour bucket', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('two publishes of one airframe in one bucket yield one alert per follower', async () => {
    const author = await createUser(uniqueHandle('rl'));
    const follower = await createUser(uniqueHandle('rlf'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await follow(follower, airframeId);
    await givePushToken(follower, `ExponentPushToken[rl${counter}]`);

    for (let i = 0; i < 2; i += 1) {
      counter += 1;
      const submission = await createSubmissionAs(author, {
        client_submission_id: `11112222-0000-0000-0000-${String(counter).padStart(12, '0')}`,
        registration_text: registration,
        taken_at: new Date().toISOString(),
        airport_icao: 'EGLL',
      });
      const id = submission['id'] as string;
      await readyForPublish(id);
      await sql('select public.publish_submission($1)', [id]);
      await runOnce(publishDb, new FakeStorage());
    }

    expect(await countAlerts()).toBe(1);
    const { count } = await one<{ count: string }>('select count(*) from public.sightings');
    expect(Number(count)).toBe(2);
  });

  it('the unique index is what enforces it, not a lookup', async () => {
    const user = await createUser(uniqueHandle('uq'));
    const { airframeId } = await createAirframe(nextRegistration(), {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    const author = await createUser(uniqueHandle('uqa'));
    const published = await publishSighting({ registration: nextRegistration(), authorId: author });

    await sql(
      `insert into public.alert_events (user_id, airframe_id, sighting_id, window_key)
       values ($1, $2, $3, 1)`,
      [user, airframeId, published.sightingId],
    );

    await expect(
      sql(
        `insert into public.alert_events (user_id, airframe_id, sighting_id, window_key)
         values ($1, $2, $3, 1)`,
        [user, airframeId, published.sightingId],
      ),
    ).rejects.toThrow(/alert_events_user_id_airframe_id_window_key_key/);
  });
});

live('section 6.2, send and bounded recovery', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  /** An enqueued alert with one delivery row ready to claim. */
  async function pendingDelivery(): Promise<{ alertId: string; deliveryId: string }> {
    const author = await createUser(uniqueHandle('sa'));
    const follower = await createUser(uniqueHandle('sf'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await follow(follower, airframeId);
    await givePushToken(follower, `ExponentPushToken[s${counter}]`);

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `22223333-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());

    await sql('select public.materialize_deliveries()');
    const alert = await one<{ id: string }>('select id from public.alert_events');
    const delivery = await one<{ id: string }>('select id from public.alert_deliveries');
    return { alertId: alert.id, deliveryId: delivery.id };
  }

  it('materialises one delivery per token and is idempotent', async () => {
    await pendingDelivery();
    await sql('select public.materialize_deliveries()');
    await sql('select public.materialize_deliveries()');
    const { count } = await one<{ count: string }>('select count(*) from public.alert_deliveries');
    expect(Number(count)).toBe(1);
  });

  it('claims pending only and returns a fresh attempt id', async () => {
    const { deliveryId } = await pendingDelivery();
    const claimed = await sql<{ id: string; token: string; send_attempt_id: string }>(
      'select * from public.claim_deliveries($1::uuid[])',
      [[deliveryId]],
    );
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.send_attempt_id).toBeTruthy();

    // A second claim of the same row returns nothing: it is no longer pending.
    const again = await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    expect(again).toHaveLength(0);
  });

  it('normal fanout never reclaims an expired sending row', async () => {
    const { deliveryId } = await pendingDelivery();
    await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    await sql(
      `update public.alert_deliveries set sending_lease_until = now() - interval '5 minutes' where id = $1`,
      [deliveryId],
    );

    const again = await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    expect(again).toHaveLength(0);
  });

  it('a ticket from the current attempt is recorded', async () => {
    const { deliveryId } = await pendingDelivery();
    const claimed = await sql<{ send_attempt_id: string }>(
      'select * from public.claim_deliveries($1::uuid[])',
      [[deliveryId]],
    );
    const ok = await one<{ record_delivery_ticket: boolean }>(
      'select public.record_delivery_ticket($1, $2, $3)',
      [deliveryId, claimed[0]?.send_attempt_id, 'ticket-abc'],
    );
    expect(ok.record_delivery_ticket).toBe(true);

    const row = await one<{ status: string; expo_ticket_id: string }>(
      'select status, expo_ticket_id from public.alert_deliveries where id = $1',
      [deliveryId],
    );
    expect(row.status).toBe('sent');
    expect(row.expo_ticket_id).toBe('ticket-abc');
  });

  it('a stale attempt response cannot overwrite a newer attempt', async () => {
    const { deliveryId } = await pendingDelivery();
    await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);

    const ok = await one<{ record_delivery_ticket: boolean }>(
      'select public.record_delivery_ticket($1, $2, $3)',
      [deliveryId, '00000000-0000-0000-0000-000000000000', 'ghost-ticket'],
    );
    expect(ok.record_delivery_ticket).toBe(false);

    const row = await one<{ expo_ticket_id: string | null }>(
      'select expo_ticket_id from public.alert_deliveries where id = $1',
      [deliveryId],
    );
    expect(row.expo_ticket_id).toBeNull();
  });

  it('recovery refuses before ten minutes have elapsed', async () => {
    const { deliveryId } = await pendingDelivery();
    await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    await sql(
      `update public.alert_deliveries set sending_lease_until = now() - interval '1 minute' where id = $1`,
      [deliveryId],
    );

    const recovered = await sql('select * from public.recover_delivery($1)', [deliveryId]);
    expect(recovered).toHaveLength(0);
  });

  it('exactly one recovery retry is allowed, never a third attempt', async () => {
    const { deliveryId } = await pendingDelivery();
    await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    const uncertain = `update public.alert_deliveries
       set sending_lease_until = now() - interval '1 minute',
           sent_attempt_at = now() - interval '11 minutes'
       where id = $1`;
    await sql(uncertain, [deliveryId]);

    const first = await sql('select * from public.recover_delivery($1)', [deliveryId]);
    expect(first).toHaveLength(1);

    await sql(uncertain, [deliveryId]);
    const second = await sql('select * from public.recover_delivery($1)', [deliveryId]);
    expect(second).toHaveLength(0);

    const row = await one<{ retry_count: number }>(
      'select retry_count from public.alert_deliveries where id = $1',
      [deliveryId],
    );
    expect(row.retry_count).toBe(1);
  });

  it('two concurrent recoverers claim exactly one retry', async () => {
    const { deliveryId } = await pendingDelivery();
    await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    await sql(
      `update public.alert_deliveries
          set sending_lease_until = now() - interval '1 minute',
              sent_attempt_at = now() - interval '11 minutes'
        where id = $1`,
      [deliveryId],
    );

    const attempts = await Promise.all(
      Array.from({ length: 4 }, () =>
        withClient(async (client) => {
          const result = await client.query('select * from public.recover_delivery($1)', [
            deliveryId,
          ]);
          return result.rowCount ?? 0;
        }),
      ),
    );
    expect(attempts.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('a second uncertain outcome becomes ticket_lost', async () => {
    const { deliveryId } = await pendingDelivery();
    await sql('select * from public.claim_deliveries($1::uuid[])', [[deliveryId]]);
    const uncertain = `update public.alert_deliveries
       set sending_lease_until = now() - interval '1 minute',
           sent_attempt_at = now() - interval '11 minutes'
       where id = $1`;
    await sql(uncertain, [deliveryId]);
    await sql('select * from public.recover_delivery($1)', [deliveryId]);
    await sql(uncertain, [deliveryId]);

    const lost = await one<{ fail_delivery_ticket_lost: boolean }>(
      'select public.fail_delivery_ticket_lost($1)',
      [deliveryId],
    );
    expect(lost.fail_delivery_ticket_lost).toBe(true);

    const row = await one<{ status: string; failure_reason: string }>(
      'select status, failure_reason from public.alert_deliveries where id = $1',
      [deliveryId],
    );
    expect(row.status).toBe('failed');
    expect(row.failure_reason).toBe('ticket_lost');
  });

  it('the retry_count check constraint makes a third attempt impossible', async () => {
    const { deliveryId } = await pendingDelivery();
    await expect(
      sql('update public.alert_deliveries set retry_count = 2 where id = $1', [deliveryId]),
    ).rejects.toThrow(/retry_count/);
  });
});

live('section 6.3, receipts and reconciliation, R9', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  async function sentDelivery(): Promise<{ alertId: string; deliveryId: string }> {
    const author = await createUser(uniqueHandle('ra'));
    const follower = await createUser(uniqueHandle('rf'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });
    await follow(follower, airframeId);
    await givePushToken(follower, `ExponentPushToken[r${counter}]`);

    counter += 1;
    const submission = await createSubmissionAs(author, {
      client_submission_id: `33334444-0000-0000-0000-${String(counter).padStart(12, '0')}`,
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());
    await sql('select public.materialize_deliveries()');

    const delivery = await one<{ id: string }>('select id from public.alert_deliveries');
    const claimed = await sql<{ send_attempt_id: string }>(
      'select * from public.claim_deliveries($1::uuid[])',
      [[delivery.id]],
    );
    await sql('select public.record_delivery_ticket($1, $2, $3)', [
      delivery.id,
      claimed[0]?.send_attempt_id,
      `ticket-${counter}`,
    ]);
    const alert = await one<{ id: string }>('select id from public.alert_events');
    return { alertId: alert.id, deliveryId: delivery.id };
  }

  it('an ok receipt sets provider_accepted on the delivery and the event', async () => {
    const { alertId, deliveryId } = await sentDelivery();
    await sql('select public.record_delivery_receipt($1, $2)', [deliveryId, 'ok']);

    const delivery = await one<{ status: string; provider_receipt_at: string | null }>(
      'select status, provider_receipt_at from public.alert_deliveries where id = $1',
      [deliveryId],
    );
    expect(delivery.status).toBe('provider_accepted');
    expect(delivery.provider_receipt_at).not.toBeNull();

    const event = await one<{ status: string }>(
      'select status from public.alert_events where id = $1',
      [alertId],
    );
    expect(event.status).toBe('provider_accepted');
  });

  it('DeviceNotRegistered deletes the dead token', async () => {
    const { deliveryId } = await sentDelivery();
    const before = await one<{ count: string }>('select count(*) from public.device_push_tokens');
    expect(Number(before.count)).toBe(1);

    await sql('select public.record_delivery_receipt($1, $2)', [deliveryId, 'DeviceNotRegistered']);

    const after = await one<{ count: string }>('select count(*) from public.device_push_tokens');
    expect(Number(after.count)).toBe(0);
  });

  it('a delayed acknowledgement cannot demote an accepted event', async () => {
    const { alertId, deliveryId } = await sentDelivery();
    await sql('select public.record_delivery_receipt($1, $2)', [deliveryId, 'ok']);

    // A second, later reconcile with the delivery forced to rejected.
    await sql(`update public.alert_deliveries set status = 'provider_rejected' where id = $1`, [
      deliveryId,
    ]);
    await sql('select public.reconcile_alert_event($1)', [alertId]);

    const event = await one<{ status: string }>(
      'select status from public.alert_events where id = $1',
      [alertId],
    );
    expect(event.status).toBe('provider_accepted');
  });

  it('nothing in the delivery or event enum is called delivered, R9', async () => {
    const labels = await sql<{ label: string }>(
      `select e.enumlabel as label
         from pg_enum e join pg_type t on t.oid = e.enumtypid
        where t.typname in ('delivery_status', 'alert_event_status')`,
    );
    for (const row of labels) {
      expect(row.label.toLowerCase()).not.toContain('deliver');
    }
    expect(labels.length).toBeGreaterThan(0);
  });

  it('section 6.4, the open is recorded and attribution is separate', async () => {
    const { alertId } = await sentDelivery();
    const owner = await one<{ user_id: string }>(
      'select user_id from public.alert_events where id = $1',
      [alertId],
    );

    await withClient(async (client) => {
      await client.query('select set_config($1, $2, false)', [
        'request.jwt.claims',
        JSON.stringify({ sub: owner.user_id, role: 'authenticated' }),
      ]);
      await client.query('select public.mark_alert_opened($1)', [alertId]);
      await client.query('select public.mark_alert_attributed($1)', [alertId]);
    });

    const event = await one<{ opened_at: string | null; session_attributed_at: string | null }>(
      'select opened_at, session_attributed_at from public.alert_events where id = $1',
      [alertId],
    );
    expect(event.opened_at).not.toBeNull();
    expect(event.session_attributed_at).not.toBeNull();
  });

  it('a user cannot mark another user alert opened', async () => {
    const { alertId } = await sentDelivery();
    const stranger = await createUser(uniqueHandle('stranger'));

    await withClient(async (client) => {
      await client.query('select set_config($1, $2, false)', [
        'request.jwt.claims',
        JSON.stringify({ sub: stranger, role: 'authenticated' }),
      ]);
      await client.query('select public.mark_alert_opened($1)', [alertId]);
    });

    const event = await one<{ opened_at: string | null }>(
      'select opened_at from public.alert_events where id = $1',
      [alertId],
    );
    expect(event.opened_at).toBeNull();
  });
});
