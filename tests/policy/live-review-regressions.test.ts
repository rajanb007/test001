/**
 * Regression tests for the defects found reviewing Blocks 1 to 5.
 * Author CKC. Version 1.0.
 *
 * Every case here failed before its fix. They live together so the review
 * findings stay visible as behaviour rather than as a changelog entry.
 */
import { FakeStorage } from './fake-storage.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { runOnce } from '@planespotter/shared/publish/runner';
import { redact } from '@planespotter/shared/events';
import {
  ownerSubmissionSchema,
  utcTimestampSchema,
  uuidSchema,
} from '@planespotter/shared/schemas';
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
  withClient,
} from './fixtures.js';
import { publishDb } from './publish-db.js';

const live = hasDatabase ? describe : describe.skip;

let counter = 0;
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nextRegistration = (): string => {
  counter += 1;
  return `GR${letters[Math.floor(counter / 26) % 26]}${letters[counter % 26]}A`;
};
const nextClientId = (): string => `77778888-0000-0000-0000-${String(++counter).padStart(12, '0')}`;

describe('redact walks arrays, invariant 9', () => {
  // Before the fix an array was treated as a leaf, so anything inside one
  // reached analytics untouched.
  it('strips a forbidden key from an object inside an array', () => {
    const clean = redact({
      items: [
        { id: 'a', caption: 'leak' },
        { id: 'b', exif: { iso: 100 } },
      ],
    });
    expect(clean).toEqual({ items: [{ id: 'a' }, { id: 'b' }] });
  });

  it('drops a URL inside an array of strings', () => {
    const clean = redact({ thumbs: ['https://example.test/private.jpg', 'ok'] });
    expect(clean).toEqual({ thumbs: ['ok'] });
  });

  it('strips at depth through nested arrays', () => {
    const clean = redact({ a: [[{ gps: [1, 2], keep: 1 }]] });
    expect(clean).toEqual({ a: [[{ keep: 1 }]] });
  });

  it('R13, a public key inside an array never reaches analytics', () => {
    const clean = redact({ manifest: [{ public_keys: ['n/s/feed.jpg'], variant: 'feed' }] });
    expect(clean).toEqual({ manifest: [{ variant: 'feed' }] });
  });
});

describe('uuidSchema matches what the uuid column accepts', () => {
  // z.string().uuid() enforces the RFC 4122 version and variant nibbles and
  // the column does not, so the strict form rejected ids Postgres stores and
  // returns. Found by running the owner projection through its own schema.
  it.each([
    '77778888-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  ])('accepts %s, which Postgres accepts', (value) => {
    expect(uuidSchema.safeParse(value).success).toBe(true);
  });

  it.each(['', 'not-a-uuid', '77778888-0000-0000-0000', '77778888000000000000000000000003'])(
    'still rejects %s',
    (value) => {
      expect(uuidSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('utcTimestampSchema accepts both spellings of zero offset', () => {
  // Postgres renders a timestamptz inside jsonb_build_object as +00:00, so an
  // owner projection never carries the Z form and the schema rejected every
  // real response.
  it.each([
    '2026-09-20T12:00:00.000Z',
    '2026-09-20T12:00:00+00:00',
    '2026-09-20T12:00:00.000+00:00',
  ])('accepts %s', (value) => {
    expect(utcTimestampSchema.safeParse(value).success).toBe(true);
  });

  it.each(['2026-09-20T12:00:00+01:00', '2026-09-20T12:00:00-05:00'])(
    'still rejects the non-zero offset %s',
    (value) => {
      expect(utcTimestampSchema.safeParse(value).success).toBe(false);
    },
  );
});

live('the owner projection validates against its own schema', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('a real create_submission response parses', async () => {
    const user = await createUser(uniqueHandle('proj'));
    const out = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: 'G-ABCD',
      taken_at: '2026-09-20T09:00:00.000Z',
      airport_icao: 'EGLL',
      caption: 'Morning',
    });

    const parsed = ownerSubmissionSchema.safeParse(out);
    if (!parsed.success) {
      throw new Error(`owner projection failed its own schema: ${parsed.error.message}`);
    }
    expect(parsed.success).toBe(true);
  });
});

live('tier 3, a stub is a resolved identity and publishes', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('the first sighting of an unknown registration publishes against its stub', async () => {
    // Before the fix publish_resolve treated stub_pending as a failure, so
    // every new registration went to awaiting_identification and could never
    // publish. That is the whole of tier 3 broken.
    const user = await createUser(uniqueHandle('stub'));
    const registration = nextRegistration();
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);

    const outcome = await runOnce(publishDb, new FakeStorage());
    expect(outcome?.reachedStage).toBe('committed');

    const sighting = await one<{ airframe_id: string }>(
      'select airframe_id from public.sightings where submission_id = $1',
      [id],
    );
    const airframe = await one<{ is_stub: boolean; stub_resolution_status: string }>(
      'select is_stub, stub_resolution_status from public.airframes where id = $1',
      [sighting.airframe_id],
    );
    expect(airframe.is_stub).toBe(true);
    expect(airframe.stub_resolution_status).toBe('pending');
  });

  it('invalid still routes to awaiting_identification and publishes nothing', async () => {
    const user = await createUser(uniqueHandle('bad'));
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: 'QQ-ZZZ',
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);

    const outcome = await runOnce(publishDb, new FakeStorage());
    expect(outcome?.reachedStage).toBe('waiting_authorization');

    const row = await one<{ state: string }>('select state from public.submissions where id = $1', [
      id,
    ]);
    expect(row.state).toBe('awaiting_identification');
    const { count } = await one<{ count: string }>('select count(*) from public.sightings');
    expect(Number(count)).toBe(0);
  });
});

