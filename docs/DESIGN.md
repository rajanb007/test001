# PlaneSpotter, design system

| Field | Value |
|---|---|
| File role | Frozen tokens, component definitions, microcopy. Source of truth for packages/shared/tokens.ts. Rationale lives in PlaneSpotterDesignSpec-v1.0.md |
| Author | CKC |
| Version | 2.6 |
| Date | 2026-09-19 |
| Freeze | Tokens frozen under ruling D1. Hex values in section 2 supersede DesignSpec v1.0 tables 3.1 and 3.2. BuildPack v1.8 section 7.1 mirrors them. Changes require a CKC-approved revision |

## 1. Principles, in priority order

When two conflict, the earlier wins.

1. Photo first, chrome recedes. Cards, metadata, buttons stay opaque and quiet.
2. Registration is the protagonist. Larger, heavier, monospace, first thing read on any screen.
3. One hand at the fence. Primary actions in the bottom half, thumb reachable.
4. Calm expressive. Bold color on Follow, Spot, Capture only.
5. System motion only. No animation libraries.
6. Offline is a state, never a dead end.
7. Trust is visible. Pending looks pending, Archive shows Archive.

## 2. Color tokens, frozen

Every pairing below was computed with the WCAG relative luminance formula on 2026-09-18. Body text needs 4.5 to 1. Large text and non-text UI need 3 to 1. Large text means 18pt regular or 14pt bold, in this system only type.regLarge 24 bold and type.display 28 qualify. Everything else is body.

### 2.1 Dark theme, default

| Token | Hex | Change from DesignSpec v1.0 | vs bg | vs surface1 | vs surface2 | vs surface3 |
|---|---|---|---|---|---|---|
| bg | #0E1116 | none | | | | |
| surface1 | #171C23 | none | | | | |
| surface2 | #1F2630 | none | | | | |
| surface3 | #2A3340 | none | | | | |
| border | #2E3743 | none, exempt under D2 | 1.57 | 1.42 | 1.27 | |
| textPrimary | #E9ECEF | none | 15.95 | 14.44 | 12.85 | 10.76 |
| textSecondary | #A6AFBA | none | 8.52 | 7.71 | 6.87 | 5.75 |
| textTertiary | #8E98A4 | was #6E7883, failed 4.21, 3.81, 3.39, 2.84 | 6.46 | 5.85 | 5.21 | 4.36 |
| accent | #E6A23C | none | 8.64 | 7.82 | 6.96 | 5.83 |
| accentPressed | #C98A2E | none | | | | |
| success | #57C785 | none | 8.93 | 8.08 | 7.19 | 6.02 |
| warning | #E0B34C | none | 9.66 | 8.74 | 7.78 | 6.51 |
| error | #EE8580 | was #E5716B, failed 4.20 on surface3 | 6.86 | 6.22 | 5.54 | 5.04 |
| info | #6BA6E8 | none | 7.42 | 6.72 | 5.98 | 5.01 |

Note on textTertiary at surface3, 4.36. surface3 is dialogs only. Do not place tertiary body text in dialogs. Use textSecondary there.

Primary button, accent fill with text #0E1116, ratio 8.64. Pressed, accentPressed fill with #0E1116, ratio 5.52.

### 2.2 Light theme, full parity

