/**
 * Publication, idempotency and Phase S exit gate 7.
 * Author CKC. Version 1.0.
 *
 * Gate 7. Kill after copied and before committed, restart publish-runner,
 * assert exactly one sighting, no duplicate public objects and one publish
 * audit action. Kill after committed and rerun: return the existing sighting
 * and write nothing.
 *
 * Storage is the FakeStorage port. That proves the machine, not the bucket:
 * gate 7 is not closed until Block 5 runs this against Supabase Storage.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeStorage } from './fake-storage.js';
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
} from './fixtures.js';
import { expireLease, publishDb } from './publish-db.js';

const live = hasDatabase ? describe : describe.skip;

let counter = 0;
const nextClientId = (): string => `dddddddd-0000-0000-0000-${String(++counter).padStart(12, '0')}`;

/** A submission resolved to a known airframe, approved and ready to publish. */
async function readySubmission(registration = 'GABCD'): Promise<string> {
  await createAirframe(registration, { validFrom: '2010-01-01', validTo: null, isCurrent: true });
  const user = await createUser(`spotter${counter}`);
  const submission = await createSubmissionAs(user, {
    client_submission_id: nextClientId(),
    registration_text: registration,
    taken_at: '2026-09-20T09:00:00.000Z',
    airport_icao: 'EGLL',
  });
  const id = submission['id'] as string;
  await readyForPublish(id);
  await sql('select public.publish_submission($1)', [id]);
  return id;
}

const countOf = async (table: string, where = '', params: unknown[] = []): Promise<number> => {
  const { count } = await one<{ count: string }>(
    `select count(*) from public.${table} ${where}`,
    params,
  );
  return Number(count);
};

live('publish_submission requests a job idempotently', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('creates exactly one job however many times it is called', async () => {
    const id = await readySubmission();
    await sql('select public.publish_submission($1)', [id]);
    await sql('select public.publish_submission($1)', [id]);
    expect(await countOf('publish_jobs')).toBe(1);
  });

  it('parks the new job at waiting_authorization', async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
    const user = await createUser('unapproved');
    const submission = await createSubmissionAs(user, { client_submission_id: nextClientId() });
    const id = submission['id'] as string;
    const rows = await sql<{ out: { stage: string; sighting_id: string | null } }>(
      'select public.publish_submission($1) as out',
      [id],
    );
    expect(rows[0]?.out.stage).toBe('waiting_authorization');
    expect(rows[0]?.out.sighting_id).toBeNull();
  });

  it('an unapproved job is never claimed, section 5.5', async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
    const user = await createUser('unapproved');
    const submission = await createSubmissionAs(user, { client_submission_id: nextClientId() });
    await sql('select public.publish_submission($1)', [submission['id']]);

    const storage = new FakeStorage();
    expect(await runOnce(publishDb, storage)).toBeNull();
    expect(storage.objectCount).toBe(0);
  });
});

