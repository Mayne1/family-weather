# Family Weather backend additions

This folder contains deliberately small backend additions for durable digital invitations and normalized event coordinates.

- `event-invitations.sql` adds one invitation record per event. Existing events, invite tokens, and RSVP responses remain unchanged.
- `event-invitations-router.js` adds a public read endpoint and an owner-only save endpoint.
- Finished PNG, JPEG, or WebP invitation artwork can be stored with that record (8 MB maximum). Upload and removal require the event owner; artwork reads require a current invitation token.
- `event-locations.sql` stores the resolved WGS84 latitude/longitude and normalized international place metadata once per event.
- `event-locations-router.js` adds owner-only read and save endpoints without changing the existing event table.
- `invites-rsvp.sql` and `invites_pg.js` persist the guest name, guest count, and message collected by the RSVP form.
- `rsvp-details-router.js` lets only the event owner retrieve those RSVP details.
- `event-entitlements.sql` adds the one-event launch purchase, email allowance, share-link response records, and a one-time grandfathering marker.
- `event-entitlements-router.js` exposes owner-only entitlement status and stores pending checkout sessions. Its webhook endpoint independently verifies Stripe's signature before marking an event paid.

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

No existing table or endpoint is replaced.

The Next.js runtime requires server-only `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`. The Express backend requires `STRIPE_WEBHOOK_SECRET`. Stripe must send `checkout.session.completed` events to `https://thefamilyweather.com/api/stripe/webhook`.

For the current VPS layout, the included installer performs those steps
idempotently, creates a timestamped `server.js` backup, checks Node syntax,
and restarts only `family-weather-api.service`:

```bash
bash /var/www/family-weather-frontend/backend/install-on-vps.sh
```
