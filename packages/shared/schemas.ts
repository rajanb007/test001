/**
 * Zod schemas shared by mobile and web. BuildPack v1.8 sections 5.1 and 5.4.
 * Author CKC. Version 1.0.
 *
 * These validate what crosses the wire. They do not replace the server checks:
 * every RPC validates its own payload, and a client schema is a convenience
 * plus a shared definition of the contract, never the enforcement point.
 *
 * All timestamps are UTC ISO 8601 on the wire, section 5.4.
 */
import { z } from 'zod';
import { SUBMISSION_STATES } from './types.js';

/** Matches the handle check constraint on public.users. */
export const handleSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, 'Handles are 3 to 30 characters, lowercase');

/**
 * A uuid as PostgreSQL defines one: 32 hex digits in 8-4-4-4-12 form.
 *
 * Deliberately looser than `z.string().uuid()`, which enforces the RFC 4122
 * version and variant nibbles. The `uuid` column does not, so the strict form
 * rejects values the database accepts, stores and hands back. A schema that
 * refuses its own system's data is worse than a slightly permissive one, and
 * clients generate v4 through `crypto.randomUUID()` either way.
 */
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Expected a uuid in 8-4-4-4-12 form',
  );

/**
 * UTC ISO 8601. A local-offset timestamp is rejected rather than coerced.
 *
 * Both spellings of zero offset are accepted, because both cross the wire.
 * A client sends `Z`, and PostgreSQL renders a timestamptz inside
 * jsonb_build_object as `+00:00`, so an RPC projection such as
 * app_owner_submission_json never carries the `Z` form.
 */
export const utcTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => /(?:Z|[+-]00:00)$/i.test(value),
    'Timestamps cross the wire in UTC, section 5.4',
  )
  .describe('UTC ISO 8601, section 5.4');

/** ICAO airport code. Four letters, uppercase. */
export const icaoSchema = z.string().regex(/^[A-Z]{4}$/, 'Four letter uppercase ICAO code');

/** Caption length matches the 500 character check constraint. */
export const captionSchema = z.string().max(500);

/** WGS 84 point. Longitude first, matching PostGIS ST_MakePoint. */
export const geoPointSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const submissionStateSchema = z.enum(SUBMISSION_STATES);

/**
 * create_submission payload, section 5.1. Idempotent on
 * (user_id, client_submission_id), so the client generates the id and reuses
 * it across every retry, invariant 1.
 *
 * There is no approval field and no state field. Clients cannot set either,
 * section 5.5, and review_required comes from server trust.
 */
export const createSubmissionSchema = z
  .object({
    client_submission_id: uuidSchema,
    registration_text: z.string().min(1).max(10).nullable().optional(),
    taken_at: utcTimestampSchema.nullable().optional(),
    captured_geo: geoPointSchema.nullable().optional(),
    airport_icao: icaoSchema.nullable().optional(),
    caption: captionSchema.nullable().optional(),
  })
  .strict();

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

/**
 * update_submission payload, section 5.1. Caption and registration_text only.
 * The photo is immutable across resubmits, R11: a different photo is a new
 * capture, so there is no media field here by design.
 */
export const updateSubmissionSchema = z
  .object({
    registration_text: z.string().min(1).max(10).nullable().optional(),
    caption: captionSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => value.registration_text !== undefined || value.caption !== undefined,
    'An update must change caption or registration_text',
  );

export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;

/**
 * The owner projection, section 4. Exactly the eighteen granted columns plus
 * the masked caption and the is_approved boolean. No approved_by, no
 * approval_kind, no approved_revision, no lease_token.
 */
export const ownerSubmissionSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    client_submission_id: uuidSchema,
    state: submissionStateSchema,
    registration_text: z.string().nullable(),
    taken_at: utcTimestampSchema.nullable(),
    airport_icao: icaoSchema.nullable(),
    ingestion_source: z.enum(['native_mobile', 'concierge_backfill', 'admin_import']),
    contribution_batch_id: uuidSchema.nullable(),
    resolved_airframe_id: uuidSchema.nullable(),
    resolved_registration_id: uuidSchema.nullable(),
    resolution_outcome: z
      .enum(['matched', 'stub_enriched', 'stub_pending', 'ambiguous', 'invalid'])
      .nullable(),
    sighting_id: uuidSchema.nullable(),
    rejection_reason: z.string().nullable(),
    resubmit_count: z.number().int().min(0).max(3),
    created_at: utcTimestampSchema,
    updated_at: utcTimestampSchema,
    /** Null when caption_hidden, never the raw value behind a flag. */
    caption: captionSchema.nullable(),
    /** approved_revision = content_revision and approved_at is set. */
    is_approved: z.boolean(),
  })
  .strict();

export type OwnerSubmission = z.infer<typeof ownerSubmissionSchema>;

/**
 * publish_submission result, section 5.1. sighting_id is null until the job
 * commits. A client must never synthesise one, AGENTS.md section 4.
 */
export const publishResultSchema = z
  .object({
    submission_id: uuidSchema,
    job_id: uuidSchema,
    stage: z.enum([
      'waiting_authorization',
      'claimed',
      'resolved',
      'copied',
      'verified',
      'committed',
      'cleanup',
      'failed',
    ]),
    sighting_id: uuidSchema.nullable(),
  })
  .strict();

export type PublishResult = z.infer<typeof publishResultSchema>;

/** resolve_airframe result row, section 5.1. */
export const resolveAirframeResultSchema = z
  .object({
    airframe_id: uuidSchema.nullable(),
    registration_id: uuidSchema.nullable(),
    outcome: z.enum(['matched', 'stub_enriched', 'stub_pending', 'ambiguous', 'invalid']),
  })
  .strict();

/**
 * Push payload data, section 5.4. Exactly three ids and nothing else. No
 * caption, no location, no media URL, invariants 6 and 9.
 */
export const pushPayloadSchema = z
  .object({
    alert_id: uuidSchema,
    sighting_id: uuidSchema,
    airframe_id: uuidSchema,
  })
  .strict();

export type PushPayload = z.infer<typeof pushPayloadSchema>;

/** Deep link for a sighting, section 5.4. */
export function sightingDeepLink(sightingId: string): string {
  return `planespotter://s/${uuidSchema.parse(sightingId)}`;
}

/** toggle_follow arguments. A11, created_via affects only the permission moment. */
export const toggleFollowSchema = z
  .object({
    target_type: z.enum(['airframe', 'airport']),
    target_id: z.string().min(1),
    created_via: z.enum(['deliberate', 'onboarding']).default('deliberate'),
  })
  .strict();
