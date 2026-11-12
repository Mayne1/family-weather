# Google Ads measurement installation

The base-tag release is `5f99d84`; these conversion changes are based on it, not the historical `main` branch.

## Installed code

- The owner-supplied Google-only tag is `AW-951353708` and the loader is exactly `https://www.googletagmanager.com/gtm.js?id=AW-951353708`.
- Google's November 6, 2026 guide uses this format and no longer includes `gtag('config')` in its default snippet: https://developers.google.com/tag-platform/gtagjs. Older help pages describe the previous format. Do not add a second loader or config command.
- The supplied **Purchase** action `AW-951353708/HVkECKnQ2rYdEOyC0sUD` is wired only to independently verified paid Stripe checkout. Successful free-event conversion support is separate and **remains off until its own intended action label is configured**.
- No Google Ads account settings are changed. A November 12 read of the public loader found one published conversion rule: `/about` page views, label `-NJ0CM6qjrYdEOyC0sUD`. That is not a successful-form action, and the new code explicitly rejects it. The loader also enables automatic user-provided-data detection remotely; the site therefore keeps `ad_user_data` denied even after opt-in. Owner-side diagnostics still need to verify receipt and attribution.

## Consent and privacy boundaries

Google Ads requests are blocked until the visitor explicitly allows measurement. There is an equally accessible decline choice and a persistent control on public pages and `/privacy`; choices expire in 180 days. Missing, invalid, expired or unavailable storage denies measurement. Global Privacy Control also denies it. On revocation the consent update is queued and the page reloads, because removing the script node alone would not stop already-running code. Other tabs observe changes to the stored choice.

The implementation grants only ad measurement storage after that choice. Ad user-data, ad personalization and analytics storage remain denied. This prevents enhanced-conversion collection of user-provided personal data even if enabled in the remote tag configuration, and may limit measurement features that require that consent. Google signals/personalization and URL passthrough are also disabled in the in-page settings. Consent mode documentation: https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic.

Only explicitly listed public routes qualify. Planner and weather-history pages, event creation, event management, invitations, RSVP, announcements, family access, legal and unknown routes do not load the tag. Account dialogs render only after a fresh navigation with an excluded account marker, which remains in the URL while the document is active. URLs containing planner details, unknown query parameters or fragments also do not load it. Only bounded Google click-identification parameters are allowed. Returning from a private same-origin referrer is excluded. Explicit page/referrer parameters are sanitized, and the loader suppresses its HTTP referrer. Production hostname checks prevent localhost and preview traffic from contacting Google Ads.

Full-document navigation at public/private boundaries prevents loaded advertising scripts from carrying into private routes. When the tag has loaded, internal links use full navigation. The homepage planner form also uses full navigation because its query contains visitor-entered planning details.

This is not a general-purpose or Google-certified CMP and is not a claim of jurisdiction-wide legal compliance. It does not retroactively govern the existing AdSense script; the UI and privacy disclosure say the choice is specific to Google Ads measurement. Review AdSense consent separately if required. Do not infer that a disabled personalized-ad signal verifies all destination-side account configuration.

## Verified purchase conversion

The owner supplied Purchase destination `AW-951353708/HVkECKnQ2rYdEOyC0sUD`. This is never called on a checkout-button click, free event creation, promotional upgrade or unverified payment-return URL.

New Stripe sessions return to the private event page with their session ID and a server-set expected-charge metadata value. With current consent, the client polls an owner-authenticated Next.js receipt endpoint briefly. The server verifies event ownership before reading Stripe, requires the session to match the registered entitlement, then checks a live, completed, paid, payment-mode USD session with matching event/product and exact expected charge. It waits for the signed-webhook-applied entitlement and rejects stale sessions. It never changes a payment. No webhook/backend/database change is included.

The server returns only a namespaced SHA-256 transaction identifier. The client crosses a fresh no-referrer document into `/purchase-complete`, consumes a short-lived pending receipt and rechecks consent. Google receives only the supplied Purchase destination and the opaque stable transaction ID, with callback controls. No raw Stripe session, customer data, card information, event identifier or price is sent. Session storage prevents repeat sending in the current tab; Google's transaction ID deduplication protects repeat receipt verification across tabs/sessions. Directly opening the clean URL without a pending verified receipt cannot fire a conversion.

No real purchase or production conversion is created by the automated checks. Payment receipt validation and tag queuing are mocked in tests. Actual Google receipt and attribution still require a legitimate purchase and owner-side diagnostics.

## Successful-event conversion implementation

The successful creation path is `app/create-event/CreateEventFlow.tsx`, after an authenticated POST to `/api/events` returns `data.ok` and a valid event ID, and any required location attachment succeeds. The proxy separately records the existing first-party `event_created` commerce event. That internal record is not a Google Ads conversion.

The client prevents concurrent saves. If the location attachment fails after creation, it retains the created event ID and retries only the attachment. It cannot count a weather search, sign-in, password reset, failed create request, edit, invitation view or page reload as an event-save conversion.

With a real configured label, current opt-in consent, no Global Privacy Control, available session storage, and the production hostname, it creates one random UUID and a short-lived (two-minute) pending record. A full-document navigation to `/event-saved` suppresses the private source URL via `no-referrer`. The clean bridge does not display account information, private form fields, event identifiers or invitation links. It consumes the pending record before loading Google; directly opening or reloading it cannot fire a conversion. The tag stays excluded from the actual form and invitation pages.

The conversion call sends only `send_to`, the random `transaction_id`, and completion/timeout controls. After the callback, or after a bounded timeout (up to 2.5 seconds for the script and 1.5 seconds for the conversion callback) if tracking is blocked, it navigates to the saved invitation in a fresh document. No email, location, event ID, invitation token, invented revenue or form values are sent. Declined or missing consent, unavailable storage, preview hosts, invalid labels and tracking failures do not block saving or opening the invitation. Consent is checked again on the bridge.

### The one missing configuration item

Obtain the **Event snippet** for the intended successful form/event conversion. It must supply a destination such as `AW-951353708/REAL_ACTION_LABEL`. The base ID alone does not identify this action. Do not use the known `/about` label or the separately supplied Purchase label `HVkECKnQ2rYdEOyC0sUD`, and do not invent one. Both are rejected for free event saves. The category name “form submission” alone does not establish the action's actual trigger.

Set `NEXT_PUBLIC_GOOGLE_ADS_EVENT_CONVERSION_LABEL` to only that action's label before the production build. Omit the variable while it is unknown. Confirm the action means a successfully saved event and is not already also configured to count the same event automatically. The existing `/about` goal is separate; this code does not repurpose or edit it.

Unit tests mock the tag and assert consent, deduplication, private-data exclusion, label validation, expired handoffs, direct visits, failed storage and preview-host behavior. No fake production event or conversion is created for these tests. A legitimate successful save and account-side diagnostics are still needed to verify real conversion receipt and attribution.

## Staged deployment

Use the existing staged website deployment process with this branch/commit. This change has no backend, database or native-app changes. The optional build-time conversion-label variable is described above; leave it unset until the correct action is verified. Do not run the old README's static-site deploy steps, replace the live checkout in place, or deploy historical `main`.

After staging and before release, verify both choices, keyboard interaction and mobile layout. On production, use a consented public page to confirm exactly one request for the supplied ID and the expected Google Ads destination in Tag Assistant. A loader request alone is not proof that a conversion action is correctly configured. No account access or live conversion firing is included in the local tests.
