#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="/var/www/family-weather-frontend"
API_DIR="/home/mayne/apps/family-weather-api"
SERVER_FILE="$API_DIR/server.js"
ROUTES_DIR="$API_DIR/routes"
STAMP="$(date +%Y%m%d-%H%M%S)"

test -f "$FRONTEND_DIR/backend/event-invitations.sql"
test -f "$FRONTEND_DIR/backend/event-invitations-router.js"
test -f "$SERVER_FILE"

cp "$SERVER_FILE" "$SERVER_FILE.before-invitation-designs.$STAMP"
install -m 0644 \
  "$FRONTEND_DIR/backend/event-invitations-router.js" \
  "$ROUTES_DIR/event-invitations-router.js"

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

allow_block = '''// Invitation design endpoints. The PUT route verifies the Firebase owner itself.
if (
  (req.method === "GET" || req.method === "PUT") &&
  /^\\/events\\/[^/]+\\/invitation(?:\\?|$)/.test(url)
) return next();'''
if "Invitation design endpoints" not in text:
    marker = 'if (req.method === "OPTIONS") return next();'
    if marker not in text:
        raise SystemExit("Could not find the API-key allowlist insertion point.")
    text = text.replace(marker, marker + "\n\n" + allow_block, 1)

mount_line = 'app.use(makeEventInvitationsRouter(pool, requireFirebaseUser));'
# The API-key middleware is declared before `pool` in this server. Always move
# the router mount to the event-route section, where the database pool already
# exists, instead of mounting it beside `app.use(requireApiKey)`.
text = text.replace(mount_line + "\n", "")
marker = '// 1) Create an event'
if marker not in text:
    raise SystemExit("Could not find the event-route insertion point.")
text = text.replace(marker, mount_line + "\n\n" + marker, 1)

path.write_text(text)
print(f"Patched {path}")
PY

cd "$API_DIR"
SQL_FILE="$FRONTEND_DIR/backend/event-invitations.sql" node <<'NODE'
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
    const sql = fs.readFileSync(process.env.SQL_FILE, "utf8");
    await pool.query(sql);
    console.log("Invitation database table is ready.");
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
