/**
 * The real StoragePort, backed by Supabase Storage.
 * Author CKC. Version 1.0.
 *
 * Invariant 4. Derivatives are generated into the private pending bucket and
 * copied to public only by the publish job. This is that copy and nothing
 * else: it never writes to pending, never deletes, and never touches originals.
 *
 * Storage calls are not transactional, CLAUDE.md section 7. Every method here
 * is one HTTP call made between SQL stage boundaries, never inside one.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoragePort } from './runner.js';

export const PENDING_BUCKET = 'pending';
export const PUBLIC_BUCKET = 'derivatives';

export class SupabaseStorage implements StoragePort {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Copies one pending derivative to its public key.
   *
   * Idempotent by requirement: crash recovery recopies the same manifest, so
   * a key that already holds the right bytes is success, not a conflict. The
   * keys carry the job nonce and the nonce does not change within a
   * generation, so a recopy overwrites one object rather than creating a
   * second, R13.
   */
  async copyToPublic(pendingKey: string, publicKey: string): Promise<void> {
    const download = await this.client.storage.from(PENDING_BUCKET).download(pendingKey);
    if (download.error !== null) {
      throw new Error(`pending object ${pendingKey} is unreadable: ${download.error.message}`);
    }

    const upload = await this.client.storage
      .from(PUBLIC_BUCKET)
      .upload(publicKey, download.data, { upsert: true, contentType: 'image/jpeg' });

    if (upload.error !== null) {
      throw new Error(`copy to ${publicKey} failed: ${upload.error.message}`);
    }
  }

  /** True when the public object exists. */
  async publicObjectExists(publicKey: string): Promise<boolean> {
    const slash = publicKey.lastIndexOf('/');
    const folder = slash === -1 ? '' : publicKey.slice(0, slash);
    const name = slash === -1 ? publicKey : publicKey.slice(slash + 1);

    const listing = await this.client.storage
      .from(PUBLIC_BUCKET)
      .list(folder, { search: name, limit: 100 });

    if (listing.error !== null) return false;
    return listing.data.some((entry) => entry.name === name);
  }

  /** The public URL for a key. Not access controlled, revocation is deletion. */
  publicUrl(publicKey: string): string {
    return this.client.storage.from(PUBLIC_BUCKET).getPublicUrl(publicKey).data.publicUrl;
  }
}
