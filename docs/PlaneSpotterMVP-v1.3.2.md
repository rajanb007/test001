# PlaneSpotter MVP Specification

| Field | Value |
|---|---|
| Working title | PlaneSpotter (placeholder, final name pending) |
| Author | CKC |
| Version | 1.3.2 |
| Date | 2026-08-29 |
| Status | Validation MVP, profile patch merged, implementation-ready |
| Platforms | iOS and Android (React Native + Expo), thin read-only web layer, minimal internal admin console |

---

## 0. Executive Product Thesis

PlaneSpotter is not primarily a social network for aviation photographers and not another personal spotting logbook.

The core object is the **airframe**.

Each airframe accumulates:

- registrations,
- operators,
- sightings,
- locations,
- photographers,
- corrections,
- provenance,
- privacy policy,
- follower interest,
- and community activity over time.

The wedge:

1. A spotter photographs an aircraft.
2. The sighting attaches to that airframe's permanent history.
3. Another user follows that airframe.
4. When the airframe is spotted again, the follower is alerted.
5. The follower returns to the new sighting or Aircraft Passport.
6. Share cards bring additional users into the aircraft history.
7. Cross-user contributions create a community-maintained aircraft graph that becomes increasingly difficult to recreate.

The Validation MVP answers one question:

> **Will people contribute to a shared aircraft history and return because other people continue adding to the same airframes?**

The product is not considered validated merely because:

- historical photos were imported,
- ambassadors uploaded large archives,
- users browse active airports,
- or total sighting volume is high.

The airframe thesis is validated only if users demonstrate repeated cross-user airframe behavior.

If this behavior does not emerge, PlaneSpotter does not expand into native video, advanced gamification, realtime tracking, or premium analytics.

---

## 1. Strategic Positioning

PlaneSpotter does not claim to be the first registration-based aviation product.

Existing products already cover combinations of:

- aircraft lookup,
- aviation photography,
- spotting logs,
- maps,
- fleet completion,
- community content,
- and flight tracking.

| Product pattern | Primary object |
|---|---|
| Instagram | Creator / post |
| Flightradar24 | Flight / movement |
| JetPhotos | Photo archive |
| Spotting logbook | My collection |
| PlaneSpotter | Airframe history |

PlaneSpotter's differentiation is the combination of:

- persistent airframe identity,
- historical registration relationships,
- cross-user sighting history,
- contributor provenance,
- follower behavior,
- community correction,
- and a modern mobile contribution loop.

### Defensibility thesis

The product should not assume community density alone is a durable moat.

Potential defensibility compounds from:

1. **Community density**
2. **Airframe identity graph**
3. **Registration and operator history**
4. **Cross-user sighting graph**
5. **Contributor reputation and provenance**
6. **Personal follow and collection history**
7. **Creator distribution through share objects**
8. **Accumulated moderation and correction history**

An incumbent can copy a Follow button.

It is harder to recreate years of corrected airframe identity, community provenance, contributor history, and network relationships.

---

## 2. Aircraft Passport

Each airframe profile is an **Aircraft Passport**.

### MVP Passport

- current registration,
- manufacturer,
- aircraft type,
- current operator where known,
- chronological sightings,
- contributor count,
- sighting locations subject to privacy rules,
- Hero Image,
- follow action,
- Spot count,
- basic metadata.

### Future Passport

Architecture remains open for:

- historical registrations,
- operator history,
- livery history,
- ownership history,
- serial / construction-number lineage,
- retirement history,
- notable sightings,
- timeline playback,
- richer fleet relationships.

No future Passport capability is built before the Validation MVP proves the core return loop.

---

## 3. North Star and Validation Metrics

### 3.1 Product North Star

> **Weekly Active Airframes receiving new in-product sightings from 2 or more unique contributors.**

Important:

**Concierge backfill and administrative imports do not count toward this North Star.**

This prevents historical catalog seeding from creating false network-effect signals.

### 3.2 Thesis Metric

> **Airframe Triggered Return Rate**

Definition:

Of users who:

1. follow a specific airframe,
2. have valid push permission,
3. receive a successfully accepted followed-airframe alert,
4. and have not already viewed the sighting,

what percentage open the alert, sighting, or Aircraft Passport within the defined attribution window?

Recommended windows:

- 24-hour return rate,
- 72-hour return rate.

This is the most important metric for validating the core airframe thesis.

### 3.3 Supporting Metrics

#### Supply

- native published sightings per week,
- imported/backfilled sightings per week,
- active native contributors per hub,
- distinct airframes with native sightings,
- percentage of active airframes with 2+ native contributors,
- median native sightings per contributor,
- contribution concentration among top 10 percent of contributors.

#### Demand

- followed airframes per collector,
- passport revisits,
- feed return rate,
- Airframe Triggered Return Rate,
- alert-to-open rate,
- follows created after viewing public share pages,
- profile views per contributor,
- portfolio-export count.

