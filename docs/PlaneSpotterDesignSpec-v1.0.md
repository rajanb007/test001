# PlaneSpotter Design Specification

| Field | Value |
|---|---|
| Document type | UI, UX, and usability specification for the Validation MVP design phase |
| Author | CKC |
| Version | 1.0 |
| Date | 2026-08-30 |
| Companion document | PlaneSpotterMVP-v1.3.2.md, this document changes no product scope |
| Platforms | iOS and Android (React Native + Expo), public web (Next.js), internal admin console |
| Status | Draft for design phase, tokens and screen specs feed directly into build Phases 1 to 3 |

Rule for this document. Where a conflict appears between this design spec and PlaneSpotterMVP-v1.3.2, the MVP spec wins on scope and behavior, this spec wins on visual and interaction detail.

---

## 1. Design Principles

Seven principles govern every screen. When two principles conflict, the earlier one wins.

### 1.1 Photo first, chrome recedes

The photograph is the product. Navigation and controls float above content and never compete with it. This matches the direction of both 2025 platform redesigns, Apple explicitly reserves its Liquid Glass material for the navigation layer floating above app content. Cards, metadata, and buttons stay opaque and quiet.

### 1.2 Registration is the protagonist

On every surface the registration is the visually dominant metadata element. Larger, heavier, monospaced. A user scanning any screen should read the registration before anything else. This is the product thesis expressed typographically.

### 1.3 One hand at the fence

The primary user stands outdoors holding a camera. All primary actions live in the bottom half of the screen, reachable by thumb. Destructive or rare actions may live at the top. No primary action requires two hands.

### 1.4 Calm expressive

Google's research on Material 3 Expressive found that expressive tactics helped users locate key elements up to 4x faster, and also that a strong minority of users prefer calmer versions, with the explicit guidance that no amount of emotion compensates for a lack of clarity. PlaneSpotter takes the calm end of expressive. Bold shape and color on a few key moments, Follow, Spot, the capture button, restraint everywhere else.

### 1.5 System motion only

No custom animation in the MVP. Platform-native transitions, system tab bar behavior, and default list motion cover the need. This respects reduce-motion settings for free and saves build time.

### 1.6 Offline is a state, never a dead end

Every screen has a defined offline behavior. Capture works fully offline. The queue is always inspectable. The user is never blocked from the action they came to perform, at worst the action is deferred visibly.

### 1.7 Trust is visible

Moderation states, review status, provenance, and archive markers are shown honestly rather than hidden. A pending sighting looks pending. A backfilled photo carries its archive marker. The community trusts what it can see.

---

## 2. Platform Strategy

### 2.1 One codebase, two native faces at the navigation layer

| Layer | Approach |
|---|---|
| Tab bar and top-level navigation | Expo Router NativeTabs, the OS renders the system tab bar |
| iOS 26+ | Tabs render in Liquid Glass automatically |
| iOS 18 and earlier | Traditional iOS tab bar automatically |
| Android | Material 3 tab styling automatically |
| Content surfaces (cards, screens, sheets) | One shared custom design system defined in this document |

Rationale. Delegating the tab bar to the OS buys both 2025 design languages with zero platform conditionals and inherits future OS design updates for free.

### 2.2 Known risks of this choice

1. NativeTabs is alpha in Expo SDK 54+, the API is subject to change.
2. A known iOS 26 dark mode issue causes glass-styled header buttons to flicker when switching tabs.

Mitigation. Re-verify NativeTabs status at build kickoff. Fallback path is the standard JavaScript tabs component with a plain dark bar, one file change in Expo Router. Do not use glass-styled header buttons, headers in this design are plain surfaces, which sidesteps the flicker issue entirely.

### 2.3 Where glass is not used

Nowhere except the system tab bar. No glass cards, no glass sheets, no third-party glass component libraries. Apple's own guidance keeps the material at the navigation layer, and every added glass surface costs contrast and legibility on top of photographs.

### 2.4 System respect checklist

The app must honor these OS settings without custom work being broken by them.

