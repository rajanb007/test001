/**
 * Redaction tests for the analytics wrapper, invariant 9.
 * Author CKC. Version 1.0.
 */
import { describe, expect, it } from 'vitest';
import {
  CAPTURE_MILESTONES,
  EVENT_NAMES,
  SCHEMA_VERSION,
  buildEvent,
  createAnalytics,
  isForbiddenKey,
  redact,
} from './events.js';
import type { EventName, EventProperties } from './events.js';

const context = {
  hub: 'EGLL',
  platform: 'ios' as const,
  isInternalCohort: false,
  now: () => new Date('2026-09-20T12:00:00.000Z'),
};

describe('the taxonomy is exhaustive and matches BuildPack section 8.1', () => {
  it('has exactly the twenty two documented events', () => {
    expect(EVENT_NAMES).toHaveLength(22);
  });

  it('has no duplicates', () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });

  it('rejects an event outside the taxonomy, ruling A2', () => {
    expect(() => buildEvent('sighting_deleted' as EventName, {}, context)).toThrow(
      /Unknown analytics event/,
    );
  });

  it('carries the five capture milestones, ruling A5', () => {
    expect(CAPTURE_MILESTONES).toEqual(['source', 'details', 'registration', 'caption', 'review']);
  });
});

describe('invariant 9, prohibited fields never reach analytics', () => {
  it.each([
    'exif',
    'rawExif',
    'raw_exif',
    'EXIF',
    'gps',
    'lat',
    'lon',
    'latitude',
    'longitude',
    'coords',
    'captured_geo',
    'capturedGeo',
    'display_geo',
    'caption',
    'email',
    'emailAddress',
    'moderation_note',
    'rejection_reason',
    'original_path',
    'media_url',
    'signed_url',
    'lease_token',
    'handle',
    'display_name',
  ])('%s is forbidden', (key) => {
    expect(isForbiddenKey(key)).toBe(true);
  });

  it.each(['airframe_id', 'submission_id', 'from_state', 'to_state', 'milestone', 'hub'])(
    '%s is allowed',
    (key) => {
      expect(isForbiddenKey(key)).toBe(false);
    },
  );

  it('strips forbidden keys from a flat payload', () => {
    const clean = redact({ airframe_id: 'a', caption: 'nice light', gps: [1, 2] });
    expect(clean).toEqual({ airframe_id: 'a' });
  });

  it('strips them at depth, not just at the top level', () => {
    const clean = redact({
      submission: { id: 's1', exif: { iso: 100 }, nested: { caption: 'x', ok: 1 } },
    });
    expect(clean).toEqual({ submission: { id: 's1', nested: { ok: 1 } } });
  });

  it('drops any URL value whatever the key is called', () => {
    // A private media URL under an innocent name is the same leak.
    const clean = redact({ thumb: 'https://example.test/private/abc.jpg', width: 400 });
    expect(clean).toEqual({ width: 400 });
  });

  it('R13, a publish nonce or public key never reaches analytics', () => {
    const clean = redact({ publish_nonce: 'deadbeef', public_keys: ['a/b.jpg'], sighting_id: 's' });
    expect(clean).toEqual({ sighting_id: 's' });
  });
});

describe('the envelope', () => {
  it('carries schema_version, hub, platform, timestamp and the cohort flag', () => {
    const payload = buildEvent('passport_viewed', { airframe_id: 'a1' }, context);
    expect(payload).toEqual({
      airframe_id: 'a1',
      schema_version: SCHEMA_VERSION,
      hub: 'EGLL',
      platform: 'ios',
      timestamp: '2026-09-20T12:00:00.000Z',
      is_internal_cohort: false,
    });
  });

  it('emits the timestamp in UTC', () => {
    const payload = buildEvent('spot_toggled', {}, context);
    expect(payload.timestamp).toMatch(/Z$/);
  });

  it('labels internal cohorts so they can be excluded, guardrail 8.4', () => {
    const payload = buildEvent('sighting_published', {}, { ...context, isInternalCohort: true });
    expect(payload.is_internal_cohort).toBe(true);
  });

  it('redaction cannot be bypassed by shadowing an envelope field', () => {
    const payload = buildEvent(
      'sighting_published',
      { caption: 'leak', schema_version: 99 } as EventProperties,
      context,
    );
    expect(payload).not.toHaveProperty('caption');
    expect(payload.schema_version).toBe(SCHEMA_VERSION);
  });
});

describe('createAnalytics is the only surface feature code touches', () => {
  it('passes the redacted payload to the sink', () => {
    const seen: Array<{ name: string; payload: EventProperties }> = [];
    const analytics = createAnalytics((name, payload) => {
      seen.push({ name, payload });
    }, context);

    analytics.track('submission_state_changed', {
      from_state: 'received',
      to_state: 'processing',
      caption: 'should not survive',
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.name).toBe('submission_state_changed');
    expect(seen[0]?.payload).not.toHaveProperty('caption');
    expect(seen[0]?.payload['from_state']).toBe('received');
  });

  it('R9, no event or property in the taxonomy is called delivered', () => {
    for (const name of EVENT_NAMES) {
      expect(name).not.toMatch(/deliver/i);
    }
  });
});