#### Growth

- share-card generation rate,
- public share-page views,
- store-click rate,
- install attribution where measurable,
- install-to-first-follow conversion,
- install-to-first-contribution conversion,
- ambassador invite conversion.

#### Trust

- correction rate,
- duplicate detection rate,
- first-five-post rejection rate,
- confirmed stolen-content incidents,
- moderation queue age,
- stub conflict rate,
- user-block rate,
- user-report rate.

---

## 4. Activation and Retention

### 4.1 Contributor Activation

A contributor is activated when they:

1. publish one validated **native in-product** sighting,
2. view the resulting Aircraft Passport,
3. and return within 7 days.

Target:

> **40 percent+ of approved contributor-oriented beta users complete this path within 7 days.**

Imported or concierge-backfilled historical content does not satisfy contributor activation.

### 4.2 Collector Activation

A collector is activated when they:

1. follow 5 or more eligible entities,
2. include at least one airframe,
3. and return within 7 days after activity on any followed entity.

High-frequency onboarding recommendations should prioritize:

1. home/favorite airport,
2. locally recurring airframes,
3. relevant aircraft types,
4. rare airframes last.

This broad activation definition supports useful onboarding but **does not replace the Airframe Triggered Return metric**.

### 4.3 Retention Targets

- 25 percent+ D30 retention among activated contributors.
- 20 percent+ D30 retention among activated collectors.

Retention can be healthy while the airframe thesis is weak, so retention is never interpreted without the Thesis Metric.

---

## 5. Validation MVP Scope

### P0 — Must Have

- aircraft master-data spine,
- persistent airframe identity,
- historical registration model,
- server-authoritative stub flow,
- entity-resolution conflict quarantine,
- native photo upload,
- EXIF extraction,
- media derivatives,
- durable offline upload queue,
- idempotent sighting creation,
- TUS resumable media upload,
- perceptual duplicate detection,
- Aircraft Passport,
- follow airframe,
- follow airport,
- minimal contributor profile (in-app and public, no follow button),
- reverse-chronological home feed,
- followed-airframe push alert,
- Spot button,
- typed search,
- authenticated airframe sighting map,
- moderation queue,
- trust ladder,
- correction audit,
- user blocking,
- user reporting,
- content reporting,
- terms acceptance/version tracking,
- support/contact surface,
- minimal internal admin console,
- privacy suppression,
- application-controlled static map snapshots,
- share cards,
- portfolio-grid export,
- public sighting page,
- public airframe page,
- public spotter page,
- concierge backfill importer,
- analytics,
- crash/error monitoring,
- Pro-interest fake door.

### Deferred

- native video,
- video streaming,
- Instagram embeds,
- YouTube embeds,
- advanced badge system,
- advanced Spotter Score,
- ranked Explore,
- global heatmap,
- user-submitted spotting locations,
- realtime ADS-B,
- advanced notification preferences,
- direct messages,
- web upload,
- full web application,
- print marketplace,
- airline/MRO partnerships,
- paid Pro tier,
- advanced fleet completion,
- X integration.

### v1.3.1 Scope Reduction

The following are explicitly deferred from P0 to reduce product and moderation surface:

- **comments**
- **follow user / photographer**

Rationale:

Neither capability is required to validate:

> contribute → airframe → follow → alert → return.

Both add generic social-network behavior and moderation surface before the core thesis is proven.

v1.3.2 note. Deferring follow-user does not remove the contributor profile itself. The minimal profile is in scope, see section 9.5. Recognition surface, not a social graph.

---

## 6. Content Capture, Media, and Offline Contract

### 6.1 Capture

Native photo upload with:

- EXIF timestamp,
- GPS,
- camera data,
- image dimensions,
- registration autocomplete,
- type/operator tagging,
- airport selection,
- perceptual duplicate detection,
- durable local queue.

### 6.2 Media Derivative Contract

Full-size DSLR originals must never be served directly into normal feeds.

Each successful media upload produces:

#### Original

- private/archive-quality source,
- never used as standard feed delivery,
- restricted access.

#### Feed Derivative

- mobile-optimized,
- used for feed cards,
- aggressively cacheable.

#### Detail Derivative

- higher-resolution viewing derivative,
- used for full-screen detail.

#### Share Derivative

- fixed social/share dimensions,
- generated for share cards and public previews.

This contract exists to constrain:

- Supabase egress,
- mobile bandwidth,
- latency,
- memory pressure,
- and cache churn.

### 6.3 Offline Publishing Contract

> **Capture → durable local file → SQLite queue → idempotent sighting creation → resumable media upload → async processing → moderation → publish.**

Rules:

- copy selected media into app-controlled persistent storage,
- never rely on a picker temp URI,
- store queue state in `expo-sqlite`,
- assign persistent `client_submission_id`,
- enforce backend uniqueness on `(user_id, client_submission_id)`,
- retry safely,
- use TUS resumable upload,
- treat NetInfo as a retry signal only,
- preserve media and metadata on failure,
- guarantee foreground recovery,
- treat background execution as opportunistic.

### 6.4 TUS Session Recovery

Local queue stores:

- `upload_session_url`,
- `upload_session_created_at`,
- `upload_session_expires_at`,
- last uploaded offset where useful.

If session remains valid:

> resume.

If expired:

> create a new upload session while preserving the same sighting and idempotency identity.

### 6.5 Queue States

```text
queued
preparing
creating_sighting
uploading_media
processing
pending_review
published
retry_wait
failed
cancelled
```

### 6.6 Acceptance Tests

- EXIF timestamp pre-populates taken-at.
- usable GPS suggests nearest airport.
- no GPS requires airport or explicit unknown location.
- known duplicate is flagged.
- app kill does not lose pending sighting.
- device restart does not lose pending sighting.
- expired TUS session recovers without duplicate sighting.
- repeated retry creates exactly one sighting.
- originals are never used in normal feed delivery.
- raw GPS never becomes public by default.

---

## 7. Airframe Identity, Stubs, and Entity Resolution

### 7.1 Identity Rule

The **airframe** is the durable canonical object.

A registration is an identity assigned to an airframe for a period of time.

Never assume:

> one registration = one aircraft forever.

### 7.2 Source Precedence

For US registrations:

- FAA is authoritative for current releasable registration state.
- OpenSky is bootstrap/supporting data.
- community input is supplemental.
- approved secondary providers may enrich but do not silently override higher-confidence facts.

### 7.3 Entity Resolution Contract

#### Auto-match order

1. exact serial/construction number + consistent manufacturer,
2. registration + consistent ICAO24,
3. registration-only candidate detection.

#### Critical v1.3.1 Rule

> **Registration-only matching never auto-merges two existing airframes.**

Registration-only matching may:

- surface a candidate,
- create a provisional relationship,
- attach a low-confidence source record for review.

It may not merge canonical airframe identities where conflicting historical evidence exists.

### 7.4 Conflict Conditions

Quarantine rather than merge when:

- same registration has conflicting serial numbers,
- same registration has conflicting aircraft types,
- same ICAO24 maps to different registrations unexpectedly,
- registration appears to have been reassigned,
- two sources disagree materially,
- an existing verified airframe would be overwritten.

Conflicts enter:

```text
import_conflicts
```

and are resolved in the admin console.

### 7.5 Stub Flow

Clients never create canonical airframes directly.

Flow:

```text
Client unresolved registration
        |
        v
Server normalize
        |
        v
Resolve active registration
        |
    Match? ---- Yes ---> Existing airframe
        |
        No
        |
        v
Transactional resolve-or-create
        |
        v
Idempotent stub
        |
        v
Attach sighting
        |
        v
Async enrichment
```

Stub states:

```text
pending
enriched
verified
conflicted
rejected
```

### 7.6 Enrichment

Use a provider abstraction:

```text
AircraftEnrichmentProvider
```

Only licensed/approved sources may participate.

Every enriched fact retains:

- source,
- source key,
- retrieved timestamp,
- effective date where known,
- confidence,
- verification status.

---

## 8. Data Model

Postgres + PostGIS on Supabase.

RLS applies to user-writable data.

### 8.1 Identity

| Table | Key fields |
|---|---|
| users | id, handle, display_name, avatar_url, trust_tier, home_airport, created_at |
| airframes | id, manufacturer, model, type_code, serial_number, year_built, status, is_stub, stub_resolution_status, stub_created_at, stub_last_checked_at, stub_confidence, created_at, updated_at |
| airframe_registrations | id, airframe_id, registration, country, icao24_hex, valid_from, valid_to, is_current, source_record_id |
| operators | id, icao, iata, name, country |
| airframe_operator_history | id, airframe_id, operator_id, valid_from, valid_to, source_record_id |
| aircraft_source_records | id, source_system, source_key, retrieved_at, effective_at, checksum, raw_reference, confidence |
| import_conflicts | id, conflict_type, registration, icao24_hex, source_record_ids, detected_at, status, resolved_by, resolution_note |

### 8.2 Sightings and Media

| Table | Key fields |
|---|---|
| sightings | id, airframe_id, registration_id, user_id, airport_icao, captured_geo, display_geo, taken_at, published_at, caption, status, client_submission_id, ingestion_source, contribution_batch_id |
| media | id, sighting_id, original_path, feed_path, detail_path, share_path, phash, exif, width, height, created_at |
| airports | icao, iata, name, geo, country, sighting_count |

`ingestion_source` values:

```text
native_mobile
concierge_backfill
admin_import
```

Behavioral metrics default to `native_mobile` unless explicitly stated otherwise.