- Reduce Motion (satisfied by principle 1.5).
- Reduce Transparency (NativeTabs handles the tab bar, nothing else is transparent).
- Dynamic Type and Android font scale, layouts must survive at least the XL text size.
- System dark and light appearance when the user selects Follow System in settings.

### 2.5 Iconography

One cross-platform icon set for the MVP, Lucide, filled variants for active tab states. Tab icons always carry text labels, icons alone fail recognition and accessibility guidance. Registration and data glyphs never replace text.

---

## 3. Design Tokens

Tokens are the single source of truth. Components reference tokens, never raw values. Dark is the default theme.

### 3.1 Color, dark theme

Pure black is deliberately avoided. Very high contrast white-on-black is harsh, and pure black backgrounds cause visible smearing during motion on OLED displays, while a dark gray in the #121212 class keeps effectively all of the OLED battery benefit.

| Token | Value | Use |
|---|---|---|
| color.bg | #0E1116 | App background |
| color.surface1 | #171C23 | Cards, sheets |
| color.surface2 | #1F2630 | Raised elements, chips, inputs |
| color.surface3 | #2A3340 | Highest elevation, dialogs |
| color.border | #2E3743 | Hairline separators, card borders |
| color.text.primary | #E9ECEF | Primary text, off-white, never pure white |
| color.text.secondary | #A6AFBA | Secondary metadata |
| color.text.tertiary | #6E7883 | Timestamps, captions, hints |
| color.accent | #E6A23C | Beacon Amber. Follow, Spot active, capture button, links |
| color.accent.pressed | #C98A2E | Pressed accent |
| color.success | #57C785 | Published, verified, success toasts |
| color.warning | #E0B34C | Pending, retry-wait, duplicate warning |
| color.error | #E5716B | Failed, rejected, destructive |
| color.info | #6BA6E8 | Informational banners |

### 3.2 Color, light theme

| Token | Value |
|---|---|
| color.bg | #F7F8FA |
| color.surface1 | #FFFFFF |
| color.surface2 | #F0F2F5 |
| color.surface3 | #FFFFFF with shadow |
| color.border | #DDE2E8 |
| color.text.primary | #1B2129 |
| color.text.secondary | #4E5866 |
| color.text.tertiary | #7A8494 |
| color.accent | #B5761A |
| color.success | #1F8A50 |
| color.warning | #9A7514 |
| color.error | #C2453E |
| color.info | #2D6FBD |

### 3.3 Contrast requirement on all tokens

Every text and background pairing used in components must meet WCAG 4.5:1 for body text and 3:1 for large text and non-text UI components. The hex values above are design intent, each pairing must be run through a contrast checker before the token file freezes, and any failing value is adjusted, the requirement wins over the aesthetic.

### 3.4 Typography

System fonts only, no font licensing or loading cost. SF Pro on iOS, Roboto on Android. Registrations use the platform monospace, SF Mono and Roboto Mono, which gives tabular alignment and a quiet aviation-instrument feel that is ownable without a custom font.

| Token | Size / weight | Use |
|---|---|---|
| type.display | 28 bold | Screen titles, passport registration header |
| type.title | 22 semibold | Section headers |
| type.reg | 17 mono bold | Registration everywhere except passport header |
| type.reg.large | 24 mono bold | Passport header registration |
| type.headline | 17 semibold | Card emphasis, button labels |
| type.body | 15 regular | Body text, captions |
| type.caption | 13 regular | Metadata rows, timestamps |
| type.micro | 11 medium | Badges, chips, queue states |

All sizes are base values and must scale with system text settings.

### 3.5 Spacing, radius, elevation

- Spacing on an 8pt grid, tokens 4, 8, 12, 16, 24, 32.
- Radius, card 16, sheet top 20, button 12, chip 8, avatar and capture button fully round.
- Elevation in dark theme is expressed by surface lightness plus a 1px border token, not shadows, shadows are nearly invisible on dark backgrounds. Light theme uses two shadow levels.

### 3.6 Tap targets

Minimum interactive target 44x44pt on iOS and 48x48dp on Android, implemented as a single 44 logical-point minimum plus hitSlop where the visual element is smaller. This exceeds the WCAG 2.2 legal minimum of 24x24 and matches the platform recommendations of 44pt for Apple and 48dp for Material. Adjacent targets keep at least 8 of spacing.

