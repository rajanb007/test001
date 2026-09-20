/**
 * Shared domain types. Mirrors the enums in supabase/migrations/0002_enums.sql.
 * Author CKC. Version 1.0.
 *
 * These are a copy of a database contract, so they are checked against the
 * migration rather than trusted. types.test.ts parses 0002_enums.sql and fails
 * if either side gains or loses a member. AGENTS.md section 3, a new
 * submission_state or transition needs a CKC ruling; the state machine in
 * docs/SPEC.md section 3.3 is exhaustive.
 */

export const SUBMISSION_STATES = [
  'received',
  'processing',
  'awaiting_identification',
  'awaiting_review',
  'quarantined',
  'published',
  'rejected',
  'cancelled',
] as const;
export type SubmissionState = (typeof SUBMISSION_STATES)[number];

export const SIGHTING_STATUSES = ['published', 'deleted'] as const;
export type SightingStatus = (typeof SIGHTING_STATUSES)[number];

export const INGESTION_SOURCES = ['native_mobile', 'concierge_backfill', 'admin_import'] as const;
export type IngestionSource = (typeof INGESTION_SOURCES)[number];

export const STUB_STATUSES = ['pending', 'enriched', 'verified', 'conflicted', 'rejected'] as const;
export type StubStatus = (typeof STUB_STATUSES)[number];

export const TRUST_TIERS = ['new', 'trusted', 'verified'] as const;
export type TrustTier = (typeof TRUST_TIERS)[number];

export const FOLLOW_TARGETS = ['airframe', 'airport'] as const;
export type FollowTarget = (typeof FOLLOW_TARGETS)[number];

export const CONFLICT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

export const REPORT_STATUSES = ['open', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const PRIVACY_POLICY_TYPES = [
  'ladd',
  'owner_request',
  'sensitive_operator',
  'jurisdiction',
  'internal_safety',
] as const;
export type PrivacyPolicyType = (typeof PRIVACY_POLICY_TYPES)[number];

export const POLICY_STATUSES = ['active', 'expired', 'revoked'] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

/**
 * R9. provider_accepted means APNs or FCM accepted the push. Nothing in this
 * system is ever called delivered, and no state below says so.
 */
export const ALERT_EVENT_STATUSES = [
  'pending',
  'sent',
  'provider_accepted',
  'provider_rejected',
  'skipped',
] as const;
export type AlertEventStatus = (typeof ALERT_EVENT_STATUSES)[number];

export const DELIVERY_STATUSES = [
  'pending',
  'sending',
  'sent',
  'provider_accepted',
  'provider_rejected',
  'failed',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const RESOLUTION_OUTCOMES = [
  'matched',
  'stub_enriched',
  'stub_pending',
  'ambiguous',
  'invalid',
] as const;
export type ResolutionOutcome = (typeof RESOLUTION_OUTCOMES)[number];

/** Publish job stages. Preflight is an operation inside claimed, never a stage. */
export const PUBLISH_JOB_STAGES = [
  'waiting_authorization',
  'claimed',
  'resolved',
  'copied',
  'verified',
  'committed',
  'cleanup',
  'failed',
] as const;
export type PublishJobStage = (typeof PUBLISH_JOB_STAGES)[number];

/**
 * Local-only queue substates. The SQLite queue mirrors submission_state and
 * adds these two for the window before the server has the row at all,
 * BuildPack section 3.1. They are never written to the server.
 */
export const LOCAL_QUEUE_STATES = ['saved_on_device', 'waiting_for_connection'] as const;
export type LocalQueueState = (typeof LOCAL_QUEUE_STATES)[number];

export type QueueState = SubmissionState | LocalQueueState;

/**
 * Queue labels, docs/DESIGN.md section 6 and BuildPack section 7.3.
 * Sentence case, no exclamation marks, and nothing promises background upload.
 */
export const QUEUE_STATE_LABELS: Readonly<Record<QueueState, string>> = {
  received: 'Uploading',
  processing: 'Processing photo',
  awaiting_identification: 'Needs a registration',
  awaiting_review: 'In review',
  quarantined: 'Aircraft identity needs review',
  published: 'Published',
  rejected: 'Not published',
  cancelled: 'Cancelled',
  saved_on_device: 'Saved on this device',
  waiting_for_connection: 'Waiting for connection',
};
