# Family Weather backend additions

> **Brand/timezone release deployment warning:** Follow the narrow, backend-first
> [brand/timezone rollout runbook](../DEPLOY-BRAND-TIMEZONES.md). Do not run the
> broad `install-on-vps.sh` installer for this release: it also replaces unrelated
> invitation routes and can overwrite existing notification integrations. The
> older installation instructions below are background, not this release's
> production procedure.

This folder contains deliberately small backend additions for durable digital invitations and normalized event coordinates.

- `event-invitations.sql` adds one invitation record per event. Existing events, invite tokens, and RSVP responses remain unchanged.
- `event-invitations-router.js` adds a public read endpoint and an owner-only save endpoint.
- `invitation-design-ids.js` keeps backend save validation synchronized with every design offered by the frontend catalog.
- Finished PNG, JPEG, or WebP invitation artwork can be stored with that record (8 MB maximum). Upload and removal require the event owner; artwork reads require a current invitation token.
- `event-locations.sql` stores the resolved WGS84 latitude/longitude and normalized international place metadata once per event.
- `event-locations-router.js` adds owner-only read and save endpoints without changing the existing event table.
- `invites-rsvp.sql` and `invites_pg.js` persist the guest name, guest count, and message collected by the RSVP form.
- `rsvp-details-router.js` lets only the event owner retrieve those RSVP details.
- `event-entitlements.sql` adds backward-compatible Free, Clean, Plus, and larger per-event entitlements; one-use promotion codes; commerce events; email allowances; and share-link responses. Existing $5.99 purchases become Event Plus with both sharing methods.
- `event-entitlements-router.js` provisions Free events, handles upgrades and owner promotion codes, and stores pending checkout sessions without replacing current access. Its webhook independently verifies Stripe's signature and amount before applying an upgrade.
- `commerce-plans.js` is the backend's authoritative price, email allowance, and presentation map.

The per-event plans are intentionally cumulative. A later upgrade charges only
the difference between the event's current value and the selected plan:

| Plan | Price | Direct emails | Guest presentation |
| --- | ---: | ---: | --- |
| Free Event | $0 | 10 | Family Weather promotion |
| Clean Event | $1.99 | 10 | No promotion; small signature |
| Event Plus | $5.99 | 25 | No promotion or Family Weather branding |
| Large Event | $19.99 | 100 | No promotion or Family Weather branding |
| Bigger Event | $39.99 | 250 | No promotion or Family Weather branding |
| Organization Event | $69.99 | 500 | No promotion or Family Weather branding |
| Major Event | $119.99 | 1,000 | No promotion or Family Weather branding |

Every plan retains the host's reusable shareable link and RSVP management. The
application does not advertise a share-link RSVP cap.

Mount the router in the existing Express server after `pool` and `requireFirebaseUser` exist:

```js
const makeEventInvitationsRouter = require("./routes/event-invitations-router");
const makeEventLocationsRouter = require("./routes/event-locations-router");
const makeRsvpDetailsRouter = require("./routes/rsvp-details-router");
const makeEventEntitlementsRouter = require("./routes/event-entitlements-router");
app.use(makeEventInvitationsRouter(pool, requireFirebaseUser));
app.use(makeEventLocationsRouter(pool, requireFirebaseUser));
app.use(makeRsvpDetailsRouter(pool, requireFirebaseUser));
app.use(makeEventEntitlementsRouter(pool, requireFirebaseUser));
app.use(makeCanvaJobsRouter(pool, requireFirebaseUser));
```

The existing API-key middleware must allow:

- `GET /events/:id/invitation`
- authenticated `PUT /events/:id/invitation`
- authenticated `GET /events/:id/location`
- authenticated `PUT /events/:id/location`
- authenticated `GET /events/:id/rsvp-details`
- authenticated `POST /events/:id/entitlement/promo`
- authenticated `POST /events/:id/entitlement/release-email`
- promotion-admin `GET|POST /billing/promo-codes`

No existing table or endpoint is replaced.

The Next.js runtime requires server-only `STRIPE_SECRET_KEY`. The Express backend requires `STRIPE_WEBHOOK_SECRET`; `FAMILY_WEATHER_PROMO_ADMIN_UIDS` is a comma-separated allowlist of Firebase UIDs permitted to generate promotion codes. Stripe must send `checkout.session.completed` events to `https://thefamilyweather.com/api/stripe/webhook`.

Promotion codes are one-use capabilities and are returned in full only when
they are created. The database retains a SHA-256 hash plus a masked label. An
authenticated promotion administrator can create 1–100 codes at a time by
posting `{ "product_code": "event_plus_599", "count": 10 }` to
`/api/admin/promo-codes`, list their masked status with `GET`, or disable an
unused code by posting `{ "action": "disable", "code": "FW-..." }`.

For the current VPS layout, the included installer performs those steps
idempotently, creates a timestamped `server.js` backup, checks Node syntax,
and restarts only `family-weather-api.service`:

```bash
bash /var/www/family-weather-frontend/backend/install-on-vps.sh
```

## Destination event time zones

`event-timezones.sql` adds nullable `events.time_zone`. Old events keep their
instants and local display; no timezone is guessed for historical records.
`event-timezones-router.js` adds atomic owner-authenticated creation/update with
`starts_local`, IANA `time_zone`, and elapsed `duration_minutes` (1–10080).
The server converts local wall time, rejects DST gaps and repeated hours with
an actionable message, and stores the UTC instants and zone in one statement.
Zoned list/detail reads include the zone; guest detail needs an unexpired invite
token for that exact event and does not return owner email/UID.

Deploy the additive SQL and router **before** deploying this frontend. Mount
`makeEventTimezonesRouter(pool, requireFirebaseUser)` before the existing generic
event routes, and permit `/events/zoned` and `/events/:id/zoned` through API-key
middleware (these routes enforce Firebase/token access themselves). Copy
`event-time.js` alongside the router. `install-on-vps.sh` includes these steps;
review the installer against the current server before running it. No migration
or deployment is performed by tests. Missing backend support fails closed and
never falls back to a timezone-losing creation request.
