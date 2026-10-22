# Announcements and optional SMS

Free announcements: `/announcements`; recipients use `/a/<random-id>` without an account. Named replies are visible only to the authenticated creator. Anyone holding a link can read or forward it; closing an announcement disables public reading and replies. Pages are noindex and do not load ads.

SMS packs cost 99 cents for ten U.S. link messages. Payment confirmation is verified server-side, and duplicate webhook events cannot credit the same order twice. Credits belong to the buyer and work across their announcements. One send per recipient per announcement prevents duplicate charging. The fixed ASCII link message fits one SMS segment. Accepted means provider acceptance, not delivery.

## Deployment

Build the frontend successfully before restarting it. Install the backend with:

```
bash backend/install-announcements-on-vps.sh
```

The installer backs up server.js, validates its insertion points, creates additive database tables, installs the phone-number dependency, and mounts the announcement router before the existing Stripe webhook router. It restores server.js if the backend restart fails. It does not change secrets or enable SMS.

Backend `/home/mayne/apps/family-weather-api/.env` needs these existing/new values to enable paid SMS:

- `BREVO_API_KEY`: the account's API key (never a public frontend variable).
- `BREVO_SMS_SENDER`: approved U.S. sending number from Brevo.
- `STRIPE_SECRET_KEY`: same Stripe account as the existing checkout.
- `STRIPE_WEBHOOK_SECRET`: secret matching the existing webhook forwarded by `/api/stripe/webhook`.
- `BREVO_SMS_WEBHOOK_SECRET`: a random secret of at least 32 characters, configured as the `x-fw-sms-secret` header on the Brevo SMS webhook. Never put it in a URL.
- `FW_SMS_PROVIDER_VERIFIED=true`: set only after actual STOP/HELP handling and the authenticated unsubscribe webhook have been verified for the approved number.
- `FW_SMS_ENABLED=true`: set only after sender approval and a controlled live test are arranged.

Before enabling, verify Brevo has approved the sender/use case and opt-out handling. Having prepaid credits does not establish sender approval. The existing Stripe endpoint must subscribe to `checkout.session.completed`. Its SMS metadata routes into this module; unrelated event purchases pass through unchanged. After editing backend environment, restart `family-weather-api.service`. Free link sharing works with SMS disabled.

## Verification and operations

`npm run build` and `node --test backend/announcements*.test.js` verify compilation and mocked-provider flows. Integration tests use an in-memory PostgreSQL emulator: they do not establish real PostgreSQL concurrency behavior, live Stripe configuration, or carrier delivery. Database row locks and unique constraints protect wallet/order mutations in PostgreSQL.

Explicit provider rejections refund the text credit. Timeouts/ambiguous failures hold it and never automatically resend. Inspect Brevo logs using the stored `fw-<send-id>` tag before resolving pending/unknown sends. Confirmed non-sends require an administrator to refund exactly once in a database transaction and mark rejected. Do not refund/retry merely because a request timed out. Handle payment refunds/disputes manually; automatic refund/dispute reconciliation is not included. Monitor wallet liabilities against prepaid provider balance. No automatic Brevo purchases occur.

The price shown in the supplied screenshot was $1.09 per 100 U.S. SMS credits: ten cost about $0.109, leaving $0.881 before payment processing, taxes, refunds, and other expenses. Actual processor fees determine net margin.

## Recipient consent and registration (October 22, 2026)

The creator opens an announcement, enters their recognizable name under SMS,
and creates their signup link. This name is deliberately immutable so stored
permissions cannot silently change identity. Share that link using personal
text/email. A recipient visits `/sms-signup/<channel-token>`, enters their own
name and US number, and explicitly checks the initially unchecked box. No
account, payment, or SMS is required to enroll. This is web-form consent, not
OTP verification of phone ownership; describe it accurately in the application.

