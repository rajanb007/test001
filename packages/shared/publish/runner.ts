/**
 * The publish-runner, BuildPack v1.8 sections 5.2 and 5.5.
 * Author CKC. Version 1.0.
 *
 * Storage calls are not transactional, CLAUDE.md section 7, so the runner does
 * the external work between SQL stage boundaries and never inside one. Each
 * stage function commits on its own; a crash between two of them leaves the
 * job at the last committed stage, which is what makes recovery work.
 *
 * Storage is behind a port so Block 4 can drive the whole machine against a
 * fake and Block 5 can swap in Supabase Storage without touching this file.
 */

/** What the runner needs from storage. Block 5 implements this for real. */
export type StoragePort = {
  /** Copies one pending derivative to its public key. Must be idempotent. */
  copyToPublic(pendingKey: string, publicKey: string): Promise<void>;
  /** True when the public object exists and is the expected variant. */
  publicObjectExists(publicKey: string): Promise<boolean>;
};

/** What the runner needs from the database. Every call is one RPC. */
export type PublishDb = {
  claim(leaseSeconds: number): Promise<ClaimedJob | null>;
  resolve(jobId: string, leaseToken: string): Promise<ResolveResult>;
  advanceStage(jobId: string, leaseToken: string, from: string, to: string): Promise<void>;
  commit(jobId: string, leaseToken: string): Promise<CommitResult>;
};

export type ClaimedJob = {
  job_id: string;
  submission_id: string;
  stage: string;
  lease_token: string;
  publish_nonce: string;
  public_keys: string[] | null;
  submission_revision: number | null;
};

export type ResolveResult = {
  outcome: string;
  stage: string;
  public_keys?: string[];
};

export type CommitResult = {
  job_id: string;
  stage: string;
  sighting_id: string | null;
  inserted: boolean;
};

/**
 * Where a run stopped. Used by the crash-recovery tests to kill the runner at
 * an exact stage boundary, which is what gate 7 asks for.
 */
export type StopAfter = 'resolved' | 'copied' | 'verified' | null;

export type RunOptions = {
  leaseSeconds?: number;
  /** Stop before the next stage transition, simulating a worker kill. */
  stopAfter?: StopAfter;
  /** The pending derivative key for a submission. Block 5 supplies the real one. */
  pendingKeyFor?: (submissionId: string, variant: string) => string;
};

export type RunOutcome = {
  jobId: string;
  reachedStage: string;
  sightingId: string | null;
  inserted: boolean;
  copiedKeys: string[];
};

const VARIANTS = ['feed', 'detail', 'share'] as const;

const defaultPendingKey = (submissionId: string, variant: string): string =>
  `pending/${submissionId}/${variant}.jpg`;

/**
 * Drives one job as far as it can go, resuming from whatever stage it is at.
 * Returns null when there is nothing to claim.
 */
export async function runOnce(
  db: PublishDb,
  storage: StoragePort,
  options: RunOptions = {},
): Promise<RunOutcome | null> {
  const leaseSeconds = options.leaseSeconds ?? 300;
  const pendingKeyFor = options.pendingKeyFor ?? defaultPendingKey;

  const job = await db.claim(leaseSeconds);
  if (job === null) return null;

  const copiedKeys: string[] = [];
  let stage = job.stage;
  let keys: string[] = job.public_keys ?? [];

  if (stage === 'claimed') {
    const resolved = await db.resolve(job.job_id, job.lease_token);
    if (resolved.outcome !== 'matched') {
      // Ambiguous quarantines and invalid needs a registration. Neither is a
      // publication, and resolve already routed the submission.
      return {
        jobId: job.job_id,
        reachedStage: resolved.stage,
        sightingId: null,
        inserted: false,
        copiedKeys,
      };
    }
    keys = resolved.public_keys ?? [];
    stage = 'resolved';
    if (options.stopAfter === 'resolved') {
      return {
        jobId: job.job_id,
        reachedStage: stage,
        sightingId: null,
        inserted: false,
        copiedKeys,
      };
    }
  }

  if (stage === 'resolved') {
    // The manifest was committed before this point, so a partial copy needs no
    // guesswork. Keys derive from the job nonce, so recopying after a crash
    // writes the same keys rather than a second set, R13.
    for (const [index, variant] of VARIANTS.entries()) {
      const publicKey = keys[index];
      if (publicKey === undefined) {
        throw new Error(`job ${job.job_id} manifest is missing the ${variant} key`);
      }
      await storage.copyToPublic(pendingKeyFor(job.submission_id, variant), publicKey);
      copiedKeys.push(publicKey);
    }
    await db.advanceStage(job.job_id, job.lease_token, 'resolved', 'copied');
    stage = 'copied';
    if (options.stopAfter === 'copied') {
      return {
        jobId: job.job_id,
        reachedStage: stage,
        sightingId: null,
        inserted: false,
        copiedKeys,
      };
    }
  }

  if (stage === 'copied') {
    for (const publicKey of keys) {
      if (!(await storage.publicObjectExists(publicKey))) {
        throw new Error(`job ${job.job_id} is missing the verified object ${publicKey}`);
      }
    }
    await db.advanceStage(job.job_id, job.lease_token, 'copied', 'verified');
    stage = 'verified';
    if (options.stopAfter === 'verified') {
      return {
        jobId: job.job_id,
        reachedStage: stage,
        sightingId: null,
        inserted: false,
        copiedKeys,
      };
    }
  }

  const committed = await db.commit(job.job_id, job.lease_token);
  return {
    jobId: job.job_id,
    reachedStage: committed.stage,
    sightingId: committed.sighting_id,
    inserted: committed.inserted,
    copiedKeys,
  };
}