live('invariant 4, approval gates every claim, not only the first', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('a rejected submission stops the worker before any further copy', async () => {
    // Before the fix the approval predicate covered waiting_authorization
    // only, so a job already at resolved was re-claimed after rejection and
    // copied derivatives into the public bucket before commit refused.
    const user = await createUser(uniqueHandle('rej'));
    const registration = nextRegistration();
    await createAirframe(registration, { validFrom: '2000-01-01', validTo: null, isCurrent: true });
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);

    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage, { stopAfter: 'resolved' });
    expect(first?.reachedStage).toBe('resolved');
    expect(storage.objectCount).toBe(0);

    // The moderator rejects while the worker is between stages. Rejection
    // clears approval.
    await sql(`select public.advance_submission($1, 'rejected', 'blurry')`, [id]);
    await sql(`update public.publish_jobs set lease_until = now() - interval '1 second'`);

    expect(await runOnce(publishDb, storage)).toBeNull();
    expect(storage.objectCount).toBe(0);
    const { count } = await one<{ count: string }>('select count(*) from public.sightings');
    expect(Number(count)).toBe(0);
  });

  it('a cancelled submission is likewise never re-claimed', async () => {
    const user = await createUser(uniqueHandle('can'));
    const registration = nextRegistration();
    await createAirframe(registration, { validFrom: '2000-01-01', validTo: null, isCurrent: true });
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);

    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage, { stopAfter: 'copied' });
    expect(first?.reachedStage).toBe('copied');

    await sql(`select public.advance_submission($1, 'cancelled')`, [id]);
    await sql(`update public.publish_jobs set lease_until = now() - interval '1 second'`);

    expect(await runOnce(publishDb, storage)).toBeNull();
    const { count } = await one<{ count: string }>('select count(*) from public.sightings');
    expect(Number(count)).toBe(0);
  });
});