| Token | Hex | Change from DesignSpec v1.0 | vs bg | vs surface1 | vs surface2 |
|---|---|---|---|---|---|
| bg | #F7F8FA | none | | | |
| surface1 | #FFFFFF | none | | | |
| surface2 | #F0F2F5 | none | | | |
| surface3 | #FFFFFF plus shadow | none | | | |
| border | #DDE2E8 | none, exempt under D2 | 1.23 | 1.30 | 1.16 |
| textPrimary | #1B2129 | none | 15.25 | 16.20 | 14.45 |
| textSecondary | #4E5866 | none | 6.79 | 7.21 | 6.43 |
| textTertiary | #667080 | was #7A8494, failed 3.56, 3.78, 3.37 | 4.71 | 5.01 | 4.46 |
| accent | #8F5A0E | was #B5761A, failed 3.55, 3.77, 3.36 as text | 5.43 | 5.77 | 5.15 |
| accentPressed | #7A4C0B | was #9A6110 | | | |
| success | #1B7A47 | was #1F8A50, failed 3.89 on surface2 | 5.04 | 5.36 | 4.77 |
| warning | #7F5F0F | was #9A7514, failed 3.80 to 4.26 | 5.57 | 5.92 | 5.28 |
| error | #B83E37 | was #C2453E, failed 4.44 on surface2 | 5.22 | 5.55 | 4.95 |
| info | #2D6FBD | none | 4.80 | 5.10 | 4.54 |

Note on textTertiary at surface2, 4.46. Marginal. Inputs and chips sit on surface2. Do not use tertiary text inside inputs or chips in light theme, use textSecondary.

Primary button in light theme, accent fill #8F5A0E with white text #FFFFFF, ratio 5.77. Pressed #7A4C0B with white, 7.33. The v1.0 spec said dark text on accent fill, that pairing was 4.30 and fails. Light theme buttons use white label text. Dark theme buttons use #0E1116 label text. Encoded as the semantic token buttonLabelOnAccent per theme, added under D1.

### 2.3 Ruling D2, borders

Hairline borders are decorative separators and exempt from the 3 to 1 non-text contrast rule under WCAG 1.4.11. Condition, no component may rely on the border as its only affordance. Inputs carry a surface2 fill, cards carry a surface1 fill, chips carry surface2. Focus rings and error states use accent or error color which pass. Any new component that uses border alone to define its boundary is a D2 violation.

### 2.4 tokens.ts

```ts
export const dark = {
  bg: '#0E1116', surface1: '#171C23', surface2: '#1F2630', surface3: '#2A3340',
  border: '#2E3743',
  textPrimary: '#E9ECEF', textSecondary: '#A6AFBA', textTertiary: '#8E98A4',
  accent: '#E6A23C', accentPressed: '#C98A2E', buttonLabelOnAccent: '#0E1116',
  success: '#57C785', warning: '#E0B34C', error: '#EE8580', info: '#6BA6E8',
};
export const light = {
  bg: '#F7F8FA', surface1: '#FFFFFF', surface2: '#F0F2F5', surface3: '#FFFFFF',
  border: '#DDE2E8',
  textPrimary: '#1B2129', textSecondary: '#4E5866', textTertiary: '#667080',
  accent: '#8F5A0E', accentPressed: '#7A4C0B', buttonLabelOnAccent: '#FFFFFF',
  success: '#1B7A47', warning: '#7F5F0F', error: '#B83E37', info: '#2D6FBD',
};
export const type = {
  display: { size: 28, weight: '700' }, title: { size: 22, weight: '600' },
  reg: { size: 17, weight: '700', mono: true },
  regLarge: { size: 24, weight: '700', mono: true },
  headline: { size: 17, weight: '600' }, body: { size: 15, weight: '400' },
  caption: { size: 13, weight: '400' }, micro: { size: 11, weight: '500' },
};
export const space = [4, 8, 12, 16, 24, 32];
export const radius = { card: 16, sheet: 20, button: 12, chip: 8 };
export const minTarget = 44;
```

## 3. Typography

System fonts only. SF Pro on iOS, Roboto on Android. Registrations use SF Mono and Roboto Mono, uppercase everywhere including inside sentences.

| Token | Size, weight | Use |
|---|---|---|
| display | 28 bold | Screen titles |
| title | 22 semibold | Section headers |
| reg | 17 mono bold | Registration everywhere except Passport header |
| regLarge | 24 mono bold | Passport header |
| headline | 17 semibold | Card emphasis, button labels |
| body | 15 regular | Body, captions |
| caption | 13 regular | Metadata rows, timestamps |
| micro | 11 medium | Badges, chips, queue states |

