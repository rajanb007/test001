/**
 * In-memory StoragePort for tests. Counts writes per key so a test can assert
 * that recovery produced no duplicate public objects, gate 7.
 * Author CKC. Version 1.0.
 *
 * This is test support. It is never imported by application code, and Block 5
 * supplies the Supabase Storage implementation of the same port.
 */
import type { StoragePort } from '@planespotter/shared/publish/runner';

export class FakeStorage implements StoragePort {
  /** publicKey to the number of times it was written. */
  readonly writes = new Map<string, number>();
  /** Every copy call in order, so a test can see duplicates, not just totals. */
  readonly copyLog: Array<{ from: string; to: string }> = [];

  async copyToPublic(pendingKey: string, publicKey: string): Promise<void> {
    this.copyLog.push({ from: pendingKey, to: publicKey });
    this.writes.set(publicKey, (this.writes.get(publicKey) ?? 0) + 1);
  }

  async publicObjectExists(publicKey: string): Promise<boolean> {
    return this.writes.has(publicKey);
  }

  /** Distinct public objects that exist. Duplicated writes to one key is one object. */
  get objectCount(): number {
    return this.writes.size;
  }
}
