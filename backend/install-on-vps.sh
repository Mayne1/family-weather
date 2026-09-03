#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="/var/www/family-weather-frontend"
API_DIR="/home/mayne/apps/family-weather-api"
SERVER_FILE="$API_DIR/server.js"
ROUTES_DIR="$API_DIR/routes"
STAMP="$(date +%Y%m%d-%H%M%S)"

test -f "$FRONTEND_DIR/backend/event-invitations.sql"
test -f "$FRONTEND_DIR/backend/event-invitations-router.js"
test -f "$FRONTEND_DIR/backend/event-locations.sql"
test -f "$FRONTEND_DIR/backend/event-locations-router.js"
test -f "$FRONTEND_DIR/backend/invites-rsvp.sql"
test -f "$FRONTEND_DIR/backend/invites_pg.js"
test -f "$FRONTEND_DIR/backend/rsvp-details-router.js"
test -f "$FRONTEND_DIR/backend/event-entitlements.sql"
test -f "$FRONTEND_DIR/backend/event-entitlements-router.js"
test -f "$FRONTEND_DIR/backend/canva-jobs.sql"
test -f "$FRONTEND_DIR/backend/canva-jobs-router.js"
test -f "$SERVER_FILE"

cp "$SERVER_FILE" "$SERVER_FILE.before-invitation-designs.$STAMP"
test ! -f "$ROUTES_DIR/invites_pg.js" || cp "$ROUTES_DIR/invites_pg.js" "$ROUTES_DIR/invites_pg.js.before-rsvp-details.$STAMP"
install -m 0644 "$FRONTEND_DIR/backend/invites_pg.js" "$ROUTES_DIR/invites_pg.js"
install -m 0644 \
  "$FRONTEND_DIR/backend/event-invitations-router.js" \
  "$ROUTES_DIR/event-invitations-router.js"
install -m 0644 \
  "$FRONTEND_DIR/backend/event-locations-router.js" \
  "$ROUTES_DIR/event-locations-router.js"
install -m 0644 \
  "$FRONTEND_DIR/backend/rsvp-details-router.js" \
  "$ROUTES_DIR/rsvp-details-router.js"
install -m 0644 "$FRONTEND_DIR/backend/event-entitlements-router.js" "$ROUTES_DIR/event-entitlements-router.js"
install -m 0644 "$FRONTEND_DIR/backend/canva-jobs-router.js" "$ROUTES_DIR/canva-jobs-router.js"

SERVER_FILE="$SERVER_FILE" python3 - <<'PY'
import os
from pathlib import Path

path = Path(os.environ["SERVER_FILE"])
text = path.read_text()

require_line = 'const makeEventInvitationsRouter = require("./routes/event-invitations-router");'
if require_line not in text:
    marker = 'const makeInvitesRouter = require("./routes/invites_pg");'
    if marker not in text:
        raise SystemExit("Could not find the existing invites router import.")
    text = text.replace(marker, marker + "\n" + require_line, 1)

location_require_line = 'const makeEventLocationsRouter = require("./routes/event-locations-router");'
if location_require_line not in text:
    text = text.replace(require_line, require_line + "\n" + location_require_line, 1)

rsvp_require_line = 'const makeRsvpDetailsRouter = require("./routes/rsvp-details-router");'
if rsvp_require_line not in text:
    text = text.replace(location_require_line, location_require_line + "\n" + rsvp_require_line, 1)

entitlement_require_line = 'const makeEventEntitlementsRouter = require("./routes/event-entitlements-router");'
if entitlement_require_line not in text:
    text = text.replace(rsvp_require_line, rsvp_require_line + "\n" + entitlement_require_line, 1)

canva_require_line = 'const makeCanvaJobsRouter = require("./routes/canva-jobs-router");'
if canva_require_line not in text:
    text = text.replace(entitlement_require_line, entitlement_require_line + "\n" + canva_require_line, 1)

legacy_allow_block = '''// Invitation design endpoints. The PUT route verifies the Firebase owner itself.
if (
  (req.method === "GET" || req.method === "PUT") &&
  /^\\/events\\/[^/]+\\/invitation(?:\\?|$)/.test(url)
) return next();'''
allow_block = '''// Invitation design endpoints. Owner-only write routes verify Firebase themselves.
if (
  (req.method === "GET" || req.method === "PUT" || req.method === "DELETE") &&
  /^\\/events\\/[^/]+\\/invitation(?:\\/artwork)?(?:\\?|$)/.test(url)
) return next();'''
if legacy_allow_block in text:
    text = text.replace(legacy_allow_block, allow_block, 1)
elif "Invitation design endpoints" not in text:
    marker = 'if (req.method === "OPTIONS") return next();'
    if marker not in text:
        raise SystemExit("Could not find the API-key allowlist insertion point.")
    text = text.replace(marker, marker + "\n\n" + allow_block, 1)

