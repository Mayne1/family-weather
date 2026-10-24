#!/usr/bin/env bash
set -euo pipefail
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/family-weather-frontend}"
API_DIR="${API_DIR:-/home/mayne/apps/family-weather-api}"
export API_DIR FRONTEND_DIR
BACKUP="$API_DIR/notifications-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP" "$API_DIR/routes"
cp "$API_DIR/server.js" "$BACKUP/server.js"
for f in push-notifications.js announcements-router.js invites_pg.js; do
 node --check "$FRONTEND_DIR/backend/$f"
 test ! -f "$API_DIR/routes/$f" || cp "$API_DIR/routes/$f" "$BACKUP/$f"
done
python3 - <<'PY'
import os
from pathlib import Path
p=Path(os.environ['API_DIR'])/'server.js';s=p.read_text()
require='const { makePushRouter, startPushWorker } = require("./routes/push-notifications");'
mount='app.use(makePushRouter(pool, requireFirebaseUser));\nstartPushWorker(pool, require("web-push"));'
if require not in s:s=require+'\n'+s
if mount not in s:
 marker='app.use(makeAnnouncementsRouter(pool, requireFirebaseUser));'
 if marker not in s:raise SystemExit('Announcement router not found; running server left unchanged.')
 s=s.replace(marker,marker+'\n'+mount,1)
# The legacy API-key gate runs before the Firebase-authenticated routers.
# Exempt only these endpoints from that gate; makePushRouter still requires auth.
allow='if ((req.method === "GET" && req.path === "/notifications/config") || (req.method === "POST" && ["/notifications/status", "/notifications/subscribe", "/notifications/unsubscribe"].includes(req.path))) return next();'
if allow not in s:
 marker='if (req.method === "OPTIONS") return next();'
 if marker not in s:raise SystemExit('API-key gate insertion point not found; running server left unchanged.')
 s=s.replace(marker,marker+'\n    // Notification routes verify Firebase authentication themselves.\n    '+allow,1)
p.with_name('server.notifications-candidate.js').write_text(s)
PY
node --check "$API_DIR/server.notifications-candidate.js"
cd "$API_DIR"
npm install --save --save-exact web-push@3.6.7
node <<'JS'
const fs=require('fs'),path=require('path'),dotenv=require('dotenv'),webpush=require('web-push');
const file=path.join(process.env.API_DIR,'.env');
const content=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
const env=dotenv.parse(content);
if(Boolean(env.FW_PUSH_PUBLIC_KEY)!==Boolean(env.FW_PUSH_PRIVATE_KEY))throw Error('Incomplete existing push key pair; no keys were overwritten.');
if(!env.FW_PUSH_PUBLIC_KEY){const k=webpush.generateVAPIDKeys();fs.appendFileSync(file,`\nFW_PUSH_PUBLIC_KEY=${k.publicKey}\nFW_PUSH_PRIVATE_KEY=${k.privateKey}\n`,{mode:0o600});}
fs.chmodSync(file,0o600);
dotenv.config({path:file});
const {Pool}=require('pg');const pool=new Pool(process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:undefined);
(async()=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query(fs.readFileSync(path.join(process.env.FRONTEND_DIR,'backend/push-notifications.sql'),'utf8'));await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
JS
for f in push-notifications.js announcements-router.js invites_pg.js; do install -m 0644 "$FRONTEND_DIR/backend/$f" "$API_DIR/routes/$f"; done
cp "$API_DIR/server.notifications-candidate.js" "$API_DIR/server.js"
if ! systemctl restart family-weather-api.service || ! systemctl is-active --quiet family-weather-api.service; then
 cp "$BACKUP/server.js" "$API_DIR/server.js"
 for f in push-notifications.js announcements-router.js invites_pg.js; do test ! -f "$BACKUP/$f" || cp "$BACKUP/$f" "$API_DIR/routes/$f"; done
 systemctl restart family-weather-api.service
 echo "Notification installation failed; previous server restored. Backup: $BACKUP" >&2
 exit 1
fi
printf 'Reply notification service installed. Backup: %s\n' "$BACKUP"
