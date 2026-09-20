# PlaneSpotter, product requirements

| Field | Value |
|---|---|
| File role | Condensed PRD for agents. Derived from PlaneSpotterBuildPack-v1.8.md section 1 and the approved product scope. PlaneSpotterMVP-v1.3.2.md is the scope authority |
| Author | CKC |
| Version | 2.6 |
| Date | 2026-09-19 |
| Status | Derived, section 7 legal gate verified against MVP v1.3.2 section 21 on 2026-09-19. Where this file and MVP v1.3.2 differ, MVP v1.3.2 wins |

## 1. Purpose

Validate one thesis. Planespotters will contribute photos to a shared, persistent aircraft history and return to the app because other people keep adding to the same airframes.

Per-airframe photo history pages already exist, Planespotters.net publishes them. The record itself is not the claim. The claim is the loop around it, mobile capture at the fence, visible photographer credit, follow an individual airframe, one push alert when it is seen again, return to a history that other people keep extending. That no competitor ships this loop on mobile is a hypothesis, verify with a feature matrix before any external claim. The Aircraft Passport is the record, following it is the product.

## 2. Target audience

Two archetypes, detail in docs/user-profiles.md.

- Contributor. Photographs aircraft at airport fences, wants a home for the work and credit for it.
- Collector. Follows specific aircraft and wants to know when they are seen again.

Launch is hub-first, two or three airports, ambassador seeded, hub-restricted beta.

## 3. Core loop

1. Contributor captures a photo at the fence, online or offline.
2. Sighting attaches to the airframe's Passport, server-resolved, never client-invented.
3. Collector who follows that airframe receives one push alert.
4. Collector returns to the sighting and the Passport.
5. Return is measured as Airframe Triggered Return Rate, provider-accepted alert events as the denominator.

## 4. In scope, P0

| Area | Requirement |
|---|---|
| Identity | Email plus platform sign-in, handle claim, versioned terms, minimal contributor profile with avatar, handle, display name, home airport, stats, portfolio export |
| Capture | Four-step flow, source and details, registration, caption, review. EXIF prefill, nearest airport, Location unknown, unreadable registration saved as Needs a registration, duplicate warning. Fully offline, durable local queue, foreground resume, resumable upload, exactly-once submission and publish. Every capture is a submission, a sighting exists only after publish, R7 |
| Airframe | Aircraft Passport with hero, registration, stats, timeline, map. Follow as primary action. Server-side resolution at publish in three tiers per R5, by registration plus observation date against validity history, ambiguity quarantined. Stubs labeled, never authoritative. Canonical Passport URL is the airframe id, R8. Above the fold shows a history strip of recent sightings by distinct contributors |
| Feed | Home with All and Following, infinite scroll, position restore. Airport lens. User lens. Search with load more |
| Social | Spot, one-tap appreciation with count. Follow airframe and airport. No follow user |
| Alerts | One push type, followed airframe spotted, one alert event per airframe per user per 24-hour bucket, only for sightings taken within 7 days of publish, R6. Delivery per device, confirmed state is provider_accepted not delivered, R9. Value-moment permission ask at first deliberate follow after onboarding. Alerts tab with four empty states |
| Trust and safety | First five contributions of new users human reviewed, trusted tier auto-publish, every state change audited in moderation_actions that survive deletion, rejected captures editable and resubmittable up to 3 times, every reopen requires fresh review of current contents, verified users can propose a registration on unidentified captures, flags, reports, blocks, corrections by verified tier, privacy suppression for sensitive aircraft, deletion pipeline |
| Provenance | Archive label on backfilled content, excluded from all KPIs |
| Public web | Sighting, Passport, spotter, airport pages. Share card 1080x1350 and 1200x630. One dominant CTA to the Passport |
| Admin | Review queue, adjudication, import-conflict resolution with keep-separate default, trust tier management, operational failures view |
| Pro | Passive Settings row, Coming later, interest tap tracked. No paywall |
| Themes | Dark default, light parity, follow system |

## 5. Out of scope, invariant 12

Comments, follow-user, video, badges, scores, heatmaps, DMs, web upload, ranked Explore, paid tier, marketplace, realtime tracking, X and Twitter cards, story-format share card. Not scaffolded, not flagged, not built.

## 6. Success criteria

North Star, Airframe Triggered Return Rate at 24 and 72 hours, unit is the alert event, denominator provider_accepted. Opportunity metric beside it, share of activated collectors receiving at least one provider_accepted alert in 30 days.

Phase S usability, 80 percent first follow unfacilitated, 80 percent valid capture unfacilitated, median active capture under 60 seconds, 90 percent correctly state offline save status, 80 percent distinguish Archive from native, zero critical accessibility blockers.

Hub activation, 15 ambassadors recruited, 10 onboarded, 5 publishing natively.

Hub promotion, two gates. Supply, 20 active native contributors in 30 days, 100 native sightings in 30 days, 30 airframes with native sightings, 30 percent of those with two plus contributors, moderation p90 under 24 hours. Thesis, O1, opportunity rate and 72 hour return rate on complete windows with minimum event count, repeat contribution, founder hours, thresholds open.

Guardrails. Total users is never the goal. Ticket is not delivery. Archive never counts. Internal testers excluded.

## 7. Constraints

- Solo builder, 20 to 30 hrs per week, planning basis 25. Calendar 26 to 34 weeks to public launch, held until Phase S exit. Phase S stays 5 to 6 weeks. Phase 0 carries an estimated 80 to 120 hours of pressure for the publication pipeline, fencing and 15 automated gates, not yet folded into the calendar.
- Phase gated. No phase opens without the previous gates green and CKC written approval.
- Privacy enforced in the database, not the client. Location of sensitive aircraft never leaks.
- Accessibility WCAG 2.2 AA is a ship gate. EU is in the launch footprint, European Accessibility Act applies.
- Legal and store-readiness gate before public beta, MVP v1.3.2 section 21, launch gates not post-launch cleanup. Final content license, privacy policy, community and UGC policy, terms of use, support and contact surface, user reporting, user blocking, content reporting, account deletion, data export approach, copyright and takedown workflow, repeat-infringer policy, DMCA safe-harbor and designated-agent decision with counsel where applicable, source licensing and attribution obligations covering FAA and OpenSky, aircraft suppression wording. None drafted yet.
- Unit economics, MVP v1.3.2 section 17. Track cost per retained active contributor and collector, never raw MAU. Drivers, original and derivative storage, egress, database and API usage, static map generation, web bandwidth, async processing. No numbers exist yet.

## 8. Open product decisions

See CLAUDE.md section 6. Name, hub airports, kill criteria, Pro price hypothesis, O1 thesis thresholds, beta calendar.