---

## 4. Component Library

Each component lists anatomy, states, and rules. All components consume tokens from section 3.

### 4.1 SightingCard

The core unit of the product.

Anatomy, top to bottom.

1. Image, full card width, feed derivative only, aspect ratio preserved between 16:9 and 4:5, letterboxing never applied, the card height flexes.
2. Metadata strip on surface1, one row, registration chip left in type.reg accent color, then type and operator in text.secondary caption, truncating.
3. Second row, airport code and date in text.tertiary caption left, photographer avatar 24 plus display name right.
4. Action row, Spot button left with count, share icon right.

Rules.

- Registration chip, photographer name, airport code, and type are all tappable navigation, each with a full-height 44 target.
- Own cards in pending review show a warning-color status ribbon across the metadata strip.
- Backfilled sightings show a small Archive tag in text.tertiary beside the date.
- Image area never hosts overlaid controls in the feed.

### 4.2 RegistrationChip

Mono type.reg on surface2, radius 8, horizontal padding 12. Tap opens the Aircraft Passport. This chip is the most repeated interactive element in the app and must be visually identical everywhere.

### 4.3 Buttons

| Variant | Style | Use |
|---|---|---|
| Primary | Accent fill, dark text, radius 12, height 48 | Follow, Publish, capture confirm |
| Secondary | Surface2 fill, border, text.primary | Neutral actions |
| Ghost | No fill, accent text | Inline low-weight actions |
| Destructive | Error text, ghost or filled by severity | Delete, block, cancel upload |

Pressed state darkens fill one step. Disabled state drops to 40 percent opacity. No loading spinners inside buttons, a button triggering async work goes disabled and the surface shows progress.

### 4.4 SpotButton

States.

1. Default, outline glyph plus count in text.secondary.
2. Spotted, filled glyph in accent, count in accent.
3. Press feedback is the platform default opacity change, no custom burst animation.

One tap toggles. The count updates optimistically and reconciles with the server.

### 4.5 FollowButton

States, Follow (primary variant), Following (secondary variant with check). Tapping Follow on an airframe triggers the notification value-moment sheet defined in section 9.4 when permission is undetermined. The button never blocks on the permission outcome, the follow is created regardless.

### 4.6 Inputs

- Text input on surface2, radius 12, height 48, label above in caption.
- Registration input uses mono type, auto-uppercase, and renders the autocomplete suggestion list directly beneath, each suggestion a 48 row with registration mono left and type plus operator right.
- Error state, border and helper text in error color, helper text explains the fix, not just the failure.

### 4.7 TrustBadge

A small check glyph plus the word Verified in success color, shown only for the Verified trust tier, on profiles and beside photographer names on the sighting detail. No score numbers anywhere in the MVP.

### 4.8 QueueStateBadge

Maps section 6.5 queue states of the MVP spec to visual states.

| Queue states | Badge |
|---|---|
| queued, preparing, creating_sighting, uploading_media, processing | Info color, animated only by the system activity indicator |
| pending_review | Warning color, label In review |
| published | Success color |
| retry_wait | Warning color, label Waiting for connection |
| failed | Error color, label Failed, with Retry action |
| cancelled | Tertiary text |

### 4.9 Skeleton and EmptyState

- Skeleton, surface2 blocks with a subtle system shimmer, card-shaped, image block plus two text lines. Used in feeds and passports during first load.
- EmptyState, centered glyph, one title line, one body line, one optional primary action. Copy comes from section 9.

### 4.10 MapPin and cluster

Accent dot pin with a mono registration label on tap. Clusters are accent circles with a count. Map styles use a dark Mapbox style matching color.bg in dark theme.

---

## 5. Navigation and Information Architecture

### 5.1 Tab structure, five tabs

| Position | Tab | Content |
|---|---|---|
| 1 | Home | Feed, segmented All and Following |
| 2 | Search | Typed search across registrations, airports, spotters |
| 3 | Capture | The contribution flow, visually prominent center action |
| 4 | Alerts | Followed-airframe alert list |
| 5 | Profile | Own contributor profile and settings entry |