Server idempotency:

```text
UNIQUE(user_id, client_submission_id)
```

Profile feed requires an index on `sightings (user_id, published_at)`. Stats on the contributor profile compute live at beta scale, counter denormalization is deferred until it hurts.

### 8.3 Social and Alerts

| Table | Key fields |
|---|---|
| follows | user_id, target_type, target_id, created_at |
| votes | user_id, sighting_id, created_at |
| device_push_tokens | user_id, token, platform, permission_state, updated_at |
| alert_events | id, user_id, airframe_id, sighting_id, created_at, expo_ticket_id, provider_status, provider_receipt_at, failure_reason, opened_at, session_attributed_at |

### 8.4 UGC Safety

| Table | Key fields |
|---|---|
| flags | id, sighting_id, user_id, reason, status, moderation_outcome, created_at |
| user_reports | id, reporter_user_id, reported_user_id, reason, status, moderation_outcome, created_at |
| user_blocks | blocker_user_id, blocked_user_id, created_at |
| terms_acceptance | user_id, terms_version, accepted_at |

### 8.5 Trust and Privacy

| Table | Key fields |
|---|---|
| sighting_corrections | id, sighting_id, field_name, old_value, new_value, corrected_by, reason, status, created_at |
| aircraft_privacy_policies | id, airframe_id, registration_id, policy_type, source, effective_from, effective_to, status, last_checked_at |
| owner_claims | id, airframe_id, claimant_user_id, claim_type, verification_status, created_at |

### 8.6 Local Device Queue

`pending_sightings`

Fields include:

- local_sighting_id,
- client_submission_id,
- local_media_path,
- upload_session_url,
- upload_session_created_at,
- upload_session_expires_at,
- exif_json,
- caption,
- registration_text,
- airframe_id,
- airport_icao,
- queue_state,
- retry_count,
- last_error,
- created_at,
- last_attempt_at.

---

## 9. Feed and Mobile UX

### 9.1 Feed Card

Photo owns the majority of the card.

Metadata strip:

- registration,
- type,
- operator,
- airport,
- date,
- photographer,
- Spot,
- share.

Registration remains visually dominant.

### 9.2 One Feed Engine

Supports:

- home,
- airframe timeline,
- airport page,
- user profile,
- search results.

Following a user remains deferred. The contributor profile itself is in scope, see section 9.5.

### 9.3 Detail View

- full image,
- zoom,
- safe EXIF subset,
- sighting metadata,
- privacy-safe compact map,
- previous/next navigation.

### 9.4 Hero Image — Simplified Beta Rule

Do not build a complex ranking algorithm before vote volume justifies it.

MVP:

> Eligible, moderated images rank primarily by unique Spot votes, with an admin override.

Optional simple tie-breakers:

1. unique Spot count,
2. recency,
3. moderation/trust eligibility.

Advanced trust weighting, quality scoring, and decay remain post-validation.

### 9.5 Contributor Profile (v1.3.2)

Recognition surface, not a social surface. No follow button, no comments, no messaging, no activity log. Reuses the existing feed engine and existing queries.

#### In-app profile screen

- Avatar, handle, display name.
- Home airport where set.
- Verified marker for Verified trust tier only. No score display, Spotter Score remains deferred.
- Stats row. Published sightings, distinct airframes, distinct airports, member since.
- Sighting feed, the standard card feed filtered by user, newest first. Grid view remains P1.
- Own profile only. Edit display name, avatar, home airport. Portfolio-grid export button lives here.

#### Photographer tap target

Photographer name and avatar on every feed card and detail view open the contributor profile.

#### Public spotter page

```text
/spotter/[handle]
```

Read-only. Same contents as the in-app screen minus edit controls, plus the store call to action. Photographer credit already appears on public sighting pages, so a dead name on the growth surface is removed. The route reuses existing sighting queries, share rendering, and the same edge-cache and purge rules as other public pages.

#### Backfill display rule

The profile shows **all** published content by the contributor, including concierge backfill. That visibility is the ambassador promise. Behavioral KPIs remain unchanged, backfilled content stays excluded from activation, North Star, and native-supply metrics. Display yes, metrics no. Backfilled items may carry a subtle archive marker.

#### Privacy and safety inheritance

- Suppressed sightings obey existing server-side rules on the profile feed.
- Blocked users' profiles and content stay out of the blocker's experience where practical.
- The deletion pipeline covers profile surfaces, the public spotter page joins the purge list.
- Handle is the public identifier. No email, no real-name requirement.

---

## 10. Followed-Airframe Alert

Exactly one notification type ships.

### 10.1 Trigger

A sighting reaches `published` for an airframe the user follows.

### 10.2 Permission Prompt Timing

Do not ask for notification permission at generic app startup.

Prompt at the value moment:

> User taps **Follow N123AB**  
> App explains: **Get notified when N123AB is spotted again?**

Track:

```text
follow_created
notification_permission_prompted
notification_permission_granted
alert_created
expo_ticket_received
provider_receipt_success
alert_opened
passport_or_sighting_viewed
```

### 10.3 Delivery

Expo Notifications.

Rate limit:

> maximum one alert per airframe per user per 24 hours.

Multiple qualifying aircraft may use batched copy.

### 10.4 Push Observability

`sent_at` alone is insufficient.

Track:

- local alert event created,
- Expo ticket ID,
- push-provider receipt,
- provider failure reason,
- permission state,
- opened timestamp,
- session attribution.

### 10.5 Metrics

Primary:

> **Airframe Triggered Return Rate**

Secondary:

- alert created,
- provider accepted,
- provider failure rate,
- alert-to-open,
- open-to-passport view,
- unfollow-after-alert,
- notification-permission acceptance.

### 10.6 Interpretation Rule

Do not interpret poor alert engagement until separating:

1. notification permission failure,
2. invalid device token/provider failure,
3. actual product-interest failure.

---

## 11. Map and Cost Containment

### 11.1 Authenticated App

Interactive Mapbox:

- airframe sighting pins,
- chronological filter,
- marker clustering,
- tap-to-open.

### 11.2 Public Web

Public pages never expose direct interactive map sessions.

Static map flow:

```text
Privacy-approved coordinates
        |
        v
Map snapshot generation
        |
        v
PlaneSpotter-controlled opaque asset
        |
        v
Public page references /mapsnapshot/{asset-id}
```

The public page should not depend permanently on a browser-visible third-party static-map URL containing sensitive location parameters.

### 11.3 Cache Strategy

Browser:

```text
short TTL
```

Edge/CDN:

```text
longer TTL + stale-while-revalidate
```

Application-controlled snapshot assets can be revoked immediately from PlaneSpotter-controlled surfaces.

### 11.4 Privacy Guarantee

PlaneSpotter guarantees invalidation of:

- PlaneSpotter public references,
- its own cached map derivatives,
- public page references,
- app-controlled CDN objects.

Upstream provider caches remain subject to provider behavior and contractual retention.

---

## 12. Privacy, Suppression, and Deletion

### 12.1 Coordinate Separation

Store separately:

- `captured_geo`,
- normalized sighting location,
- `display_geo`.

Raw captured coordinates are never public by default.

### 12.2 Policy Records

Privacy is represented through policy records rather than one boolean.

Policy examples:

- LADD-related suppression,
- owner-requested suppression,
- government/sensitive operator,
- jurisdiction-specific suppression,
- temporary internal safety suppression.

### 12.3 Deletion Pipeline

Account/content deletion triggers:

- database deletion/anonymization as required,
- media deletion,
- derivative deletion,
- share-card invalidation,
- map-snapshot invalidation,
- public page invalidation,
- public spotter page invalidation,
- cache purge on PlaneSpotter-controlled surfaces.

### 12.4 Telemetry

Never send:

- raw EXIF,
- exact GPS,
- private media URLs,

into standard analytics or crash logging.

---

## 13. Moderation, UGC Safety, and Admin Console

### 13.1 Trust Ladder

**New**
- first 5 contributions reviewed.

**Trusted**
- clean history permits auto-publication.

**Verified**
- can propose metadata corrections subject to audit.

### 13.2 Machine Checks

- registration format,
- perceptual duplicate,
- EXIF sanity,
- unsupported file,
- inconsistent metadata.

### 13.3 UGC Required Controls

P0 includes:

- report sighting,
- report user,
- block user,
- support/contact entry point,
- published community/UGC rules,
- terms acceptance/version tracking.

Blocked users' content should be removed from the blocker's normal experience where practical.

### 13.4 Flags

Threshold may re-queue content.

Flags do not automatically permanently remove content.

### 13.5 Corrections

Auditable:

- original value,
- proposed value,
- corrector,
- reason,
- outcome,
- timestamp.

### 13.6 Copyright / Stolen Content

The stolen-content strike policy remains:

- confirmed adjudicated violations,
- three confirmed violations may suspend/ban.

Before public launch, legal review must also cover:

- content license,
- copyright takedown process,
- DMCA §512 posture / designated agent decision if applicable,
- repeat-infringer policy,
- UGC terms.

### 13.7 Admin Console

Minimal auth-gated Next.js admin surface.

Screens:

- review queue,
- flag adjudication,
- user-report adjudication,
- correction approvals,
- import conflicts,
- stub status,
- stolen-content strikes,
- user trust tier,
- user blocks/reports visibility where necessary.

Founder does not moderate through raw database tools.

---

## 14. Growth Loop and Share Rendering

Loop:

1. Contributor publishes a native sighting.
2. Passport becomes richer.
3. Existing followers are alerted.
4. Contributor shares the sighting externally.
5. Viewer opens public page.
6. Viewer discovers airframe history.
7. Viewer installs/signs in.
8. Viewer follows or contributes.
9. Future sightings produce another return event.

### Share Card

Contains:

- photo,
- registration,
- type,
- operator,
- airport where permitted,
- date,
- photographer credit,
- PlaneSpotter branding,
- public deep link.

### Rendering

Server-render share assets through the web layer.

One rendering pipeline supports:

- single sighting cards,
- portfolio grids,
- public preview assets.

---

## 15. Launch and Cold Start

### 15.1 Density Before Breadth

Target:

- 2 to 3 hub archetypes,
- 20 to 30 meaningful contributors per active hub.

Recruiting may run in parallel.

Hub activation is staggered.

### 15.2 Archetypes

| Archetype | Candidate examples | Test |
|---|---|---|
| Global Passenger Gateway | LAX, LHR, AMS | Diversity and international overlap |
| High-Repetition Hub | ORD, DFW, ATL | Repeat airframes and return behavior |
| Cargo / Specialist | MEM, ANC | Rare registrations and specialist retention |

Candidates remain hypotheses.

### 15.3 Behavioral Launch Gate

A hub is not considered ready because 15 people verbally committed.

Before collector activation, require evidence such as:

- at least 15 recruited ambassadors,
- at least 10 onboarded,
- at least 5 successfully published through the app,
- sufficient seeded passport density from native + backfill content,
- moderation and import operations working.

Exact thresholds may be tuned during the first hub.

Principle:

> **Gate on behavior, not verbal commitment.**

### 15.4 Concierge Backfill

Backfill is retained because target DSLR photographers often manage their archive in desktop Lightroom.

Input:

- JPEG export folder,
- CSV manifest,
- signed permission/license statement.

Importer performs:

- validation,
- photographer attribution,
- batch assignment,
- duplicate checking,
- normal moderation.

All backfilled content is tagged:

```text
ingestion_source = concierge_backfill
```

and excluded from behavioral activation and North Star metrics.

### 15.5 Backfill Importer

Build one reusable internal importer.

Do not create one-off founder scripts for individual ambassadors.

### 15.6 Hub-Restricted Beta

Collector eligibility may consider:

- home airport,
- favorite airport,
- ambassador invitation,
- expressed interests,
- locally relevant aircraft.

Never hard-gate by physical GPS location.

---

## 16. Stack

| Layer | Choice | Note |
|---|---|---|
| Mobile | React Native + Expo / EAS | Single TypeScript codebase |
| Feed | @shopify/flash-list | High-performance list rendering |
| Images | expo-image | Native caching |
| Offline queue | expo-sqlite | Durable local upload state |
| Push | Expo Notifications | One alert type |
| Backend | Supabase Auth + Postgres + PostGIS + Storage | TUS support |
| Server logic | Supabase Edge Functions | Orchestration/light workflows |
| Async processing | Replaceable worker boundary | pHash and heavy image work |
| Maps | Mapbox | Interactive in app; generated snapshots on public web |
| Web + Admin | Next.js on Vercel | Public pages, share assets, admin |
| Analytics | PostHog | Product validation |
| Errors | Sentry | Mobile/backend observability |

Principle:

> **Boring architecture until usage proves otherwise.**

No Kubernetes, Kafka, microservice sprawl, or dedicated search platform before scale requires them.

---

## 17. Cost and Unit Economics

Primary drivers:

- original image storage,
- derivative storage,
- Supabase egress,
- database/API usage,
- static map generation,
- web bandwidth,
- async processing.

Track:

- average original size,
- feed derivative size,
- detail derivative size,
- storage per active contributor,
- cached/uncached egress per MAU,
- media requests per retained user,
- map snapshots per public-page session,
- processing cost per upload,
- infrastructure cost per retained user.

### Economic Guardrail

Do not optimize infrastructure around raw MAU alone.

The useful operating metric is:

> **Infrastructure cost per retained active contributor/collector.**

---

## 18. Build Order

### Phase 0 — Data and Identity
**3 to 4 weeks full-time**

- schema,
- auth,
- registration history,
- FAA import,
- OpenSky bootstrap,
- provenance,
- entity resolution,
- registration-only non-merge rule,
- conflict quarantine,
- server stub flow,
- enrichment provider abstraction,
- search.

**Exit:** source conflict quarantines rather than corrupting an airframe.

### Phase 1 — Contribution Loop
**4 to 5 weeks**

- photo upload,
- EXIF,
- durable local file,
- SQLite queue,
- TUS recovery,
- media derivatives,
- idempotent sighting create,
- async processing,
- moderation,
- admin core,
- Aircraft Passport,
- in-app contributor profile.

**Exit:** repeated forced retries produce one sighting and normal feed never loads originals.

