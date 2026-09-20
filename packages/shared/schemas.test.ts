/**
 * Contract tests for the shared schemas.
 * Author CKC. Version 1.0.
 */
import { describe, expect, it } from 'vitest';
import {
  createSubmissionSchema,
  handleSchema,
  ownerSubmissionSchema,
  publishResultSchema,
  pushPayloadSchema,
  sightingDeepLink,
  updateSubmissionSchema,
  utcTimestampSchema,
} from './schemas.js';

const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const other = '9c858901-8a57-4791-81fe-4c455b099bc9';

describe('handles match the database check constraint', () => {
  it.each(['ckc', 'a1b2', 'spotter-01', 'spotter_01'])('%s is valid', (handle) => {
    expect(handleSchema.safeParse(handle).success).toBe(true);
  });

  it.each(['ab', '-abc', 'ABC', 'a'.repeat(31), 'spot ter'])('%s is rejected', (handle) => {
    expect(handleSchema.safeParse(handle).success).toBe(false);
  });
});

describe('timestamps are UTC on the wire, section 5.4', () => {
  it('accepts a Z timestamp', () => {
    expect(utcTimestampSchema.safeParse('2026-09-20T12:00:00.000Z').success).toBe(true);
  });

  it('rejects a local offset rather than coercing it', () => {
    expect(utcTimestampSchema.safeParse('2026-09-20T12:00:00+01:00').success).toBe(false);
  });

  it('rejects a bare date', () => {
    expect(utcTimestampSchema.safeParse('2026-09-20').success).toBe(false);
  });
});

describe('create_submission payload, invariant 1', () => {
  it('needs only the client generated id, everything else is optional', () => {
    expect(createSubmissionSchema.safeParse({ client_submission_id: uuid }).success).toBe(true);
  });

  it('accepts a full payload', () => {
    const result = createSubmissionSchema.safeParse({
      client_submission_id: uuid,
      registration_text: 'G-ABCD',
      taken_at: '2026-09-20T09:30:00.000Z',
      captured_geo: { longitude: -0.4543, latitude: 51.47 },
      airport_icao: 'EGLL',
      caption: 'Morning arrival',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a caption over the 500 character column limit', () => {
    const result = createSubmissionSchema.safeParse({
      client_submission_id: uuid,
      caption: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('refuses a client supplied state, section 5.5', () => {
    const result = createSubmissionSchema.safeParse({
      client_submission_id: uuid,
      state: 'published',
    });
    expect(result.success).toBe(false);
  });

  it.each(['approved_revision', 'approval_kind', 'approved_by', 'review_required', 'lease_token'])(
    'refuses the approval field %s',
    (field) => {
      const result = createSubmissionSchema.safeParse({
        client_submission_id: uuid,
        [field]: 'anything',
      });
      expect(result.success).toBe(false);
    },
  );

  it('rejects out of range coordinates', () => {
    const result = createSubmissionSchema.safeParse({
      client_submission_id: uuid,
      captured_geo: { longitude: 200, latitude: 51 },
    });
    expect(result.success).toBe(false);
  });
});

describe('update_submission payload, R11', () => {
  it('accepts a caption edit', () => {
    expect(updateSubmissionSchema.safeParse({ caption: 'Fixed' }).success).toBe(true);
  });

  it('accepts a registration correction', () => {
    expect(updateSubmissionSchema.safeParse({ registration_text: 'G-ABCD' }).success).toBe(true);
  });

  it('rejects an empty update', () => {
    expect(updateSubmissionSchema.safeParse({}).success).toBe(false);
  });

  it('has no media field, the photo is immutable across resubmits', () => {
    const result = updateSubmissionSchema.safeParse({
      caption: 'Fixed',
      original_path: 'originals/u/1',
    });
    expect(result.success).toBe(false);
  });
});

describe('the owner projection never carries approval internals, section 4', () => {
  const projection = {
    id: uuid,
    user_id: other,
    client_submission_id: uuid,
    state: 'awaiting_review' as const,
    registration_text: 'G-ABCD',
    taken_at: '2026-09-20T09:30:00.000Z',
    airport_icao: 'EGLL',
    ingestion_source: 'native_mobile' as const,
    contribution_batch_id: null,
    resolved_airframe_id: null,
    resolved_registration_id: null,
    resolution_outcome: null,
    sighting_id: null,
    rejection_reason: null,
    resubmit_count: 0,
    created_at: '2026-09-20T09:31:00.000Z',
    updated_at: '2026-09-20T09:31:00.000Z',
    caption: null,
    is_approved: false,
  };

  it('accepts the exact allowlist', () => {
    expect(ownerSubmissionSchema.safeParse(projection).success).toBe(true);
  });

  it.each(['approved_by', 'approval_kind', 'approved_revision', 'approved_at', 'lease_token'])(
    'rejects a projection carrying %s',
    (field) => {
      const result = ownerSubmissionSchema.safeParse({ ...projection, [field]: 'leaked' });
      expect(result.success).toBe(false);
    },
  );

  it('caps resubmit_count at three, R11', () => {
    expect(ownerSubmissionSchema.safeParse({ ...projection, resubmit_count: 4 }).success).toBe(
      false,
    );
  });
});

describe('publish result, R7', () => {
  it('allows a null sighting_id before commit', () => {
    const result = publishResultSchema.safeParse({
      submission_id: uuid,
      job_id: other,
      stage: 'copied',
      sighting_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects preflight as a stage, BuildPack section 5.5', () => {
    const result = publishResultSchema.safeParse({
      submission_id: uuid,
      job_id: other,
      stage: 'preflight',
      sighting_id: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('push payload carries three ids and nothing else, invariants 6 and 9', () => {
  it('accepts the documented shape', () => {
    const result = pushPayloadSchema.safeParse({
      alert_id: uuid,
      sighting_id: other,
      airframe_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it.each(['caption', 'display_geo', 'airport_icao', 'media_url'])(
    'rejects a payload carrying %s',
    (field) => {
      const result = pushPayloadSchema.safeParse({
        alert_id: uuid,
        sighting_id: other,
        airframe_id: uuid,
        [field]: 'leaked',
      });
      expect(result.success).toBe(false);
    },
  );
});

describe('deep link, section 5.4', () => {
  it('builds the documented scheme', () => {
    expect(sightingDeepLink(uuid)).toBe(`planespotter://s/${uuid}`);
  });

  it('refuses anything that is not a sighting id', () => {
    expect(() => sightingDeepLink('../../etc/passwd')).toThrow();
  });
});