Android native bottom tabs support at most five tabs, this structure sits exactly at the limit. The Capture tab renders as a raised accent circle where the platform allows, otherwise as a standard tab with accent tint.

### 5.2 Stack behavior

Passport, sighting detail, airport page, and other-user profiles push onto the current tab stack from anywhere. Android hardware back pops the stack, then returns to Home, then exits. Scroll position on Home is preserved across pushes, losing feed position is a known infinite-scroll failure and is treated as a bug.

### 5.3 Deep links

App links mirror public web routes one to one.

```text
/s/[sighting-id]        sighting detail
/aircraft/[registration] aircraft passport
/airport/[icao]          airport page
/spotter/[handle]        contributor profile
```

Push notifications open the sighting detail directly, not the alert list.

---

## 6. Screen Specifications, all P0 screens

Format per screen, purpose, layout, primary action, states. All screens inherit section 8 state patterns and section 12 accessibility rules.

### 6.1 Home feed

- Purpose, return surface, the daily scan.
- Layout, segmented control All and Following at top on the scrolling surface, then SightingCard list, FlashList, infinite scroll. Infinite scroll is the correct pattern here per usability research, it suits long homogeneous browsing lists, while goal-directed lists get load-more, applied in Search.
- Pull to refresh. When new content exists after a background return, a small New sightings pill appears at top, tapping scrolls to top, the feed never yanks position by itself.
- Primary action, browse and tap into cards.
- States, first-run empty shows hub content in All plus a follow prompt, offline shows cached cards plus a passive offline banner.

### 6.2 Sighting detail

- Purpose, view one sighting fully, the alert landing surface.
- Layout, image at top, tap for full-screen zoom viewer, landscape allowed in the viewer. Below, registration chip large, type and operator, airport and date, photographer row with avatar, name, TrustBadge, all tappable. Safe EXIF subset in a collapsible row. Compact static privacy-safe map when location is displayable. Spot and share in a bottom action bar within thumb reach. Overflow menu holds Report and, on own sightings, Delete.
- Previous and next navigation by horizontal swipe plus visible edge tap zones, gesture-only navigation is not acceptable.
- States, suppressed location renders no map and no airport where policy requires, pending own sighting shows the review ribbon.

### 6.3 Aircraft Passport

- Purpose, the product thesis on one screen, must make Follow irresistible.
- Layout, hero image top with a bottom scrim, registration in type.reg.large on the scrim, type and operator beneath. Directly below the hero, the Follow button full width, primary variant, this is the most important button in the app. Stats row, sightings, contributors, first seen, airports. Then segmented Timeline and Map. Timeline is the standard feed lens. Map is section 6.8.
- Primary action, Follow.
- States, single-sighting passports state their thinness honestly with the section 9 copy, stub-state aircraft show Details being verified in tertiary text rather than fake data.

### 6.4 Capture and upload flow

- Purpose, publish a sighting in under a minute at the fence, fully offline-capable.
- Flow, five steps as a full-screen stepper with a persistent progress dots row and back support.
  1. Source, camera or library picker.
  2. Details, EXIF auto-fills date and time, GPS suggests nearest airport as a confirm chip. No GPS shows an airport search field plus an explicit Location unknown option.
  3. Registration, mono autocomplete input, suggestions from the master data. An I could not read it path allows publishing with registration pending, routed per MVP spec rules.
  4. Caption, optional, single field.
  5. Review, card preview exactly as it will render, duplicate warning banner here when the perceptual check fires, Publish button.
- Publish enqueues locally and returns to Home immediately with a toast, Queued, showing a queue shortcut. The user never watches an upload bar.
- All controls in the bottom half, principle 1.3 applies most strongly here.
- Sunlight rule, this flow must pass the section 13 glare test, highest contrast in the app.

### 6.5 Upload queue

- Purpose, visibility and trust in the offline contract.
- Layout, reachable from Profile and from post-publish toasts. List of pending items, thumbnail, registration, QueueStateBadge, per-item Retry and Cancel where valid. A one-line reassurance header, Nothing here is lost, uploads resume automatically.
- States map one to one to MVP spec section 6.5.

