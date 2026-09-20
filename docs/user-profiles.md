# PlaneSpotter, user profiles

| Field | Value |
|---|---|
| File role | Archetypes, hub archetypes, usability scenarios. Keeps UI choices tied to real behavior |
| Author | CKC |
| Version | 2.6 |
| Date | 2026-09-19 |
| Status | Draft. Archetypes derive from the MVP spec and BuildPack. Pain points are founder hypotheses until the Phase S cohort confirms or kills them. Update after cohort readout |

## 1. Contributor

Who. Hobbyist photographer who goes to airport fences on purpose. Often has a DSLR archive of years of photos on a hard drive. Some phone-only, more casual.

Goals
- A permanent home for the photo attached to the aircraft it shows, not a feed post that scrolls away
- Credit by name on every surface where the photo appears
- Fast capture at the fence, under a minute, one hand, in sun
- Trust that a capture is safe when connectivity is bad

Pain points, hypothesized
- Existing sites are slow to upload or gatekeep with screener rejections
- Social feeds bury the photo in days
- No way to see the same aircraft again across everyone's photos
- Fear of losing a capture to a dropped connection

Product answers. Capture flow with durable local save, foreground resume, and SaveConfirmation. Passport as permanent home. Photographer credit on card, detail and share card. Trusted tier normally auto-publishes after five clean reviews; rejected or identity-corrected submissions still require renewed review. Concierge backfill for the DSLR archive, labeled Archive.

Design consequences. Bottom-half controls, textPrimary only in capture, sunlight protocol, no upload bar to watch, queue always inspectable.

## 2. Collector

Who. Follows specific aircraft, rare types, special liveries, a home-airport regular. May never upload. Reads more than writes.

Goals
- Know when an aircraft they care about is seen again
- One alert, not a stream
- Browse the history of an airframe across many photographers
- Find things to follow fast

Pain points, hypothesized
- Flight trackers show where an aircraft is now, not what it looked like over time
- Photo sites have no follow on an airframe
- Notification fatigue from apps that over-alert

Product answers. Follow airframe and airport. One alert type, rate-limited to one per airframe per day. Passport timeline and map. Onboarding seeds home airport then recurring airframes then types then rare.

Design consequences. Follow is the largest button in the app. Value-moment sheet states the alert limit explicitly. Alerts tab exists for beta with a demotion rule if it stays empty.

## 3. Hub archetypes

Launch is two or three hubs. Real airports not yet picked. Under R5 the first Phase S hub should be GA or domestic-heavy so tier 3 stubs stay rare during cohort testing.

| Archetype | Traffic | Registration mix | Fit |
|---|---|---|---|
| GA and business field | Light and business jets, training | Nearly all N-numbers | First hub for Phase S |
| Domestic hub | Mainline and regional carriers | Mostly N-numbers, some Canadian and Mexican, estimate only | Second |
| International gateway | Widebodies, foreign carriers | Large foreign share, not counted, estimate only | After tier 2 OpenSky resolution is live |

## 4. Phase S usability scenarios

Cohort, 5 contributor candidates plus 5 collector candidates from the ambassador pipeline. Run on the Phase S slice plus a click prototype for browse-only scenarios. Unfacilitated unless noted.

| # | Scenario | Pass condition |
|---|---|---|
| 1 | Find and follow a known registration | Follow created, 80 percent |
| 2 | Explain what happens after following | States one alert when spotted again |
| 3 | Capture with GPS | Valid sighting queued, 80 percent, median active under 60 s |
| 4 | Capture without GPS | Uses airport search or Location unknown |
| 5 | Capture with unreadable registration | Saves without a registration, reads Needs a registration correctly, does not fabricate, does not believe it published |
| 6 | Recover an interrupted upload | Correctly states the sighting is safe and that upload continues when the app is next open, not in the background, 90 percent |
| 7 | Interpret Archive, In review, Details being verified | Distinguishes Archive from native, 80 percent |
| 8 | Open a shared public page mock and identify the next action | Names Follow or open Passport |

Zero critical accessibility blockers across all scenarios.

## 5. Ambassador

Who. Contributor with local standing at a hub, recruited before launch. Seeds Passport density and recruits cohort members.

Stage 1 gate, 15 recruited, 10 onboarded, 5 publishing natively. Outreach draft not yet written, owner CKC.

## 6. Internal tester

Founder and any pre-launch helpers. Labeled in analytics, excluded from every validation metric.
