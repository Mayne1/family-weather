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
- `FW_SMS_ENABLED=true`: set only after sender approval and a controlled live test are arranged.

Before enabling, verify Brevo has approved the sender/use case and opt-out handling. Having prepaid credits does not establish sender approval. The existing Stripe endpoint must subscribe to `checkout.session.completed`. Its SMS metadata routes into this module; unrelated event purchases pass through unchanged. After editing backend environment, restart `family-weather-api.service`. Free link sharing works with SMS disabled.

## Verification and operations

`npm run build` and `node --test backend/announcements*.test.js` verify compilation and mocked-provider flows. Integration tests use an in-memory PostgreSQL emulator: they do not establish real PostgreSQL concurrency behavior, live Stripe configuration, or carrier delivery. Database row locks and unique constraints protect wallet/order mutations in PostgreSQL.

Explicit provider rejections refund the text credit. Timeouts/ambiguous failures hold it and never automatically resend. Inspect Brevo logs using the stored `fw-<send-id>` tag before resolving pending/unknown sends. Confirmed non-sends require an administrator to refund exactly once in a database transaction and mark rejected. Do not refund/retry merely because a request timed out. Handle payment refunds/disputes manually; automatic refund/dispute reconciliation is not included. Monitor wallet liabilities against prepaid provider balance. No automatic Brevo purchases occur.

The price shown in the supplied screenshot was $1.09 per 100 U.S. SMS credits: ten cost about $0.109, leaving $0.881 before payment processing, taxes, refunds, and other expenses. Actual processor fees determine net margin.
