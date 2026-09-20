/**
 * The only path to analytics. BuildPack v1.8 section 8.1.
 * Author CKC. Version 1.0.
 *
 * The taxonomy below is exhaustive for the MVP. Adding an event needs a
 * CKC-approved edit to BuildPack section 8.1 first, AGENTS.md section 3.
 *
 * Invariant 9, telemetry hygiene. Raw EXIF, exact GPS, private media URLs,
 * captions, emails and free-text moderation notes never enter analytics or
 * crash logs. That is enforced here at runtime by redact(), not left to the
 * discipline of call sites, because a call site only has to be wrong once.
 */

/** Every event name. Exhaustive, BuildPack section 8.1. */
export const EVENT_NAMES = [
  'submission_saved_local',
  'submission_created',
  'media_upload_completed',
  'submission_state_changed',
  'sighting_published',
  'airframe_follow_created',
  'airport_follow_created',
  'notification_permission_prompted',
  'notification_permission_resolved',
  'alert_event_created',
  'provider_receipt_resolved',
  'alert_opened',
  'attributed_session_started',
  'passport_viewed',
  'profile_viewed',
  'portfolio_export_generated',
  'share_card_generated',
  'public_page_viewed',
  'search_performed',
  'spot_toggled',
  'pro_interest_tapped',
  'capture_step_reached',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** A5. Four UI steps, five telemetry milestones. */
export const CAPTURE_MILESTONES = [
  'source',
  'details',
  'registration',
  'caption',
  'review',
] as const;
export type CaptureMilestone = (typeof CAPTURE_MILESTONES)[number];

/**
 * Property keys that are forbidden everywhere, invariant 9. Matching is on the
 * normalised key, so exif, rawExif, raw_exif and EXIF all collapse to one.
 */
const FORBIDDEN_KEYS: readonly string[] = [
  'exif',
  'rawexif',
  'gps',
  'lat',
  'lon',
  'lng',
  'latitude',
  'longitude',
  'coords',
  'coordinates',
  'capturedgeo',
  'displaygeo',
  'caption',
  'email',
  'emailaddress',
  'moderationnote',
  'moderationnotes',
  'reason',
  'rejectionreason',
  'note',
  'notes',
  'originalpath',
  'mediaurl',
  'mediapath',
  'signedurl',
  'publickey',
  'publickeys',
  'publishnonce',
  'nonce',
  'leasetoken',
  'token',
  'handle',
  'displayname',
];

/** Normalises a key for matching, so raw_exif, rawExif and EXIF all agree. */
function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** True when a property key may never be sent, invariant 9. */
export function isForbiddenKey(key: string): boolean {
  const normalised = normaliseKey(key);
  return FORBIDDEN_KEYS.some(
    (forbidden) => normalised === forbidden || normalised.endsWith(forbidden),
  );
}

export type EventProperties = Record<string, unknown>;

/**
 * Strips every forbidden key, at any depth, and returns what is left.
 *
 * R13, a public derivative key is undiscoverable until commit, so a nonce or
 * an object key reaching analytics before then would leak it. Values that look
 * like a URL are dropped whatever the key is called, because a private media
 * URL under an innocent name is the same leak.
 *
 * Arrays are walked too. An array is a container, not a leaf: a list of
 * objects carries property keys and a list of strings carries URLs, so
 * skipping them would leave the depth promise above untrue.
 */
export function redact<T extends EventProperties>(properties: T): EventProperties {
  const clean: EventProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (isForbiddenKey(key)) continue;
    const cleaned = redactValue(value);
    if (cleaned === DROPPED) continue;
    clean[key] = cleaned;
  }
  return clean;
}

/** Sentinel for a value the redactor removes rather than rewrites. */
const DROPPED = Symbol('dropped');

/** Redacts one value, at any depth, inside or outside an array. */
function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? DROPPED : value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue).filter((entry) => entry !== DROPPED);
  }
  if (value !== null && typeof value === 'object') {
    return redact(value as EventProperties);
  }
  return value;
}

/** Envelope fields every event carries, BuildPack section 8.1. */
export type EventEnvelope = {
  schema_version: number;
  hub: string | null;
  platform: 'ios' | 'android' | 'web';
  /** ISO 8601 in UTC. */
  timestamp: string;
  /** Internal testers are labelled and excluded from market validation, 8.4. */
  is_internal_cohort: boolean;
};

export const SCHEMA_VERSION = 1;

/** Where a built event goes. Wired to PostHog in Block 5. */
export type EventSink = (
  name: EventName,
  payload: EventProperties & EventEnvelope,
) => void | Promise<void>;

export type EventContext = {
  hub: string | null;
  platform: EventEnvelope['platform'];
  isInternalCohort: boolean;
  /** Injected so tests are deterministic. */
  now?: () => Date;
};

/**
 * Builds the payload for an event. Exported so tests can assert the exact
 * shape without a sink. Unknown names are rejected: the taxonomy is the only
 * analytics surface, ruling A2.
 */
export function buildEvent(
  name: EventName,
  properties: EventProperties,
  context: EventContext,
): EventProperties & EventEnvelope {
  if (!(EVENT_NAMES as readonly string[]).includes(name)) {
    throw new Error(
      `Unknown analytics event: ${name}. The taxonomy in BuildPack section 8.1 is exhaustive.`,
    );
  }
  const clock = context.now ?? (() => new Date());
  return {
    ...redact(properties),
    schema_version: SCHEMA_VERSION,
    hub: context.hub,
    platform: context.platform,
    timestamp: clock().toISOString(),
    is_internal_cohort: context.isInternalCohort,
  };
}

/** Creates the tracker. This is the only thing feature code imports. */
export function createAnalytics(sink: EventSink, context: EventContext) {
  return {
    track(name: EventName, properties: EventProperties = {}): void | Promise<void> {
      return sink(name, buildEvent(name, properties, context));
    },
  };
}

export type Analytics = ReturnType<typeof createAnalytics>;