location_allow_block = '''// Normalized event-location endpoints. Both routes verify the Firebase owner.
if (
  (req.method === "GET" || req.method === "PUT") &&
  /^\/events\/[^/]+\/location(?:\?|$)/.test(url)
) return next();'''
if "Normalized event-location endpoints" not in text:
    text = text.replace(allow_block, allow_block + "\n\n" + location_allow_block, 1)

rsvp_allow_block = '''// Owner-only RSVP detail endpoint.
if (
  req.method === "GET" &&
  /^\/events\/[^/]+\/rsvp-details(?:\?|$)/.test(url)
) return next();'''
if "Owner-only RSVP detail endpoint" not in text:
    marker = 'if (req.method === "OPTIONS") return next();'
    if marker not in text:
        raise SystemExit("Could not find the RSVP detail allowlist insertion point.")
    text = text.replace(marker, marker + "\n\n" + rsvp_allow_block, 1)

entitlement_allow_block = '''// Event purchase and entitlement endpoints. Owner routes verify Firebase;
// Stripe confirmation independently verifies Stripe's webhook signature.
if (
  ((req.method === "GET" || req.method === "POST") && /^\/events\/[^/]+\/entitlement(?:\/checkout)?(?:\?|$)/.test(url)) ||
  (req.method === "POST" && /^\/billing\/stripe-webhook(?:\?|$)/.test(url))
) return next();'''
if "Event purchase and entitlement endpoints" not in text:
    marker = 'if (req.method === "OPTIONS") return next();'
    if marker not in text:
        raise SystemExit("Could not find the entitlement allowlist insertion point.")
    text = text.replace(marker, marker + "\n\n" + entitlement_allow_block, 1)

canva_allow_block = '''// Short-lived server-side Canva design jobs. Event creation verifies the
// Firebase owner; callback routes require an unguessable, single-use job capability.
if (
  (req.method === "POST" && /^\/events\/[^/]+\/canva-job(?:\?|$)/.test(url)) ||
  ((req.method === "GET" || req.method === "PATCH") && /^\/canva-jobs\/[a-f0-9]{64}(?:\?|$)/.test(url)) ||
  (req.method === "POST" && /^\/canva-jobs\/[a-f0-9]{64}\/artwork(?:\?|$)/.test(url))
) return next();'''
if "Short-lived server-side Canva design jobs" not in text:
    marker = 'if (req.method === "OPTIONS") return next();'
    if marker not in text:
        raise SystemExit("Could not find the Canva allowlist insertion point.")
    text = text.replace(marker, marker + "\n\n" + canva_allow_block, 1)

mount_line = 'app.use(makeEventInvitationsRouter(pool, requireFirebaseUser));'
location_mount_line = 'app.use(makeEventLocationsRouter(pool, requireFirebaseUser));'
rsvp_mount_line = 'app.use(makeRsvpDetailsRouter(pool, requireFirebaseUser));'
entitlement_mount_line = 'app.use(makeEventEntitlementsRouter(pool, requireFirebaseUser));'
canva_mount_line = 'app.use(makeCanvaJobsRouter(pool, requireFirebaseUser));'
# The API-key middleware is declared before `pool` in this server. Always move
# the router mount to the event-route section, where the database pool already
# exists, instead of mounting it beside `app.use(requireApiKey)`.
text = text.replace(mount_line + "\n", "")
text = text.replace(location_mount_line + "\n", "")
text = text.replace(rsvp_mount_line + "\n", "")
text = text.replace(entitlement_mount_line + "\n", "")
text = text.replace(canva_mount_line + "\n", "")
marker = '// 1) Create an event'
if marker not in text:
    raise SystemExit("Could not find the event-route insertion point.")
text = text.replace(marker, mount_line + "\n" + location_mount_line + "\n" + rsvp_mount_line + "\n" + entitlement_mount_line + "\n" + canva_mount_line + "\n\n" + marker, 1)

path.write_text(text)
print(f"Patched {path}")
PY

cd "$API_DIR"
SQL_FILES="$FRONTEND_DIR/backend/event-invitations.sql:$FRONTEND_DIR/backend/event-locations.sql:$FRONTEND_DIR/backend/invites-rsvp.sql:$FRONTEND_DIR/backend/event-entitlements.sql:$FRONTEND_DIR/backend/canva-jobs.sql" node <<'NODE'
"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
const { Pool } = require("pg");

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : undefined;
const pool = new Pool(config);

(async () => {
  try {
    for (const sqlFile of process.env.SQL_FILES.split(":")) {
      const sql = fs.readFileSync(sqlFile, "utf8");
      await pool.query(sql);
    }
    console.log("Invitation, event-location, RSVP, entitlement, and Canva job tables are ready.");
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

node --check "$SERVER_FILE"
systemctl restart family-weather-api.service
systemctl --no-pager --full status family-weather-api.service | head -18

echo
echo "Invitation backend installation complete."
echo "Backup: $SERVER_FILE.before-invitation-designs.$STAMP"