All sizes scale with system text settings. Layouts must survive XL and 200 percent. Body text never below 15 in the capture flow.

## 4. Spacing, radius, elevation, targets

- 8pt grid, tokens 4, 8, 12, 16, 24, 32.
- Radius, card 16, sheet top 20, button 12, chip 8, avatar and capture button round.
- Dark elevation is surface lightness plus 1px border. Light theme uses two shadow levels.
- Tap targets 44 logical points minimum, hitSlop where visual is smaller. 8 spacing between adjacent targets.

## 5. Components

Every component consumes tokens. Raw hex in a feature component is a build failure.

| Component | Anatomy and rules |
|---|---|
| SightingCard | Image full width, feed derivative only, aspect between 16 to 9 and 4 to 5, height flexes, no letterbox, no overlays. Metadata strip on surface1, RegistrationChip left in accent, type and operator in textSecondary caption. Second row airport code and date in textTertiary caption, avatar 24 plus name right. Action row, SpotButton left, share right. Every navigational element has a 44 target. Own pending cards show a warning ribbon across the strip. Backfill shows ArchiveBadge beside date |
| RegistrationChip | type.reg on surface2, radius 8, horizontal padding 12. Opens Passport. Identical everywhere |
| Button Primary | accent fill, buttonLabelOnAccent text, radius 12, height 48. Follow, Publish, capture confirm |
| Button Secondary | surface2 fill, border, textPrimary |
| Button Ghost | no fill, accent text |
| Button Destructive | error text, ghost or filled by severity |
| Button states | Pressed darkens one step. Disabled 40 percent opacity. No spinner inside. Async work disables the button and the surface shows progress |
| SpotButton | Default outline glyph plus count in textSecondary. Spotted, filled glyph and count in accent. Platform press opacity only. Optimistic count, server reconcile |
| FollowButton | Follow is Primary. Following is Secondary with check. First deliberate airframe follow after onboarding with undetermined permission opens the value-moment sheet. Follow is created regardless of outcome |
| Input | surface2, radius 12, height 48, label above in caption. Registration input mono, auto-uppercase, suggestion list beneath, each row 48, registration mono left, type and operator right. Error state, error border plus helper text that explains the fix |
| TrustBadge | Check glyph plus Verified in success. Verified tier only. No scores |
| QueueStateBadge | See section 6 |
| Skeleton | surface2 blocks, system shimmer, card shape. Feeds and Passports on first load. Never a full-screen spinner |
| EmptyState | Centered glyph, one title, one body, optional primary action. Copy in section 7 |
| MapPin | accent dot, mono registration on tap. Cluster accent circle with count. Dark Mapbox style matching bg |
| SaveConfirmation | Shown only after durable media copy plus SQLite commit. Title, Saved on this device. Online body, Uploading now. You can keep spotting. Offline body, We'll upload it next time you open the app while connected. Action, View queue. Never promises background upload |
| ArchiveBadge | Archive beside date on cards and detail. Detail explains archive builds history and is not a native contribution |
| VerificationState | Airframe labels by resolution_source and stub status. faa matched, no label. opensky, Details from community data. user_stub pending, Aircraft details being verified. conflicted, Aircraft identity needs review. Unidentified is never an airframe label, it is a submission state in the queue |
| IdentificationHelp | On an awaiting_identification submission in the owner's queue. Copy, Not sure of the registration? Add it when you know it, or leave it and a verified spotter may propose one. Never says published |
| ThemedText | The only text primitive. Variant typing refuses tertiary tone on surface3 in dark and on surface2 in light at compile time. D1 exceptions encoded, not documented |
| PassportHistoryStrip | Above the fold on every Passport, directly under the hero. Three most recent sightings by distinct contributors, thumbnail, contributor name, date. One-sighting Passports show the thin-passport copy here. Follow sits directly under the strip, before stats. Compression order when space runs out, registration, Follow, strip, hero, stats. At 150 percent text the hero goes 16 to 9 and stats drop below the fold. At 200 percent the strip becomes a vertical list of three rows, thumbnail left, name and date right as visible text, hero drops to 16 to 9 and may sit partly below the fold. Nothing is demoted to accessibility labels only. Registration and Follow never leave the first viewport |
| InlineEducation | One-time dismissible line beside first Spot, Spot means you appreciate this sighting. Never blocking |

