/**
 * Gate 7 against real Supabase Storage, and invariant 4 on real buckets.
 * Author CKC. Version 1.0.
 *
 * Block 4 proved the stage machine against a fake port. This runs the same
 * machine against actual objects, which is what gate 7 is about: exactly one
 * sighting, no duplicate public objects, one publish audit action.
 */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { runOnce } from '@planespotter/shared/publish/runner';
import {
  PENDING_BUCKET,
  PUBLIC_BUCKET,
  SupabaseStorage,
} from '@planespotter/shared/publish/supabase-storage';
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

const supabaseUrl = process.env['SUPABASE_URL'];
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const anonKey = process.env['SUPABASE_ANON_KEY'];
const configured = hasDatabase && Boolean(supabaseUrl) && Boolean(serviceKey);
const live = configured ? describe : describe.skip;

let service: SupabaseClient;
let storage: SupabaseStorage;
let counter = 0;

/** A one pixel JPEG. Enough to prove the bytes move. */
const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

async function putPending(submissionId: string): Promise<string[]> {
  const keys: string[] = [];
  for (const variant of ['feed', 'detail', 'share']) {
    const key = `pending/${submissionId}/${variant}.jpg`;
    const { error } = await service.storage
      .from(PENDING_BUCKET)
      .upload(key, JPEG_BYTES, { upsert: true, contentType: 'image/jpeg' });
    if (error !== null) throw new Error(`pending upload failed: ${error.message}`);
    keys.push(key);
  }
  return keys;
}

async function listPublic(prefix: string): Promise<string[]> {
  const { data, error } = await service.storage.from(PUBLIC_BUCKET).list(prefix, { limit: 100 });
  if (error !== null) return [];
  return data.map((entry) => entry.name);
}

async function readySubmission(): Promise<{ id: string; nonce: string }> {
  // UK registrations are G plus four letters, no digits. An earlier version of
  // this fixture used digits, the validator rejected it and publish_resolve
  // correctly parked the job rather than publishing something unresolved.
  counter += 1;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const registration = `GS${letters[Math.floor(counter / 26) % 26]}${letters[counter % 26]}`.padEnd(
    5,
    'A',
  );
  await createAirframe(registration, { validFrom: '2010-01-01', validTo: null, isCurrent: true });
  const user = await createUser(`storage${counter}`);
  const submission = await createSubmissionAs(user, {
    client_submission_id: `eeeeeeee-0000-0000-0000-${String(counter).padStart(12, '0')}`,
    registration_text: registration,
    taken_at: '2026-09-20T09:00:00.000Z',
    airport_icao: 'EGLL',
  });
  const id = submission['id'] as string;
  await readyForPublish(id);
  await putPending(id);
  await sql('select public.publish_submission($1)', [id]);
  const job = await one<{ publish_nonce: string }>(
    'select publish_nonce from public.publish_jobs where submission_id = $1',
    [id],
  );
  return { id, nonce: job.publish_nonce };
}

beforeAll(() => {
  if (!configured) return;
  service = createClient(supabaseUrl as string, serviceKey as string, {
    auth: { persistSession: false },
  });
  storage = new SupabaseStorage(service);
});

live('invariant 4, bucket posture', () => {
  it('originals and pending are private, derivatives is public', async () => {
    const rows = await sql<{ id: string; public: boolean }>(
      `select id, public from storage.buckets where id in ('originals','pending','derivatives') order by id`,
    );
    expect(rows).toEqual([
      { id: 'derivatives', public: true },
      { id: 'originals', public: false },
      { id: 'pending', public: false },
    ]);
  });

  it('an anon client cannot list the pending bucket', async () => {
    const anon = createClient(supabaseUrl as string, anonKey as string, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.storage.from(PENDING_BUCKET).list('', { limit: 1 });
    // Either an explicit error or an empty listing. What must never happen is
    // a client seeing a precommit derivative.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it('pending has no policy for anon or authenticated at all', async () => {
    const rows = await sql<{ count: string }>(
      `select count(*) from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and qual like '%pending%'`,
    );
    expect(Number(rows[0]?.count)).toBe(0);
  });
});

live('gate 7 against real objects', () => {
  beforeEach(async () => {
    await resetData();
    await createAirport('EGLL', 'Heathrow');
  });

  it('the happy path copies three real objects and inserts one sighting', async () => {
    const { id, nonce } = await readySubmission();
    const outcome = await runOnce(publishDb, storage);

    expect(outcome?.reachedStage).toBe('committed');
    const names = await listPublic(`${nonce}/${id}`);
    expect(names.sort()).toEqual(['detail.jpg', 'feed.jpg', 'share.jpg']);

    const { count } = await one<{ count: string }>('select count(*) from public.sightings');
    expect(Number(count)).toBe(1);
  });

  it('the copied objects are actually fetchable at their public URL', async () => {
    const { id, nonce } = await readySubmission();
    await runOnce(publishDb, storage);

    const url = storage.publicUrl(`${nonce}/${id}/feed.jpg`);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(JPEG_BYTES.byteLength);
  });

  it('R13, the public key is not fetchable before commit', async () => {
    const { id, nonce } = await readySubmission();
    await runOnce(publishDb, storage, { stopAfter: 'resolved' });

    const url = storage.publicUrl(`${nonce}/${id}/feed.jpg`);
    const response = await fetch(url);
    expect(response.status).toBe(400);
  });

  it('kill after copied, restart, exactly one sighting and no duplicate objects', async () => {
    const { id, nonce } = await readySubmission();

    const first = await runOnce(publishDb, storage, { stopAfter: 'copied' });
    expect(first?.reachedStage).toBe('copied');
    expect(
      Number((await one<{ count: string }>('select count(*) from public.sightings')).count),
    ).toBe(0);

    await expireLease(first!.jobId);
    const second = await runOnce(publishDb, storage);

    expect(second?.reachedStage).toBe('committed');
    expect(
      Number((await one<{ count: string }>('select count(*) from public.sightings')).count),
    ).toBe(1);

    // Three objects, not six. The nonce did not change, so the recopy
    // overwrote rather than creating a second set.
    const names = await listPublic(`${nonce}/${id}`);
    expect(names).toHaveLength(3);

    const audit = await one<{ count: string }>(
      `select count(*) from public.moderation_actions where submission_id = $1 and to_state = 'published'`,
      [id],
    );
    expect(Number(audit.count)).toBe(1);
  });

  it('kill after committed, rerun, writes nothing and leaves the objects alone', async () => {
    const { id, nonce } = await readySubmission();
    const first = await runOnce(publishDb, storage);
    const before = await listPublic(`${nonce}/${id}`);

    await expireLease(first!.jobId);
    const second = await runOnce(publishDb, storage);
    if (second !== null) expect(second.inserted).toBe(false);

    expect(await listPublic(`${nonce}/${id}`)).toEqual(before);
    expect(
      Number((await one<{ count: string }>('select count(*) from public.sightings')).count),
    ).toBe(1);
  });

  it('the original never reaches the public bucket, invariant 4', async () => {
    const { id, nonce } = await readySubmission();
    await runOnce(publishDb, storage);
    const names = await listPublic(`${nonce}/${id}`);
    expect(names).not.toContain('original.jpg');
    expect(names.every((n) => ['feed.jpg', 'detail.jpg', 'share.jpg'].includes(n))).toBe(true);
    expect(id).toBeTruthy();
  });
});