Consent records preserve the complete disclosure, version, source URL, browser
user-agent and server timestamp. A send links to the consent record used. A
creator can send only to their signed-up recipients. Existing sender-checkbox
records are NOT migrated into recipient permission. Signup does not initiate a
message. The signup confirmation supplies a private opt-out link. Anyone with
that private link can stop texts, so the recipient should keep it private.

Website opt-out suppresses the number globally. An authenticated Brevo
unsubscribe/blacklist/blocked event does the same. Signup and provider START
events never silently lift suppression. Support must verify a request to rejoin,
renewed consent, and provider eligibility before an administrator removes a
suppression. No automated re-enrollment is implemented. Already-dispatched
messages may arrive after an opt-out. Support email requests must be handled
promptly by an operator.

### Brevo proof after deployment

1. Open the real signup link from your announcement manager. Use that exact
   URL as website-form proof; capture the full page with checkbox unchecked,
   disclosure and policy links visible. Do not submit a mockup or claim OTP.
2. Privacy: `https://thefamilyweather.com/privacy`
3. Terms: `https://thefamilyweather.com/terms`
4. SMS details: `https://thefamilyweather.com/sms-consent`
5. Select website form as opt-in method. Select the closest informational /
   transactional announcement category offered, and an honest monthly estimate.
6. Suggested use-case summary: Family Weather sends short links to personal
   announcements on behalf of a named organizer. Recipients first enter their
   own mobile number and check a separate consent box on that organizer's web
   signup page. Permission applies only to that organizer. One text per
   announcement; frequency varies. No promotional messages. STOP opts out.
7. For sample content create a harmless real announcement and use its actual
   working link. The generated text is exactly:
   `Family Weather announcement: <actual announcement URL> Reply STOP to stop, HELP for help.`
   Replace the angle-bracket placeholder before submitting. Do not submit a
   made-up announcement ID or a private family/medical announcement as evidence.

### Configure and verify provider handling after approval

Brevo documents toll-free approval before US delivery. Keep `FW_SMS_ENABLED`
and `FW_SMS_PROVIDER_VERIFIED` false until approval and controlled checks.

Configure an SMS webhook at
`https://thefamilyweather.com/api/announcements/sms-webhook` with custom header
`x-fw-sms-secret` matching backend `BREVO_SMS_WEBHOOK_SECRET`. Subscribe to
unsubscribe and blocked/blacklisted events available for the SMS channel. The
endpoint accepts the documented transactional SMS `msg_status` and `to` fields,
plus event-style callbacks. It rejects unauthenticated callbacks. Do not use the
Stripe webhook secret for this.

Use the approved sender and your own consenting phone in Brevo to verify the
exact message, actual delivery, STOP suppression, HELP reply, and that Brevo's
unsubscribe callback persists a row in `fw_sms_suppressions`. Brevo's send API
documents automatic type switching when opt-out content is included: verify the
actual route and configuration with Brevo rather than assuming `transactional`
bypasses STOP. The app continues requesting transactional delivery with explicit
STOP/HELP wording. No per-message callback URL or automatic credit refund on a
provider delivery callback is used.

Once that succeeds, set both flags true, restart the backend, and test one real
99-cent checkout and one consented send. Verify duplicate payment notifications
do not add credits again. Do not enable purchases before working delivery.

References checked:
- https://help.brevo.com/hc/en-us/articles/28255350696466-Register-a-Sender-ID-to-send-SMS-messages
- https://help.brevo.com/hc/en-us/articles/208723209-Supported-keywords-for-SMS-HELP-STOP-START-INFO
- https://developers.brevo.com/docs/transactional-webhooks
- https://developers.brevo.com/reference/create-webhook
- https://developers.brevo.com/docs/transactional-sms-endpoints

Release validation: TypeScript and production build passed; integration tests cover
unchecked/stale consent rejection, organizer isolation, opt-out suppression,
webhook authentication, unchanged balances on refused sends, and duplicate
payments/sends. Browser visual verification was unavailable in the build
environment because the Chromium download failed. Review the live signup form
on phone and desktop after deployment before taking the proof screenshot.