## 6. Queue state labels

| State | Badge color | Label | Action |
|---|---|---|---|
| local saved | info | Saved on this device | none |
| local uploading, received | info | Uploading | none |
| processing | info | Processing photo | none |
| local retry_wait | warning | Waiting for connection | Retry now |
| awaiting_identification | warning | Needs a registration | Add registration |
| awaiting_review | warning | In review | View |
| quarantined | warning | Aircraft identity needs review | none |
| local failed | error | Couldn't upload | Retry, human-readable reason |
| published | success | Published | View Passport |
| rejected | error | Not published | View reason, edit and resubmit, up to 3 times, then Contact support |
| cancelled | textTertiary | Cancelled | Remove |

Server states are submission_state from SPEC.md section 3.3. Local states exist only in SQLite before the server has the row.

Queue header line, Everything saved on this device stays here until it uploads or you remove it. Uploads continue when the app is open.

## 7. Microcopy

Voice, plain, specific, spotter-literate, zero hype. No exclamation marks. Sentence case, buttons included. Numbers as numerals. Dates as 12 Mar 2026. Under 90 characters per toast or banner. Never blame the user.

Terminology

| Use | Never |
|---|---|
| Sighting | Post, upload as noun |
| Spot | Like, upvote |
| Follow | Subscribe, track |
| Aircraft Passport | Profile for aircraft |
| Registration | Airframe in UI, tail number in UI |
| Archive | Imported, legacy |

Permission value-moment sheet, shown once at the first deliberate airframe follow after onboarding is complete while permission undetermined, onboarding follows never trigger it, rule 7.2.10, app sheet first, system prompt only after affirmative. An explicit Turn on alerts action in Alerts or Settings can reopen this sheet while permission is undetermined. Denied permission opens system Settings through Fix in Settings.
- Title, Get notified when {REG} is spotted again?
- Body, One alert per aircraft per day at most. That is the whole point of following.
- Primary, Notify me
- Secondary, Not now

First contribution explainer, once at first publish. Your first few sightings get a short review before they publish. After that, they publish without waiting for review.

Empty states

| Surface | Title | Body, action |
|---|---|---|
| Home Following | Your feed is empty | Follow aircraft and airports to build it. Button, Find things to follow |
| Search no results | No sightings of {REG} yet | Be the first. Button, Add a sighting |
| Alerts, none | No alerts yet | Follow an aircraft and we will tell you when it is spotted again. Button, Explore aircraft |
| Alerts, no follows | No alerts yet | Same as above. Shown only when the user has zero follows of any kind, onboarding follows count |
| Alerts, airframe follows but permission undetermined | Alerts are off | You follow {n} aircraft. Turn on alerts to hear when they are spotted again. Button, Turn on alerts, opens the value-moment sheet with the count |
| Alerts, airport follows only | Follow an aircraft for alerts | Airport follows build your feed. Follow an individual aircraft to hear when it is spotted again. Button, Explore aircraft |
| Alerts, review outcome | Inbox row, {REG} published or {REG} not published with reason | Tap opens Passport or the queue item. Never a push |
| Alerts, permission denied | Alerts are off | Turn on notifications to hear when your aircraft are spotted. Link, Fix in Settings, opens system Settings |
| Alerts, delivery failure | Alerts paused | We could not reach this device. Link, Fix in Settings. Same status |
| Passport thin | Spotted once so far | Every history starts with one sighting. Button, Follow {REG} |
| Queue | All caught up | Everything you have published is on its way or live |