live('the happy path', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('publishes exactly one sighting', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();
    const outcome = await runOnce(publishDb, storage);

    expect(outcome?.reachedStage).toBe('committed');
    expect(outcome?.inserted).toBe(true);
    expect(await countOf('sightings')).toBe(1);

    const sighting = await one<{ airframe_id: string; submission_id: string }>(
      'select airframe_id, submission_id from public.sightings',
    );
    expect(sighting.submission_id).toBe(id);
    expect(sighting.airframe_id).not.toBeNull();
  });

  it('invariant 3, the sighting always has an airframe', async () => {
    await readySubmission();
    await runOnce(publishDb, new FakeStorage());
    expect(await countOf('sightings', 'where airframe_id is null')).toBe(0);
  });

  it('commits the key manifest before the first copy, R13', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();
    await runOnce(publishDb, storage, { stopAfter: 'resolved' });

    const job = await one<{ public_keys: string[]; stage: string }>(
      'select public_keys, stage from public.publish_jobs where submission_id = $1',
      [id],
    );
    expect(job.stage).toBe('resolved');
    expect(job.public_keys).toHaveLength(3);
    // The manifest exists and nothing has been copied yet.
    expect(storage.objectCount).toBe(0);
  });

  it('every public key carries the job nonce, R13', async () => {
    const id = await readySubmission();
    await runOnce(publishDb, new FakeStorage());
    const job = await one<{ publish_nonce: string; public_keys: string[] }>(
      'select publish_nonce, public_keys from public.publish_jobs where submission_id = $1',
      [id],
    );
    for (const key of job.public_keys) {
      expect(key.startsWith(job.publish_nonce)).toBe(true);
    }
  });

  it('stamps the media paths and moves the bucket to derivatives, invariant 4', async () => {
    const id = await readySubmission();
    await runOnce(publishDb, new FakeStorage());
    const media = await one<{
      derivatives_bucket: string;
      feed_path: string;
      sighting_id: string;
    }>(
      'select derivatives_bucket, feed_path, sighting_id from public.media where submission_id = $1',
      [id],
    );
    expect(media.derivatives_bucket).toBe('derivatives');
    expect(media.feed_path).toContain('feed.jpg');
    expect(media.sighting_id).not.toBeNull();
  });

  it('writes exactly one publish audit action', async () => {
    const id = await readySubmission();
    await runOnce(publishDb, new FakeStorage());
    expect(
      await countOf('moderation_actions', "where submission_id = $1 and to_state = 'published'", [
        id,
      ]),
    ).toBe(1);
  });

  it('leaves the submission published and linked to its sighting', async () => {
    const id = await readySubmission();
    await runOnce(publishDb, new FakeStorage());
    const row = await one<{ state: string; sighting_id: string | null }>(
      'select state, sighting_id from public.submissions where id = $1',
      [id],
    );
    expect(row.state).toBe('published');
    expect(row.sighting_id).not.toBeNull();
  });
});

live('gate 7, crash recovery', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('kill after copied before committed, restart, exactly one sighting', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();

    const first = await runOnce(publishDb, storage, { stopAfter: 'copied' });
    expect(first?.reachedStage).toBe('copied');
    expect(await countOf('sightings')).toBe(0);

    // The worker died. Its lease expires and the next runner picks the job up.
    await expireLease(first!.jobId);
    const second = await runOnce(publishDb, storage);

    expect(second?.reachedStage).toBe('committed');
    expect(second?.inserted).toBe(true);
    expect(await countOf('sightings')).toBe(1);
    expect(
      await countOf('moderation_actions', "where submission_id = $1 and to_state = 'published'", [
        id,
      ]),
    ).toBe(1);
  });

  it('recovery produces no duplicate public objects', async () => {
    const storage = new FakeStorage();
    await readySubmission();

    const first = await runOnce(publishDb, storage, { stopAfter: 'copied' });
    await expireLease(first!.jobId);
    await runOnce(publishDb, storage);

    // Keys derive from the job nonce, which does not change during a
    // generation, so a recopy overwrites rather than creating a second set.
    expect(storage.objectCount).toBe(3);
    expect(new Set(storage.copyLog.map((c) => c.to)).size).toBe(3);
  });

  it('kill after resolved, before any copy, still yields one sighting', async () => {
    const storage = new FakeStorage();
    await readySubmission();

    const first = await runOnce(publishDb, storage, { stopAfter: 'resolved' });
    expect(storage.objectCount).toBe(0);

    await expireLease(first!.jobId);
    const second = await runOnce(publishDb, storage);

    expect(second?.reachedStage).toBe('committed');
    expect(await countOf('sightings')).toBe(1);
    expect(storage.objectCount).toBe(3);
  });

  it('kill after committed and rerun returns the existing sighting and writes nothing', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();

    const first = await runOnce(publishDb, storage);
    expect(first?.inserted).toBe(true);
    const sightingId = first?.sightingId;

    const auditBefore = await countOf('moderation_actions', 'where submission_id = $1', [id]);

    await expireLease(first!.jobId);
    const second = await runOnce(publishDb, storage);

    if (second !== null) {
      expect(second.inserted).toBe(false);
      expect(second.sightingId).toBe(sightingId);
    }

    expect(await countOf('sightings')).toBe(1);
    expect(await countOf('moderation_actions', 'where submission_id = $1', [id])).toBe(auditBefore);
  });

  it('a committed job is never claimed again', async () => {
    await readySubmission();
    const storage = new FakeStorage();
    await runOnce(publishDb, storage);
    await sql(`update public.publish_jobs set lease_until = now() - interval '1 second'`);

    expect(await runOnce(publishDb, storage)).toBeNull();
    expect(await countOf('sightings')).toBe(1);
  });

  it('publish_commit on a committed job is a no-op even when called directly', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage);

    const rows = await sql<{ out: { inserted: boolean; sighting_id: string } }>(
      'select public.publish_commit($1, gen_random_uuid()) as out',
      [first!.jobId],
    );
    expect(rows[0]?.out.inserted).toBe(false);
    expect(rows[0]?.out.sighting_id).toBe(first?.sightingId);
    expect(await countOf('sightings')).toBe(1);
    expect(id).toBeTruthy();
  });
});

