# Google Ads measurement installation

Prepared against release `ed43a1e`, not the historical `main` branch.

## Installed code

- The owner-supplied Google-only tag is `AW-951353708` and the loader is exactly `https://www.googletagmanager.com/gtm.js?id=AW-951353708`.
- Google's November 6, 2026 guide uses this format and no longer includes `gtag('config')` in its default snippet: https://developers.google.com/tag-platform/gtagjs. Older help pages describe the previous format. Do not add a second loader or config command.
- This is **base-tag installation, not completed event-creation conversion tracking**. No conversion events, fake values, customer emails, enhanced-conversion payloads or event IDs are sent by this change.
- No Google Ads account settings have been inspected or changed. Destination-side custom tags, enhanced conversions, remarketing settings and URL conversion rules still require an owner-side review before describing the account as fully verified.

## Consent and privacy boundaries

Google Ads requests are blocked until the visitor explicitly allows measurement. There is an equally accessible decline choice and a persistent control on public pages and `/privacy`; choices expire in 180 days. Missing, invalid, expired or unavailable storage denies measurement. Global Privacy Control also denies it. On revocation the consent update is queued and the page reloads, because removing the script node alone would not stop already-running code. Other tabs observe changes to the stored choice.

The implementation grants ad measurement storage and ad user-data consent only after that choice, keeps ad personalization and analytics storage denied, and disables Google signals/personalization and URL passthrough in the in-page settings. Consent mode documentation: https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic.

Only explicitly listed public routes qualify. Event creation, event management, invitations, RSVP, announcements, family access, legal and unknown routes do not load the tag. URLs containing planner details, unknown query parameters or fragments also do not load it. Only bounded Google click-identification parameters are allowed. Returning from a private same-origin referrer is excluded. Explicit page/referrer parameters are sanitized, and the loader suppresses its HTTP referrer. Production hostname checks prevent localhost and preview traffic from contacting Google Ads.

Full-document navigation at public/private boundaries prevents loaded advertising scripts from carrying into private routes. When the tag has loaded, internal links use full navigation. The homepage planner form also uses full navigation because its query contains visitor-entered planning details.

This is not a general-purpose or Google-certified CMP and is not a claim of jurisdiction-wide legal compliance. It does not retroactively govern the existing AdSense script; the UI and privacy disclosure say the choice is specific to Google Ads measurement. Review AdSense consent separately if required. Do not infer that a disabled personalized-ad signal verifies all destination-side account configuration.

## Completing meaningful conversions later

The existing successful creation path is `app/create-event/CreateEventFlow.tsx` after a successful authenticated POST to `/api/events` that returns `data.ok` and a nonempty event ID. The backend proxy separately records a first-party `event_created` commerce event in `app/api/events/route.ts`. This does not reach Google Ads.

Before enabling an Ads conversion, obtain the actual **event snippet / conversion label** for the intended conversion action. It should identify a destination such as `AW-951353708/ACTUAL_LABEL`; the label cannot be derived from the base ID. Confirm the action means a successfully saved event and is not a page-view or button-click rule.

A later implementation must:

1. Run only following confirmed creation, never on a CTA click, page view, auth prompt, failed save, reload or editing an existing event.
2. Require measurement consent at action time and a configured, validated real label; no placeholder event may be sent.
3. Deduplicate using an opaque, stable conversion transaction ID derived for that event, without transmitting titles, locations, dates, guest details, account identifiers or invitation tokens.
4. Keep navigation and saving independent from tracking failures. Handle location-attachment failure after successful creation without duplicating events or conversions when the visitor retries.
5. Avoid loading Google on private forms merely to send a conversion. Design a separate safe post-save handoff or another privacy-reviewed measurement path before expanding the current public-only tag boundary.
6. Verify opt-in, opt-out, private-page exclusions, repeated navigation and duplicates with mocked network calls first, then the actual action with Google Tag Assistant. Do not create a fake production conversion just to test the installation.

## Staged deployment

Use the existing staged website deployment process with this branch/commit. This change has no backend, database, native-app or environment-variable changes. Do not run the old README's static-site deploy steps, replace the live checkout in place, or deploy historical `main`.

After staging and before release, verify both choices, keyboard interaction and mobile layout. On production, use a consented public page to confirm exactly one request for the supplied ID and the expected Google Ads destination in Tag Assistant. A loader request alone is not proof that a conversion action is correctly configured. No account access or live conversion firing is included in the local tests.
