/**
 * PublishDb adapter over node-postgres, for the live publication tests.
 * Author CKC. Version 1.0.
 *
 * Each call opens its own connection and commits on its own, which is the
 * point: a stage boundary is a separate transaction, so killing the runner
 * between two of them leaves the job exactly where the last one committed.
 */
import type {
  ClaimedJob,
  CommitResult,
  PublishDb,
  ResolveResult,
} from '@planespotter/shared/publish/runner';
import { sql } from './fixtures.js';

export const publishDb: PublishDb = {
  async claim(leaseSeconds: number): Promise<ClaimedJob | null> {
    const rows = await sql<{ out: ClaimedJob | null }>('select public.publish_claim($1) as out', [
      leaseSeconds,
    ]);
    return rows[0]?.out ?? null;
  },

  async resolve(jobId: string, leaseToken: string): Promise<ResolveResult> {
    const rows = await sql<{ out: ResolveResult }>('select public.publish_resolve($1, $2) as out', [
      jobId,
      leaseToken,
    ]);
    const out = rows[0]?.out;
    if (out === undefined) throw new Error('publish_resolve returned nothing');
    return out;
  },

  async advanceStage(jobId: string, leaseToken: string, from: string, to: string): Promise<void> {
    await sql('select public.publish_advance_stage($1, $2, $3, $4)', [jobId, leaseToken, from, to]);
  },

  async commit(jobId: string, leaseToken: string): Promise<CommitResult> {
    const rows = await sql<{ out: CommitResult }>('select public.publish_commit($1, $2) as out', [
      jobId,
      leaseToken,
    ]);
    const out = rows[0]?.out;
    if (out === undefined) throw new Error('publish_commit returned nothing');
    return out;
  },
};

/**
 * Expires a job's lease, which is what a crashed worker leaves behind.
 * Deterministic stand-in for waiting out the real lease, so the recovery tests
 * assert the recovery path rather than the clock.
 */
export async function expireLease(jobId: string): Promise<void> {
  await sql(
    `update public.publish_jobs set lease_until = now() - interval '1 second' where id = $1`,
    [jobId],
  );
}
