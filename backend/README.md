# Family Weather invitation backend addition

This folder contains the deliberately small backend addition for durable digital invitations.

- `event-invitations.sql` adds one invitation record per event. Existing events, invite tokens, and RSVP responses remain unchanged.
- `event-invitations-router.js` adds a public read endpoint and an owner-only save endpoint.

Mount the router in the existing Express server after `pool` and `requireFirebaseUser` exist:

```js
const makeEventInvitationsRouter = require("./routes/event-invitations-router");
app.use(makeEventInvitationsRouter(pool, requireFirebaseUser));
```

The existing API-key middleware must allow:

- `GET /events/:id/invitation`
- authenticated `PUT /events/:id/invitation`

No existing table or endpoint is replaced.

For the current VPS layout, the included installer performs those steps
idempotently, creates a timestamped `server.js` backup, checks Node syntax,
and restarts only `family-weather-api.service`:

```bash
bash /var/www/family-weather-frontend/backend/install-on-vps.sh
```