Errors and status

| Situation | Copy |
|---|---|
| Feed load failure | Could not load new sightings. Tap to retry. |
| Publish queued offline | Saved. We'll upload it next time you open the app while connected. |
| Upload failed, retryable | Upload paused. Your sighting is safe on this device. We'll retry when you open the app. |
| Duplicate warning | This looks very similar to a sighting already published. Publish anyway? |
| Rejection notice | Your sighting of {REG} was not published. Reason, {reason}. You can edit and resubmit. |
| Resubmit limit | This sighting has been resubmitted 3 times. Contact support if you think the review is wrong. |
| Caption hidden | Caption hidden while this aircraft's privacy settings are reviewed. |
| Processing failed | We couldn't process this photo. Try exporting it again at a smaller size. |
| Registration unreadable | Not sure of the registration? Save it now. It stays in your queue as Needs a registration until you or a verified spotter adds one. |
| Quarantined | This registration has a history we need to check. A moderator will confirm which aircraft this is. |
| Offline banner | Offline, showing saved sightings |
| Report confirmation | Thanks, our team will review. |
| Block confirmation | Blocks hide their content from you. |

Public web alt text pattern, {REG}, {type}, at {airport ICAO}. Never includes suppressed location.

## 8. Share card

Two renders per sighting, server side.

| Asset | Size | Use |
|---|---|---|
| Portrait | 1080 x 1350 | Instagram feed, general |
| Link preview | 1200 x 630 | Open Graph |

Portrait layout. Full-bleed photo. Bottom third dark gradient scrim. On scrim, registration large mono, type and operator one line, airport code and date where privacy permits. Bottom row, by {display name} left, wordmark plus short link right. Scrim opacity fixed so white text always passes 4.5 to 1 over any photo. No QR. Suppressed sightings omit airport and date. Wordmark pending name decision.

## 9. Performance budgets, release gates

| Area | Budget |
|---|---|
| Warm app to usable Home | p75 at most 1.5 s |
| Cold app to usable shell | p75 at most 3.0 s |
| Cached feed redisplay | p75 at most 500 ms |
| Passport cached shell | p75 at most 750 ms |
| Feed scroll | No sustained visible jank at 30 plus cards |
| Image delivery | Feed derivative only, network-log verified |
| Crash-free sessions | At least 99.5 percent in beta |
| Upload recovery | Exactly one sighting after retry, restart, expired session |

## 10. Accessibility gate

Ship gate for beta, verified per screen before Phase 3 exit.

| Check | Rule |
|---|---|
| Touch targets | 44 minimum everywhere |
| Text contrast | Section 2, verified |
| Non-text contrast | 3 to 1 for icons, badges, focus rings. Hairlines exempt under D2 |
| Screen readers | Every interactive element labeled. VoiceOver and TalkBack |
| Dynamic type | Layouts survive XL, no clipped registrations |
| Motion | Reduce Motion honored by design |
| Transparency | Only system tab bar is transparent |
| Gestures | Every swipe has a tap alternative |
| Orientation | Portrait app, landscape in image viewer only, documented deviation |
| Web feeds | ARIA feed role |
| Pre-beta | One founder pass of all P0 screens against Nielsen's ten heuristics |

## 11. Sunlight protocol

Field test at an airport fence in direct daylight at maximum brightness once per phase. Capture flow and upload queue are pass-fail. Capture flow controls use textPrimary only, no tertiary. If dark fails glare, raise contrast in dark, do not force light.

## 12. Iconography and platform

Lucide, filled variants for active tabs. Tab icons always labeled. Tab bar delegated to Expo NativeTabs if the Phase S spike passes, otherwise JS tabs with an opaque bar. No glass-styled header buttons anywhere, sidesteps the iOS 26 dark mode flicker.
