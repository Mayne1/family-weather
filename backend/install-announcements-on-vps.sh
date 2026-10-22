#!/usr/bin/env bash
set -euo pipefail
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/family-weather-frontend}"
API_DIR="${API_DIR:-/home/mayne/apps/family-weather-api}"
export API_DIR
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$API_DIR/announcement-backup-$STAMP"
mkdir -p "$BACKUP"
cp "$API_DIR/server.js" "$BACKUP/server.js"
for f in announcements-router.js invites_pg.js; do
  test ! -f "$API_DIR/routes/$f" || cp "$API_DIR/routes/$f" "$BACKUP/$f"
  node --check "$FRONTEND_DIR/backend/$f"
done
# Prepare a candidate first; fail without changing the running server if its layout differs.
python3 - <<'PY'
import os
from pathlib import Path
p=Path(os.environ['API_DIR'])/'server.js'
s=p.read_text()
require='const makeAnnouncementsRouter = require("./routes/announcements-router");'
mount='app.use(makeAnnouncementsRouter(pool, requireFirebaseUser));'
if require not in s: s=require+'\n'+s
if mount not in s:
 marker='app.use(makeEventEntitlementsRouter(pool, requireFirebaseUser));'
 if marker not in s: raise SystemExit('Existing payment router not found; server left unchanged.')
 s=s.replace(marker,mount+'\n'+marker,1)
marker='if (req.method === "OPTIONS") return next();'
allow='if (req.path === "/announcements" || req.path.startsWith("/announcements/")) return next();'
if allow not in s:
 if marker not in s: raise SystemExit('API authentication insertion point not found; server left unchanged.')
 s=s.replace(marker,marker+'\n    // Announcement routes enforce creator authentication themselves.\n    '+allow,1)
p.with_name('server.announcements-candidate.js').write_text(s)
PY
node --check "$API_DIR/server.announcements-candidate.js"
cd "$API_DIR"
SQL_FILE="$FRONTEND_DIR/backend/announcements.sql" node <<'JS'
require('dotenv').config();
const {Pool}=require('pg');const fs=require('fs');
const pool=new Pool(process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:undefined);
(async()=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query(fs.readFileSync(process.env.SQL_FILE,'utf8'));await c.query('COMMIT')}catch(e){await c.query('ROLLBACK');throw e}finally{c.release();await pool.end()}})().catch(e=>{console.error(e.message);process.exitCode=1});
JS
for f in announcements-router.js invites_pg.js; do install -m 0644 "$FRONTEND_DIR/backend/$f" "$API_DIR/routes/$f"; done
cp "$API_DIR/server.announcements-candidate.js" "$API_DIR/server.js"
if ! systemctl restart family-weather-api.service || ! systemctl is-active --quiet family-weather-api.service; then
 cp "$BACKUP/server.js" "$API_DIR/server.js"
 for f in announcements-router.js invites_pg.js; do test ! -f "$BACKUP/$f" || cp "$BACKUP/$f" "$API_DIR/routes/$f"; done
 systemctl restart family-weather-api.service
 echo "Backend installation failed; previous server restored. Backup: $BACKUP" >&2
 exit 1
fi
printf 'Announcements backend installed. Backup: %s\n' "$BACKUP"
