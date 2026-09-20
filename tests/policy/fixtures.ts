/**
 * Test fixtures for the Block 4 RPC tests.
 * Author CKC. Version 1.0.
 *
 * Every helper here runs as the database owner over DATABASE_URL, which is the
 * service side. Nothing here is shipped and nothing here is reachable by a
 * client; the RLS and REST tests cover the client side separately.
 */
import { Client } from 'pg';

export const DATABASE_URL = process.env['DATABASE_URL'];
export const hasDatabase = typeof DATABASE_URL === 'string' && DATABASE_URL.length > 0;

export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function sql<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withClient(async (client) => (await client.query(text, params)).rows as T[]);
}

export async function one<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const rows = await sql<T>(text, params);
  const row = rows[0];
  if (row === undefined) throw new Error(`Expected a row from: ${text}`);
  return row;
}

/** Removes everything the tests create, in dependency order. */
export async function resetData(): Promise<void> {
  await sql(`
    delete from public.moderation_actions;
    delete from public.alert_deliveries;
    delete from public.alert_events;
    delete from public.media;
    delete from public.publish_jobs;
    update public.submissions set sighting_id = null;
    update public.airframes set hero_sighting_id = null;
    delete from public.sightings;
    delete from public.submissions;
    delete from public.import_conflicts;
    delete from public.follows;
    delete from public.device_push_tokens;
    delete from public.airframe_registrations;
    delete from public.airframes;
    delete from public.users;
    delete from auth.users;
    delete from public.airports;
  `);
}

let handleSeq = 0;

/**
 * A handle guaranteed to satisfy the users_handle_check constraint:
 * lowercase, starts alphanumeric, three to thirty characters. Fixtures that
 * built handles by hand produced two character ones and hit the constraint.
 */
export function uniqueHandle(prefix: string): string {
  handleSeq += 1;
  const stem = prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${stem || 'user'}-${String(handleSeq).padStart(4, '0')}`;
}

/** Creates an auth user and its public profile. */
export async function createUser(
  handle: string,
  trust: 'new' | 'trusted' | 'verified' = 'trusted',
): Promise<string> {
  const { id } = await one<{ id: string }>(
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
             'authenticated', $1 || '@example.test', '', now(), now(), now())
     returning id`,
    [handle],
  );
  await sql(
    `insert into public.users (id, handle, display_name, trust_tier)
     values ($1, $2, $3, $4)`,
    [id, handle, handle, trust],
  );
  return id;
}

export async function createAirport(icao: string, name: string): Promise<void> {
  await sql(`insert into public.airports (icao, name) values ($1, $2) on conflict do nothing`, [
    icao,
    name,
  ]);
}

/** Creates an airframe with one registration row. Validity may be open ended. */
export async function createAirframe(
  registration: string,
  options: { validFrom?: string | null; validTo?: string | null; isCurrent?: boolean } = {},
): Promise<{ airframeId: string; registrationId: string }> {
  const { id: airframeId } = await one<{ id: string }>(
    `insert into public.airframes (manufacturer, model) values ('Airbus', 'A320') returning id`,
  );
  const { id: registrationId } = await one<{ id: string }>(
    `insert into public.airframe_registrations
       (airframe_id, registration, valid_from, valid_to, is_current, resolution_source)
     values ($1, $2, $3, $4, $5, 'faa')
     returning id`,
    [
      airframeId,
      registration,
      options.validFrom ?? null,
      options.validTo ?? null,
      options.isCurrent ?? true,
    ],
  );
  return { airframeId, registrationId };
}

/** Calls create_submission as the given user, the way PostgREST would. */
export async function createSubmissionAs(
  userId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return withClient(async (client) => {
    await client.query('select set_config($1, $2, false)', [
      'request.jwt.claims',
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    const result = await client.query('select public.create_submission($1::jsonb) as out', [
      JSON.stringify(payload),
    ]);
    return (result.rows[0] as { out: Record<string, unknown> }).out;
  });
}

/** Puts a submission and its media in the state publication expects. */
export async function readyForPublish(submissionId: string): Promise<void> {
  await sql(
    `insert into public.media (submission_id, original_path)
     values ($1::uuid, 'originals/' || ($1::uuid)::text) on conflict do nothing`,
    [submissionId],
  );
  await sql(`select public.advance_submission($1, 'processing')`, [submissionId]);
  await sql(`select public.advance_submission($1, 'awaiting_review')`, [submissionId]);
  await sql(`select public.app_fixture_approve_submission($1)`, [submissionId]);
}