### Phase 2 — Follow and Return
**2 to 3 weeks**

- follow airframe,
- follow airport,
- feed,
- Spot,
- push permission value-moment flow,
- followed-airframe alert,
- push receipt telemetry,
- simple map,
- user blocking/reporting,
- analytics.

**Exit:** User B follows an airframe, User A publishes, valid push reaches User B, User B opens the sighting, and the complete event chain is measurable.

### Phase 3 — Growth Loop
**2 to 3 weeks**

- server-rendered share assets,
- public pages,
- public spotter page,
- app-controlled map snapshots,
- cache invalidation,
- deletion pipeline,
- backfill importer,
- legal/support surfaces,
- deep links,
- beta hardening.

**Exit:** native contributor can publish/share, external viewer enters funnel, and backfilled history is visible but excluded from behavioral KPIs.

### Total

Full-time solo:

> **approximately 14 to 18 weeks after design stabilizes**

Part-time:

> **approximately 6 to 9 months**

These remain planning hypotheses. Profile additions are absorbed inside the existing ranges.

---

## 19. 90-Day Validation Gates

### 19.1 Continue / Invest

Strong evidence includes most of:

- 1,000+ total published sightings in 30 days,
- meaningful volume of **native** published sightings,
- at least one hub with repeat daily native contribution,
- 25 percent+ D30 contributor retention,
- 20 percent+ D30 collector retention,
- growing native Weekly Active Airframes with 2+ contributors,
- users follow airframes they did not upload,
- Airframe Triggered Return Rate is meaningfully positive,
- share pages generate qualified app traffic,
- contributor concentration is not dangerously dependent on a tiny number of ambassadors,
- moderation remains manageable.

### 19.2 Iterate

Continue but revise if:

- total content is strong because of backfill but native posting is weak,
- users follow airports but rarely airframes,
- collectors return to the feed but ignore airframe alerts,
- Passport views are high but revisits are low,
- contributors retain but collectors do not,
- collectors retain but contributors do not,
- top 10 percent of contributors dominate nearly all native supply,
- metadata quality creates disproportionate founder operations.

### 19.3 Pivot / Stop Expansion

Do not build native video, advanced gamification, paid analytics, or realtime tracking if:

- airframe follows remain rare,
- cross-user native contribution remains rare,
- valid airframe alerts produce little or no return behavior,
- D30 remains consistently below approximately 10 percent,
- the product functions only as a personal logbook,
- imported content is responsible for most apparent network activity,
- founder seeding is the only reason the community appears active.

---

## 20. Monetization

Launch remains free.

Permanent free community layer:

- publishing,
- Aircraft Passport,
- follows,
- search,
- basic map,
- Spots,
- sharing.

### Stage 1 — Feature Interest

Settings:

> **PlaneSpotter Pro — coming later**

Capture:

- interest tap,
- feature selection,
- optional qualitative note.

This measures interest, not willingness to pay.

### Stage 2 — Pricing Signal

Only after retention exists:

Present a concrete expected price range alongside proposed Pro capabilities.

Example concept:

> Advanced collections, watchlists, analytics, and exports — expected $X/year.

No payment required yet.

This begins to test price sensitivity.

### Stage 3 — Paid Beta

Actual payment only after:

- retention,
- repeat utility,
- and feature demand are demonstrated.

Potential future Pro:

- advanced watchlists,
- fleet completion,
- personal spotting analytics,
- advanced search,
- historical maps,
- exports,
- custom alert rules,
- licensed movement alerts.

---

## 21. Legal and Store-Readiness Gate

Before public beta, confirm:

- final content license,
- privacy policy,
- community/UGC policy,
- terms of use,
- support/contact surface,
- user reporting,
- user blocking,
- content reporting,
- account deletion,
- data export approach,
- copyright/takedown workflow,
- repeat-infringer policy,
- DMCA safe-harbor/designated-agent decision with counsel where applicable,
- source licensing/attribution obligations,
- aircraft suppression wording.

These are launch gates, not post-launch cleanup.

---

## 22. Risks

### Competitive Response

A larger aviation platform can copy individual social features.

Mitigation:

- graph depth,
- provenance,
- contributor history,
- airframe identity,
- community density,
- switching cost from accumulated follow/history data.

### False Validation from Backfill

Historical imports can make dashboards appear successful.

Mitigation:

- explicit ingestion source,
- native-only behavioral KPIs,
- imported history used for density, not validation.

### Entity Resolution Error

Wrong merges corrupt the product's core object.

Mitigation:

- registration-only never auto-merges existing airframes,
- precedence rules,
- quarantine,
- manual review.

### Notification Channel Failure

Poor delivery may masquerade as weak product demand.

Mitigation:

- permission telemetry,
- push tickets,
- provider receipts,
- product-loop metrics calculated on eligible delivered cohort.

### Cold Start

Empty hubs kill the experience.