### 6.6 Search

- Purpose, goal-directed lookup, not browsing.
- Layout, search field at top, segmented Registrations, Airports, Spotters. Registration queries use mono rendering. Results are finite pages with a Load more button, deliberately not infinite scroll, goal-seeking tasks are where infinite scroll fails users.
- Empty result for a registration offers Add the first sighting, routing into Capture with the registration pre-filled.

### 6.7 Airport page

- Purpose, place-based lens.
- Layout, header with airport name, ICAO and IATA mono, country, Follow airport secondary button, then the standard feed lens filtered to the airport.

### 6.8 Airframe map

- Purpose, spatial history of one aircraft, inside the Passport.
- Layout, interactive Mapbox in the app only, dark style, pins per section 4.10, a time filter chip row, All time, This year, This month. Tapping a pin shows a mini card, tap through to the sighting.
- Suppressed sightings never appear. A quiet footnote, Some locations are hidden for privacy, appears whenever any suppression applies to this airframe.

### 6.9 Profile, own and other

- Per MVP spec section 9.5. Header, avatar 64, handle, display name, home airport, TrustBadge if Verified. Stats row, sightings, airframes, airports, member since. Then the standard feed lens filtered by user.
- Own profile adds Edit for name, avatar, and home airport, plus the Portfolio export button and the entry to Settings.
- Other profiles have no follow button and no message button, nothing implies deferred social features.
- Backfilled items carry the Archive tag.

### 6.10 Alerts

- Purpose, the alert history list, secondary to push deep links.
- Layout, rows with airframe registration mono, thumbnail of the triggering sighting, relative time. Tap opens sighting detail. Unread rows use surface2.
- Empty state sells the loop, copy in section 9.

### 6.11 Settings

- Sections, Account (email, handle, delete account), Notifications (reflects real system permission state with a Fix in Settings link when denied), Appearance (Dark default, Light, Follow system), PlaneSpotter Pro (the fake-door entry per MVP spec section 20, marked Coming later), Legal (terms, privacy, licenses), Support (contact entry), Sign out.
- Delete account states consequences plainly and requires typed confirmation.

### 6.12 Auth

- Minimal, email plus the platform sign-in options, then a handle claim step with availability feedback, then terms acceptance with version tracking per MVP spec. No profile-building pressure at signup, onboarding handles warm-up.

### 6.13 Moderation-facing states

- Own pending sightings show the review ribbon on cards and a status row on detail.
- A rejection produces an inbox-style row in Alerts with the reason template from section 9, never a silent disappearance.
- First-contribution flow shows the one-time explainer line about the first-five review, copy in section 9.

### 6.14 Report and block flows

- Report, bottom sheet with a reason list, one optional free-text line, submit, confirmation toast, Thanks, our team will review.
- Block, from a profile overflow, confirmation dialog states the effect, Blocks hide their content from you. Both flows complete in under ten seconds and never require leaving the current context.

---

## 7. Onboarding Flow

Three beats, skippable after the first, no permission requests anywhere in onboarding.

1. Premise, one screen, one line over three passport thumbnails, Every aircraft has a story. Follow the ones you care about. Continue.
2. Identity, handle claim and avatar optional, part of auth when combined.
3. Seeding, per the MVP spec collector activation order. Pick your home airport first, then a short list of locally recurring airframes with Follow buttons inline, then aircraft types, rare airframes last. A counter nudges toward five follows, Follow 5 things to make your feed yours, but Continue is never gated.

Notification permission is intentionally absent here, it is requested only at the follow value moment, section 9.4, matching the MVP spec section 10.2.

Hub-restricted beta, when eligibility applies, the gate screen appears before beat 3, states the current hubs plainly, and collects a waitlist email for others, no dark patterns.

---

## 8. States, Empty, Loading, Error, Offline

### 8.1 Loading

- Feeds and passports load with card skeletons, never full-screen spinners.
- Images load feed derivatives with a blurhash-style placeholder from the derivative pipeline, no white flashes on dark surfaces.
- FlashList receives realistic estimated item sizes per lens to prevent jump, and image dimensions from the media table drive layout before pixels arrive, no layout shift.
- These rules absorb the performance intent of the cut budgets section, on airport LTE perceived speed is the design.

