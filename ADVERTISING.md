# Advertising configuration and release

## What this release changes

- Centralizes eligibility in `app/lib/adPolicy.ts`; adds `/live` and `/faq` to existing public content coverage. Explicit story paths keep missing/unknown story URLs ad-free.
- Keeps Auto ads and publisher `ca-pub-7197347169057891` intact.
- Adds a document boundary around the app. Links crossing between eligible public content and protected pages use document navigation. Programmatic navigation and history transitions also reload across that boundary, withholding destination content until the new document. Removing a script component alone cannot unload third-party code.
- Adds one optional, responsive manual placement after the homepage forecast, after each story article, and before the footer of eligible PublicChrome pages. Each unit is requested once per page mount, after it has a width; weather refreshes do not refresh advertisements. Controls are separated from placements and space is reserved to reduce movement.
- All invitation presentations (including Clean Event, Event Plus and legacy), announcement messages/replies, event management, RSVP, checkout, legal, contact and unknown pages remain outside AdSense. This protects paid event presentations too; it does not invent an account-wide ad-free subscription.
- Does not change templates, sharing, RSVP, prices, checkout, email or weather logic.

## Account steps

Auto ads does not require a manual ad-unit ID. Existing account settings can serve automatically after Google approves the site; this release cannot approve the account or guarantee fill/revenue.

For deliberate display placements: in AdSense, open Ads → By ad unit → Display ads, create a responsive display unit, then obtain its numeric `data-ad-slot` value. Set `NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT` to that real value in the frontend build environment and rebuild. Never use the publisher ID as the slot ID. Without a valid numeric slot, the manual component renders nothing (no blank box); Auto ads remains enabled.

Use the Auto ads preview to inspect phone and desktop placements, ad load and excluded areas. Keep ads away from planner inputs and navigation. Settings are account-side and have not been changed by this code release.

Google's private-communications rule is relevant to Family Weather's private announcements and replies. Do not enable AdSense on those screens just because the URL is shareable. A separate public, reviewable event-discovery feature would need its own content and advertising review; this release does not make private events public.

References:
- https://support.google.com/adsense/answer/1346295?hl=en
- https://support.google.com/adsense/answer/9261307?hl=en
- https://support.google.com/adsense/answer/9274019?hl=en

## Verification

Run `npm run test:ads`, `npm test`, and `npm run build`.

Before production release, verify public → protected → back navigation, direct guest links, paid presentation, clipboard/native sharing, and RSVP. Browser ad tests must intercept Google's ad script with a local stub to avoid generating live impressions. A successful local test proves loading/placement behavior, not Google approval or delivery.

Deployment requires the owner's approval. No backend installation or database migration is needed for this release.

### Local results (2026-10-23)

- 52 distinct automated tests passed: 25 backend, 24 weather-decision, 3 advertising-policy tests.
- Targeted ESLint and clean production build passed. The first build encountered a corrupt existing Turbopack cache; moving that generated cache aside resolved it.
- Local production HTTP checks: homepage, live desk and FAQ returned 200 with the loader; privacy, announcement reader, invitation reader and events returned 200 without it. An unknown story returned 404. No manual placeholder boxes appeared without a slot ID.
- Browser navigation and visual/mobile checks remain outstanding: both Chromium and headless-shell downloads returned truncated archives in this workspace. No real-device or live ad delivery test is claimed. No Google settings, live payments or production deployment were changed.