Mitigation:

- staggered activation,
- behavioral hub gates,
- backfill for seed history,
- hub-affinity collector recruitment.

### Contributor Concentration

A few ambassadors may produce most supply.

Mitigation:

- top-10-percent concentration metric,
- broader contributor recruitment before geographic expansion.

### Media Economics

DSLR originals can create runaway storage and bandwidth.

Mitigation:

- derivative contract,
- originals never in feed,
- cached delivery,
- egress monitoring.

### UGC Abuse

Photos, captions, and profiles create moderation obligations.

Mitigation:

- block/report,
- terms,
- admin tooling,
- adjudicated moderation.

### Privacy

Sensitive locations may persist in derivatives or caches.

Mitigation:

- server-side suppression,
- application-controlled map snapshots,
- purge pipeline,
- telemetry hygiene.

### Founder Operations

One founder owns engineering, moderation, imports, and community activation.

Mitigation:

- comments/user-follow deferred,
- one alert type,
- reusable importer,
- minimal admin console,
- staggered launch.

---

## 23. Open Questions

| Question | Owner | Blocking |
|---|---|---|
| Final app name and trademark | Founder | Store listing |
| Exact first hub | Founder | Ambassador outreach |
| Final entity-resolution edge rules | Engineering | Phase 0 |
| Content license | Legal | Public beta |
| UGC/community policy | Legal/Product | Public beta |
| Copyright/DMCA process | Legal | Public beta |
| Aircraft suppression wording | Legal/Product | Public beta |
| Backfill permission statement | Legal | Concierge import |
| Hero Image initial tie-break rule | Product | Minor |
| Map snapshot implementation | Engineering | Phase 3 |
| Airframe Triggered Return attribution window | Product/Data | Before beta analysis |
| Stage-2 Pro price point | Founder | Post-retention |
| Native video provider | Engineering | Deferred |

---

## 24. Decision Log

### v1.3.1

| Decision | v1.3 | v1.3.1 |
|---|---|---|
| Registration-only entity match | Low-confidence match allowed | Candidate only; never auto-merges existing airframes |
| Comments | P0 | Deferred |
| Follow user | P0 | Deferred |
| UGC safety | Flags/moderation | Adds user blocking, user reporting, terms/contact requirements |
| Push measurement | Alert sent/opened | Permission + Expo ticket + provider receipt + open attribution |
| Core thesis metric | Alert-to-open included | Formal Airframe Triggered Return Rate |
| Backfill | Seeds passports | Explicitly excluded from behavioral KPIs and North Star |
| Ingestion provenance | Not behavioral | Adds ingestion_source and contribution_batch_id |
| Ambassador launch gate | 15 committed | Behavioral gate: recruited, onboarded, native publishing |
| Public static map | Static Mapbox URL | PlaneSpotter-controlled opaque snapshot asset |
| Media | Original + derivative fields | Explicit original/feed/detail/share derivative contract |
| Hero Image | Multi-factor score | Simplified beta rule: unique Spots + admin override |
| WTP fake door | Register interest | Explicitly classified as feature-interest signal only |
| Competitive moat | Density-speed emphasis | Density + graph + provenance + contributor/follow history |
| Legal | Content license/privacy | Adds UGC/store readiness and copyright/takedown gate |
| Contributor health | General contribution | Adds top-10-percent concentration metric |

### v1.3.2

| Decision | v1.3.1 | v1.3.2 |
|---|---|---|
| Contributor profile | Absent, over-cut with follow-user | Minimal profile restored, in-app and public, no follow button |
| Photographer tap | Dead end | Opens contributor profile |
| Portfolio-grid export home | No surface | Lives on own profile |
| Backfill visibility | Undefined on profile | Displayed on profile, still excluded from behavioral KPIs |
| Feed engine lenses | User profile removed | User profile restored |
| Public web surfaces | Sighting and airframe pages | Adds public spotter page, same cache and purge rules |
| Timeline | 14 to 18 weeks | Unchanged, profile absorbed inside ranges |

---

## 25. Final Build Decision

**GO.**

v1.3.2 is considered implementation-ready for the Validation MVP.

No additional consumer features should be added before the first beta unless a platform, legal, or security dependency requires them.

The primary remaining risk is no longer architecture.

It is behavioral:

> **Does a user care enough about a specific airframe that another person's sighting causes them to return?**

The first 90 days exist to answer that question.

If yes, invest.

If no, determine whether PlaneSpotter is becoming a different but still valuable product — such as an airport-centered spotting community or modern personal spotting platform — before expanding scope.

---

*End of PlaneSpotter v1.3.2. This document supersedes v1.3.1 and retires the separate v1.3.2 profile patch file. Scope-neutral fixes may bump to v1.3.2.x. The next material artifact should be implementation backlog, schema/migrations, and ambassador outreach — not a new feature-spec version.*