### 8.2 Empty

Every empty state has a next action. The full copy set lives in section 9.6.

| Surface | Action offered |
|---|---|
| Home Following, no follows | Route to seeding picks |
| Search, no results for a registration | Add the first sighting |
| Alerts, none yet | Follow an airframe explainer |
| Passport, one sighting | Be the second spotter framing |
| Queue, empty | None needed, calm confirmation line |

### 8.3 Errors

- Inline and recoverable by default, a failed feed page shows a retry row, not a modal.
- Destructive failures never lose input, the capture flow preserves all entered data through any failure, per the MVP offline contract.
- Error copy states what happened and the next step, section 9.7.

### 8.4 Offline

- A passive one-line banner on surface2, Offline, showing saved sightings, no modal, no blocking.
- Capture is fully functional, publish becomes queue.
- Cached feed content remains browsable, actions that require the server, Spot, Follow, queue where cheap or disable with a hint where not, Follow queues, Spot disables.

---

## 9. Microcopy and UX Writing

### 9.1 Voice

Plain, specific, spotter-literate, zero hype. No exclamation marks in system copy. No aviation gatekeeping, a newcomer must never feel tested. Sentence case everywhere, buttons included.

### 9.2 Terminology table

| Term | Use | Never |
|---|---|---|
| Sighting | A published photo record | Post, upload (as noun) |
| Spot | The appreciation action, verb and button | Like, upvote |
| Follow | Airframes and airports | Subscribe, track |
| Aircraft Passport | The airframe profile surface, capitalized | Profile (for aircraft) |
| Registration | User-facing identity of an aircraft | Airframe (internal term only), tail number in UI copy |
| Archive | Backfilled historical content marker | Imported, legacy |

### 9.3 Registration display rule

Registrations render uppercase mono everywhere, including inside sentences.

### 9.4 The permission value-moment sheet, thesis-critical copy

Shown once, on the first airframe follow while permission is undetermined. App sheet first, system prompt only after an affirmative tap, this preserves the ability to re-ask later.

- Title, Get notified when {REG} is spotted again?
- Body, One alert per aircraft per day at most. That is the whole point of following.
- Primary, Notify me
- Secondary, Not now

If Not now, follows still work and Alerts shows a quiet enable row. If the system prompt is later denied, Settings shows the Fix in Settings link, and copy never nags.

### 9.5 First-contribution explainer

Shown once at first publish.

- Your first few sightings get a quick human check. After that, you publish instantly.

### 9.6 Empty-state copy set

| Surface | Title | Body / action |
|---|---|---|
| Home Following | Your feed is empty | Follow aircraft and airports to build it. Button, Find things to follow |
| Search no results | No sightings of {REG} yet | Be the first. Button, Add a sighting |
| Alerts | No alerts yet | Follow an aircraft and we will tell you when it is spotted again. Button, Explore aircraft |
| Passport thin | Spotted once so far | Every history starts with one sighting. Button, Follow {REG} |
| Queue | All caught up | Everything you have published is on its way or live. |

### 9.7 Error and status copy set

| Situation | Copy |
|---|---|
| Feed load failure | Could not load new sightings. Tap to retry. |
| Publish queued offline | Saved. Will upload when you are back online. |
| Upload failed, retryable | Upload paused. We will keep trying, your sighting is safe. |
| Duplicate warning | This looks very similar to a sighting already published. Publish anyway? |
| Rejection notice template | Your sighting of {REG} was not published. Reason, {reason}. You can edit and resubmit. |
| Registration unreadable path | Not sure of the registration? Publish anyway and the community can help identify it. |

### 9.8 Writing rules

- Numbers as numerals. Dates as 12 Mar 2026 in UI.
- Never blame the user, never say invalid without saying what valid looks like.
- One idea per string, target under 90 characters for any toast or banner.

---

## 10. Public Web and Share Card

The growth loop surface. Everything here is read-only and fast.

### 10.1 Share card, the primary marketing asset

Two fixed renders per sighting, produced by the server-side pipeline defined in the MVP spec.

