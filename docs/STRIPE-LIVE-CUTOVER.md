# Family Weather live Stripe cutover

Prepared release only. Do not run the broad historical backend installer. This
change does not migrate the database, clean up test entitlements, charge a card,
change payouts, enable tax, or create a Stripe Checkout Session during checks.

## Before activation

- Stripe live account must be the verified Family Weather account.
- Create a live restricted application key. The app uses only Checkout Sessions
  create, retrieve and expire. Checkout Sessions write includes read; verify any
  Stripe-required inline price/product permission dependencies before launch.
  Do not grant payouts, refunds, Connect, subscriptions or unrelated resources.
- Register `https://thefamilyweather.com/api/stripe/webhook` in live mode using
  API version `2026-09-30.endive`, receiving exactly:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
- Keep the live restricted key and signing secret out of chat, tool arguments,
  shell history, shared files and source control. The activation script takes
  them through hidden terminal input, pipes them directly to its helper, and
  writes private files. Never use `bash -x`, terminal recording, or `tee`. Normal PM2 restarts
  preserve the existing process environment and reload Next env files without
  merging the operator environment.
- Confirm the payout destination with the owner separately. This release does
  not configure or verify it. Clarify sales-tax/VAT/GST requirements before
  creating a live verification Checkout Session. Existing $1.99 USD pricing and
  tax behavior stay unchanged.
- Do not silently replace a pending test or live checkout. Preflight and a second
  check with both app processes stopped require no pending checkout records.
  Historical paid test-linked entitlements are left untouched.

## Prepare an isolated release as the normal deployment operator

Use the existing authorized repository transfer mechanism to obtain the exact
reviewed commit in a new ordinary clone, not a worktree or the active checkout:

`/home/mayne/apps/family-weather-live-stripe-<release-sha-prefix>`

Verify HEAD equals the reviewed full commit and tracked files are clean. Preserve
frontend production environment values by copying the current `.env.production.local`
privately into this candidate (mode 0600). Never display it. Do not copy example
credentials, replace existing Firebase/Google Ads configuration, or build inside
the active frontend. Run in the candidate:

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
# Only after a successful build of this exact clean commit:
git rev-parse HEAD > .next/family-weather-build-commit
```

Run focused lint on changed TypeScript/deployment files. Full-repository lint
has existing unrelated failures and must not be reported as passing. The release
uses the existing dependency lockfile; no dependency change is needed.

## Narrow privileged activation

The owner reviews and runs the script from that candidate with the full reviewed
commit as its sole argument:

```bash
sudo bash /home/mayne/apps/family-weather-live-stripe-<release-sha-prefix>/deploy/activate-live-stripe.sh <full-reviewed-release-commit>
```

It validates active base `63af2f05e03ce3e88a154538565dec1dab471d73`, the candidate
commit/build marker, expected environment precedence, backend service identity,
the installed backend router against the reviewed base, and the existing root
PM2 frontend. It aborts on an unexpected state instead of overwriting drift.

The hidden prompts ask for the live restricted key and live endpoint signing
secret. A read-only Stripe call verifies Checkout read permission. Then the
script creates protected backups, briefly stops the two app processes, rechecks
pending checkouts, replaces only the backend entitlement router and signing
secret, restarts the backend, moves the prepared frontend into place with its
live key, and restarts the existing root PM2 frontend.

No NGINX, firewall, bank, payout, database schema or historical entitlement change
is included. The backend path remains `/home/mayne/apps/family-weather-api`; the
frontend remains `/var/www/family-weather-frontend`.

## Verification and rollback limits

- The helper checks live key shape and sends a locally signed, unsupported
  configuration-probe event through the full Next-to-Express webhook path. The
  handler ignores it before database access. No payment or purchase event is
  fabricated or credited.
- Confirm the homepage, event sign-in/package UI and failed-payment retry behavior.
  A read-only probe does not prove restricted-key create/expire permissions,
  merchant payout readiness or a real successful payment. State these limits.
- On an activation failure, the script stops the frontend and checks for new live
  checkout activity before restoring the previous release/backend configuration.
  If activity exists or cannot be checked, it restarts the current live frontend with new Checkout creation paused
  (`STRIPE_CHECKOUT_PAUSED=1`), preserving the public webhook-forwarding route,
  and requires operator review instead of restoring test credentials over real
  payments. If service recovery fails, it reports that failure explicitly.
- Protected rollback material is retained under
  `/var/backups/family-weather/live-stripe-<timestamp>` and the old frontend under
  `/var/www/family-weather-frontend.before-live-stripe-<timestamp>`.
- After successful activation and any real checkout, never manually restore test
  credentials or old code without reconciling in-flight payments. Prefer a scoped
  forward fix, keeping the live signed webhook available. Do not delete backups
  or change/delete the three historical test-linked paid entitlements.
