/**
 * Shared connection helper for the live policy tests.
 * Author CKC. Version 0.1.0.
 *
 * Every live test skips without DATABASE_URL. A skipped test proves nothing,
 * so CI reports the skip and the Phase S gates stay unpassed until a stack is
 * attached. Start one with `supabase start`.
 */
import { Client } from 'pg';

export const DATABASE_URL = process.env['DATABASE_URL'];
export const hasDatabase = typeof DATABASE_URL === 'string' && DATABASE_URL.length > 0;

/** Runs `sql` on a fresh connection and returns the rows. */
export async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Runs `sql` as `role` and reports what happened. Distinguishes a permission
 * denial from an empty result, which BuildPack section 4 structural rule 4
 * treats as two different outcomes.
 */
export async function asRole(
  role: 'anon' | 'authenticated',
  sql: string,
  params: unknown[] = [],
): Promise<{ denied: boolean; error?: string; rowCount: number }> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(`set role ${role}`);
    const result = await client.query(sql, params);
    return { denied: false, rowCount: result.rowCount ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { denied: /permission denied/i.test(message), error: message, rowCount: 0 };
  } finally {
    await client.end();
  }
}