| Asset | Size | Use |
|---|---|---|
| Portrait card | 1080 x 1350 | Instagram feed, general sharing |
| Link preview | 1200 x 630 | Open Graph and messaging previews |

Layout, portrait card.

1. Photograph full bleed.
2. Bottom third, dark gradient scrim.
3. On the scrim, registration in large mono, then type and operator on one line, then airport code and date where privacy permits.
4. Bottom row, photographer credit left, by {display name}, wordmark plus short link right, planespotter.app/s/{id}.

Rules. Scrim opacity fixed so the white text always passes 4.5:1 over any photograph. No QR code in MVP. Suppressed sightings render the card without airport and date. The wordmark placement and size are fixed, ambassadors' photos are the hero, branding stays small and constant.

### 10.2 Public pages, shared layout system

All public pages use the dark token set, are statically rendered where possible, and prioritize the image as the largest contentful element.

- Sighting page, image, metadata block mirroring the app detail, photographer name linking to the spotter page, a Passport link block, View the full history of {REG}, static privacy-safe map snapshot where allowed, store call to action.
- Passport page, hero, registration, stats, a grid of recent sightings, follow call to action routing to the store or app via deep link.
- Spotter page, per MVP spec 9.5, avatar, handle, stats, sighting grid, store call to action, no follow button.
- Airport page, mirror of the app lens, lighter priority.

### 10.3 Web-specific usability rules

- Public lists use pagination or Load more, never infinite scroll, footers with legal, support, and takedown links must stay reachable.
- Feed lists on web carry the ARIA feed role so screen readers can traverse and exit them.
- Web pages meet the same WCAG 2.2 AA bar as the app, EU accessibility law applies to the web surface as well.

---

## 11. Admin Console

Function over form. Desktop-only, default light theme, a stock component kit used as-is, zero custom design tokens. Design effort here is layout, not styling.

### 11.1 Layout pattern

Three panes on every adjudication surface.

1. Left, queue list with filters and counts.
2. Center, the item, image large, all metadata, machine-check flags rendered as labeled chips, duplicate matches shown side by side.
3. Right, action bar, Approve, Reject with reason picker, Escalate, plus the audit trail beneath.

### 11.2 Console rules

- Keyboard first, single-key approve and reject with confirmation on reject, the founder will clear queues daily.
- Every action writes the audit fields already defined in the MVP data model, the UI always shows who did what and when.
- Destructive actions, strikes, bans, merges, require a typed reason, no one-click bans.
- Import-conflict resolution shows both candidate airframes side by side with full source records, and the merge button is visually subordinate to Keep separate, reflecting the never-auto-merge posture of the MVP spec.

---

## 12. Accessibility Gate

Ship gate for beta, not a backlog. Verified per screen before Phase 3 exit.

| Check | Standard | Rule in this product |
|---|---|---|
| Touch targets | WCAG 2.2 SC 2.5.8 AA minimum 24px, platform 44pt and 48dp | 44 minimum everywhere, section 3.6 |
| Text contrast | 4.5:1, large text 3:1 | All token pairings checker-verified, 3.3 |
| Non-text UI contrast | 3:1 | Borders, icons, badges included |
| Screen readers | VoiceOver, TalkBack | Every interactive element labeled. Image alt pattern, {REG}, {type}, at {airport ICAO} |
| Dynamic type | Platform text scaling | Layouts survive XL, no clipped registrations |
| Motion | Reduce Motion honored | Satisfied by system-motion-only, 1.5 |
| Transparency | Reduce Transparency honored | Only the system tab bar is transparent, 2.3 |
| Gestures | Single-tap alternative for every gesture | Swipe navigation always paired with tap zones, 6.2 |
| Orientation | WCAG 1.3.4 | Portrait app with landscape supported in the image viewer. The portrait lock elsewhere is a documented pragmatic deviation, revisit post-validation, flag to the legal gate |
| Feeds on web | ARIA feed role | Section 10.3 |
| Pre-beta pass | Heuristic self-walkthrough | One founder pass of all P0 screens against Nielsen's ten heuristics before beta invite, notes filed as issues |