live('lease fencing, the part Phase S needs for recovery', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('a stale token cannot advance a stage', async () => {
    await readySubmission();
    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage, { stopAfter: 'copied' });

    await expect(
      publishDb.advanceStage(
        first!.jobId,
        '00000000-0000-0000-0000-000000000000',
        'copied',
        'verified',
      ),
    ).rejects.toThrow(/stale lease|unexpected stage/i);
  });

  it('a stale token cannot commit', async () => {
    await readySubmission();
    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage, { stopAfter: 'verified' });

    await expect(
      publishDb.commit(first!.jobId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(/stale or expired lease/i);
  });

  it('two runners cannot claim the same job', async () => {
    await readySubmission();
    const a = await publishDb.claim(300);
    const b = await publishDb.claim(300);
    expect(a).not.toBeNull();
    expect(b).toBeNull();
  });

  it('a new claimant gets a new token', async () => {
    await readySubmission();
    const a = await publishDb.claim(300);
    await expireLease(a!.job_id);
    const b = await publishDb.claim(300);
    expect(b?.lease_token).not.toBe(a?.lease_token);
  });
});

live('commit guards', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('the schema itself refuses approval that does not cover the current revision', async () => {
    const id = await readySubmission();
    // Bumping the revision without clearing approval is rejected by the check
    // constraint on submissions, so the invalid state cannot exist at all.
    await expect(
      sql('update public.submissions set content_revision = content_revision + 1 where id = $1', [
        id,
      ]),
    ).rejects.toThrow(/submissions_check/);
  });

  it('refuses to commit after an edit clears approval, section 5.5', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage, { stopAfter: 'verified' });

    // What a real content edit does: increment the revision and clear approval
    // in the same statement, which the check constraint permits.
    await sql(
      `update public.submissions
          set content_revision = content_revision + 1,
              approved_revision = null, approval_kind = null, approved_at = null, approved_by = null
        where id = $1`,
      [id],
    );

    const claimed = await one<{ lease_token: string }>(
      'select lease_token from public.publish_jobs where id = $1',
      [first!.jobId],
    );
    await expect(publishDb.commit(first!.jobId, claimed.lease_token)).rejects.toThrow(
      /approval does not cover/i,
    );
    expect(await countOf('sightings')).toBe(0);
  });

  it('R10, an anonymized author cannot publish', async () => {
    const id = await readySubmission();
    const storage = new FakeStorage();
    const first = await runOnce(publishDb, storage, { stopAfter: 'verified' });

    await sql(
      'update public.users set anonymized_at = now() where id = (select user_id from public.submissions where id = $1)',
      [id],
    );

    const claimed = await one<{ lease_token: string }>(
      'select lease_token from public.publish_jobs where id = $1',
      [first!.jobId],
    );
    await expect(publishDb.commit(first!.jobId, claimed.lease_token)).rejects.toThrow(
      /anonymized/i,
    );
    expect(await countOf('sightings')).toBe(0);
  });
});