live('publish_commit refuses a submission with no media row', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('raises rather than publishing null derivative paths', async () => {
    const user = await createUser(uniqueHandle('nomedia'));
    const registration = nextRegistration();
    await createAirframe(registration, { validFrom: '2000-01-01', validTo: null, isCurrent: true });
    const submission = await createSubmissionAs(user, {
      client_submission_id: nextClientId(),
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('delete from public.media where submission_id = $1', [id]);
    await sql('select public.publish_submission($1)', [id]);

    const storage = new FakeStorage();
    const job = await runOnce(publishDb, storage, { stopAfter: 'verified' });
    const claimed = await one<{ lease_token: string }>(
      'select lease_token from public.publish_jobs where id = $1',
      [job!.jobId],
    );

    await expect(publishDb.commit(job!.jobId, claimed.lease_token)).rejects.toThrow(
      /no media row/i,
    );
    const { count } = await one<{ count: string }>('select count(*) from public.sightings');
    expect(Number(count)).toBe(0);
  });
});

live('materialize_deliveries re-serves orphans', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  async function enqueued(): Promise<string> {
    const author = await createUser(uniqueHandle('ma'));
    const follower = await createUser(uniqueHandle('mf'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
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
       values ($1, $2, 'ios', 'granted')`,
      [follower, `ExponentPushToken[m${counter}]`],
    );

    const submission = await createSubmissionAs(author, {
      client_submission_id: nextClientId(),
      registration_text: registration,
      taken_at: new Date().toISOString(),
      airport_icao: 'EGLL',
    });
    const id = submission['id'] as string;
    await readyForPublish(id);
    await sql('select public.publish_submission($1)', [id]);
    await runOnce(publishDb, new FakeStorage());
    return id;
  }

  it('a second call still returns a delivery the first call stranded', async () => {
    // Before the fix the function returned only rows it had just inserted, so
    // a crash between materialise and claim left the delivery and its event
    // pending forever.
    await enqueued();

    const first = await sql<{ materialize_deliveries: string }>(
      'select public.materialize_deliveries()',
    );
    expect(first).toHaveLength(1);

    // The worker died before claiming. The next tick must still see it.
    const second = await sql<{ materialize_deliveries: string }>(
      'select public.materialize_deliveries()',
    );
    expect(second).toHaveLength(1);
    expect(second[0]?.materialize_deliveries).toBe(first[0]?.materialize_deliveries);

    const { count } = await one<{ count: string }>('select count(*) from public.alert_deliveries');
    expect(Number(count)).toBe(1);
  });

  it('a claimed delivery is not re-served', async () => {
    await enqueued();
    const ids = await sql<{ materialize_deliveries: string }>(
      'select public.materialize_deliveries()',
    );
    await sql('select * from public.claim_deliveries($1::uuid[])', [
      ids.map((r) => r.materialize_deliveries),
    ]);

    const again = await sql('select public.materialize_deliveries()');
    expect(again).toHaveLength(0);
  });
});

live('a terminal delivery failure reconciles its event', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('an all-failed event becomes skipped, not pending forever', async () => {
    const author = await createUser(uniqueHandle('ta'));
    const follower = await createUser(uniqueHandle('tf'));
    const registration = nextRegistration();
    const { airframeId } = await createAirframe(registration, {
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
       values ($1, $2, 'ios', 'granted')`,
      [follower, `ExponentPushToken[t${counter}]`],
    );

    const submission = await createSubmissionAs(author, {
      client_submission_id: nextClientId(),
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

    await sql('select public.record_delivery_error($1, $2, $3)', [
      delivery.id,
      claimed[0]?.send_attempt_id,
      'MessageRateExceeded',
    ]);

    const event = await one<{ status: string }>('select status from public.alert_events');
    expect(event.status).toBe('skipped');
  });
});

live('toggle_follow rejects a malformed airframe target cleanly', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('returns no such airframe rather than a raw cast error', async () => {
    const user = await createUser(uniqueHandle('tg'));
    await expect(
      withClient(async (client) => {
        await client.query('select set_config($1, $2, false)', [
          'request.jwt.claims',
          JSON.stringify({ sub: user, role: 'authenticated' }),
        ]);
        return client.query(`select public.toggle_follow('airframe', 'not-a-uuid')`);
      }),
    ).rejects.toThrow(/no such airframe/i);
  });

  it('still follows and unfollows a real airframe', async () => {
    const user = await createUser(uniqueHandle('tg2'));
    const { airframeId } = await createAirframe(nextRegistration(), {
      validFrom: '2000-01-01',
      validTo: null,
      isCurrent: true,
    });

    const states = await withClient(async (client) => {
      await client.query('select set_config($1, $2, false)', [
        'request.jwt.claims',
        JSON.stringify({ sub: user, role: 'authenticated' }),
      ]);
      const on = await client.query(`select public.toggle_follow('airframe', $1) as following`, [
        airframeId,
      ]);
      const off = await client.query(`select public.toggle_follow('airframe', $1) as following`, [
        airframeId,
      ]);
      return [on.rows[0].following, off.rows[0].following];
    });

    expect(states).toEqual([true, false]);
  });
});

live('the service guard is real, not just a grant', () => {
  // Inside a SECURITY DEFINER function current_user is the function owner, so
  // the original guard passed unconditionally. The revokes still made these
  // RPCs unreachable, but the defence in depth BuildPack section 5.1 asks for
  // was absent: one mistaken grant in a later migration would have exposed
  // them. These tests grant execute deliberately and prove the runtime check
  // now refuses anyway.
  const baseUrl = process.env['SUPABASE_URL'];
  const anonKey = process.env['SUPABASE_ANON_KEY'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const rest = Boolean(baseUrl) && Boolean(anonKey) && Boolean(serviceKey);

  async function callRpc(
    fn: string,
    key: string,
    body: unknown,
  ): Promise<{ status: number; body: string }> {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.text() };
  }

  it('current_user is the owner inside a definer function, which is why it cannot be the guard', async () => {
    await sql(`create or replace function public.tmp_probe_ctx() returns text
               language sql stable security definer set search_path = public, pg_temp
               as $fn$ select current_user || '|' || session_user $fn$`);
    try {
      const row = await one<{ tmp_probe_ctx: string }>('select public.tmp_probe_ctx()');
      const [inside] = row.tmp_probe_ctx.split('|');
      expect(inside).toBe('postgres');
    } finally {
      await sql('drop function if exists public.tmp_probe_ctx()');
    }
  });

  it.runIf(rest)('an anon caller is refused even when execute is granted', async () => {
    await sql('grant execute on function public.publish_claim(int) to anon');
    try {
      const result = await callRpc('publish_claim', anonKey as string, { p_lease_seconds: 300 });
      expect(result.body).toMatch(/service role required/i);
      expect(result.status).toBeGreaterThanOrEqual(400);
    } finally {
      await sql('revoke execute on function public.publish_claim(int) from anon');
    }
  });

  it.runIf(rest)('the service role is allowed through the same path', async () => {
    const result = await callRpc('publish_claim', serviceKey as string, { p_lease_seconds: 300 });
    expect(result.status).toBe(200);
    expect(result.body).not.toMatch(/service role required/i);
  });

  it.runIf(rest)('an anon caller is refused resolve_airframe too', async () => {
    await sql('grant execute on function public.resolve_airframe(text, timestamptz, uuid) to anon');
    try {
      const result = await callRpc('resolve_airframe', anonKey as string, {
        p_registration: 'G-ABCD',
        p_taken_at: new Date().toISOString(),
      });
      expect(result.body).toMatch(/service role required/i);
    } finally {
      await sql(
        'revoke execute on function public.resolve_airframe(text, timestamptz, uuid) from anon',
      );
    }
  });

  it('no service-only function is executable by a client role', async () => {
    const leaks = await sql<{ proname: string }>(
      `select p.proname
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and (p.proname like 'publish\\_%' or p.proname like 'app\\_%'
               or p.proname in ('resolve_airframe', 'advance_submission',
                                'materialize_deliveries', 'claim_deliveries',
                                'recover_delivery', 'record_delivery_ticket',
                                'record_delivery_error', 'record_delivery_receipt',
                                'fail_delivery_ticket_lost', 'reconcile_alert_event',
                                'mark_alert_event_sent'))
          and (has_function_privilege('anon', p.oid, 'execute')
               or has_function_privilege('authenticated', p.oid, 'execute'))`,
    );
    expect(leaks).toEqual([]);
  });
});