Legal context. The European Accessibility Act applies to mobile apps and the EU is in the launch footprint, accessibility findings route to the MVP spec section 21 gate.

---

## 13. Dark Mode Rules and the Sunlight Protocol

### 13.1 Theme rules

1. Dark is default, Light and Follow System are user choices in Settings, forcing dark on everyone is explicitly avoided.
2. No pure black surfaces, no pure white text, per section 3.1.
3. Elevation by surface lightness plus hairline borders, not shadow.
4. Accents are desaturated relative to their light-theme counterparts, saturated colors vibrate on dark backgrounds.
5. Photographs are never dimmed, filtered, or overlaid in feeds, the theme applies to chrome only.
6. Light theme is a first-class parity theme, every screen is reviewed in both before beta.

### 13.2 The sunlight protocol

Spotters use this app outdoors at midday. Dark interfaces are at their weakest in direct sun, so this is tested physically, not assumed.

1. Field test at an airport fence in direct daylight at maximum screen brightness, once per build phase.
2. The capture flow and upload queue are the pass-fail surfaces, every control must be findable and readable through glare.
3. Body text never below 15, controls in the capture flow use text.primary only, no tertiary-contrast controls anywhere in that flow.
4. If the capture flow fails the glare test in dark theme, the fix is raising contrast in dark, not forcing a light theme.

---

## 14. Design Decision Log, v1.0

| Decision | Choice | Alternative rejected |
|---|---|---|
| Navigation chrome | Expo NativeTabs, system-rendered | Hand-built glass imitation on both platforms |
| Glass usage | Tab bar only | Glass cards and sheets |
| Theme default | Dark, with Light parity and system option | Dark-only |
| Background | #0E1116 dark gray family | Pure black |
| Registration typography | Platform monospace | Custom licensed font |
| Icon set | Lucide, labeled tabs | SF Symbols plus Material split |
| Home feed | Infinite scroll with position restore | Pagination |
| Search results | Load more | Infinite scroll |
| Tabs | Home, Search, Capture, Alerts, Profile | Map as a top-level tab |
| Permission ask | Value-moment pre-prompt sheet at first follow | Onboarding permission ask |
| Motion | System only | Custom animation library |
| Admin styling | Stock kit, three-pane layout | Designed admin |
| Share card | 1080x1350 plus 1200x630 OG | Story format in MVP |

## 15. Open Design Questions

| Question | Owner | Blocking |
|---|---|---|
| App name, wordmark, icon | Founder | Share card and store assets |
| Final accent hex after contrast verification | Design | Token freeze |
| NativeTabs stability at build kickoff | Engineering | Phase 1 |
| Capture tab raised-circle treatment feasibility per platform | Engineering | Phase 1, cosmetic |
| Exact blurhash variant in derivative pipeline | Engineering | Phase 1 |
| Story-format share card demand | Founder | Post-validation |

---

## 16. References

1. Apple Newsroom, introduction of the Liquid Glass design language, WWDC 2025. https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
2. Apple Human Interface Guidelines. https://developer.apple.com/design/human-interface-guidelines/
3. Expo documentation, Native tabs. https://docs.expo.dev/router/advanced/native-tabs/
4. Expo documentation, GlassEffect availability and constraints. https://docs.expo.dev/versions/latest/sdk/glass-effect/
5. React Navigation, native bottom tabs, platform limits. https://reactnavigation.org/docs/native-bottom-tab-navigator/
6. Google Design, the research behind Material 3 Expressive. https://design.google/library/expressive-material-design-google-research
7. Google, Material 3 Expressive launch. https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/
8. W3C, WCAG 2.2 Understanding SC 2.5.8 Target Size Minimum. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
9. Nielsen Norman Group, infinite scrolling, when to use it and when to avoid it. https://www.nngroup.com/articles/infinite-scrolling-tips/
10. Dark mode surface guidance, avoiding pure black and OLED smearing. https://atmos.style/blog/dark-mode-ui-best-practices

---

*End of PlaneSpotterDesignSpec v1.0. This document feeds the visual mock stage and build Phases 1 to 3. Scope questions route to PlaneSpotterMVP-v1.3.2.*
