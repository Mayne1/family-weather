#!/usr/bin/env bash
set -euo pipefail
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/family-weather-frontend}"
API_DIR="${API_DIR:-/home/mayne/apps/family-weather-api}"
BACKUP="$API_DIR/family-access-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for file in event-entitlements-router.js commerce-plans.js family-access.js; do
  node --check "$FRONTEND_DIR/backend/$file"
  if [ -f "$API_DIR/routes/$file" ]; then cp "$API_DIR/routes/$file" "$BACKUP/$file"; fi
done
cd "$API_DIR"
SQL_FILE="$FRONTEND_DIR/backend/family-access.sql" node <<'JS'
require('dotenv').config();
const {Pool}=require('pg'),fs=require('fs');
const pool=new Pool(process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:undefined);
(async()=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query(fs.readFileSync(process.env.SQL_FILE,'utf8'));await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
JS
rollback(){
 for file in event-entitlements-router.js commerce-plans.js family-access.js; do
  if [ -f "$BACKUP/$file" ]; then cp "$BACKUP/$file" "$API_DIR/routes/$file"; else rm -f "$API_DIR/routes/$file"; fi
 done
 systemctl restart family-weather-api.service || true
 echo "Family Access installation failed. Previous routes restored from $BACKUP" >&2
}
trap rollback ERR
for file in event-entitlements-router.js commerce-plans.js family-access.js; do install -m 0644 "$FRONTEND_DIR/backend/$file" "$API_DIR/routes/$file"; done
systemctl restart family-weather-api.service
systemctl is-active --quiet family-weather-api.service
trap - ERR
# The private code is created on the server, never committed or included in browser code.
node <<'JS'
require('dotenv').config();
const {Pool}=require('pg'),crypto=require('crypto');
const pool=new Pool(process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:undefined);
(async()=>{const c=await pool.connect();try{
 await c.query('BEGIN');await c.query('LOCK TABLE family_access_codes IN EXCLUSIVE MODE');
 const existing=await c.query('SELECT code_hash FROM family_access_codes');
 if(!existing.rowCount){
  const code='FW-FAMILY-'+crypto.randomBytes(12).toString('hex').toUpperCase();
  const hash=crypto.createHash('sha256').update(code).digest('hex');
  await c.query('INSERT INTO family_access_codes(code_hash,created_by_uid) VALUES($1,$2)',[hash,'server-install']);
  await c.query('COMMIT');console.log('\nYOUR PRIVATE FAMILY CODE: '+code+'\nSave this code and share it only with family. Enter it at https://thefamilyweather.com/family\n');
 }else{await c.query('COMMIT');console.log('Existing family code settings preserved.');}
}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
JS
echo "Family Access backend installed. Backup: $BACKUP"
