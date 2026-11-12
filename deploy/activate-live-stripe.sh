#!/usr/bin/env bash
# Run only from the reviewed, separately built release. Never run with bash -x.
set +x
set -euo pipefail
umask 077
API=/home/mayne/apps/family-weather-api
FRONT=/var/www/family-weather-frontend
BASE=63af2f05e03ce3e88a154538565dec1dab471d73
STAGE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
HELPER="$STAGE/deploy/stripe-live-config.cjs"
[[ ${EUID} -eq 0 ]] || { echo 'Run this reviewed activation once as root.' >&2; exit 1; }
[[ $# -eq 1 && $1 =~ ^[0-9a-f]{40}$ ]] || { echo 'Supply the reviewed immutable release commit.' >&2; exit 1; }
EXPECTED=$1
[[ "$STAGE" == /home/mayne/apps/family-weather-live-stripe-* && -d "$STAGE/.git" && ! -L "$FRONT" ]]
[[ $(git -c safe.directory="$STAGE" -C "$STAGE" rev-parse HEAD) == "$EXPECTED" ]]
git -c safe.directory="$STAGE" -C "$STAGE" diff --quiet HEAD --
[[ $(git -c safe.directory="$FRONT" -C "$FRONT" rev-parse HEAD) == "$BASE" ]]
git -c safe.directory="$FRONT" -C "$FRONT" diff --quiet HEAD --
[[ -s "$STAGE/.next/BUILD_ID" && $(cat "$STAGE/.next/family-weather-build-commit") == "$EXPECTED" ]]
[[ $(stat -c %d "$STAGE") == $(stat -c %d /var/www) ]]
[[ -f "$FRONT/.env.production.local" && -f "$API/.env" && -f "$API/routes/event-entitlements-router.js" ]]
# Refuse new precedence or process changes rather than overwriting their meaning.
for extra in .env.local .env.production .env; do [[ ! -f "$FRONT/$extra" ]] || { echo 'Unexpected frontend env precedence; review before activation.' >&2; exit 1; }; done
[[ $(systemctl show family-weather-api.service -p User --value) == mayne ]]
[[ $(systemctl show family-weather-api.service -p WorkingDirectory --value) == "$API" ]]
PM2_HOME=/root/.pm2
export PM2_HOME
[[ -S "$PM2_HOME/rpc.sock" ]] || { echo 'Expected root PM2 daemon was not found.' >&2; exit 1; }
# Parse metadata in memory; never print PM2's environment dump.
pm2 jlist | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{const a=JSON.parse(s).filter(x=>x.name==="family-weather-frontend");if(a.length!==1||a[0].pm2_env.pm_cwd!=="/var/www/family-weather-frontend"||a[0].pm2_env.STRIPE_SECRET_KEY||a[0].pm2_env.env?.STRIPE_SECRET_KEY)process.exit(1);}catch{console.error("PM2 metadata validation failed.");process.exit(1);}})'
# The backend has an independent installation; refuse to overwrite drift.
cmp -s "$API/routes/event-entitlements-router.js" <(git -c safe.directory="$FRONT" -C "$FRONT" show "$BASE:backend/event-entitlements-router.js") || { echo 'Installed backend router differs from the reviewed base; inspect it before deployment.' >&2; exit 1; }
node --check "$STAGE/backend/event-entitlements-router.js"
node --check "$HELPER"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="/var/backups/family-weather/live-stripe-$STAMP"
OLD_FRONT="/var/www/family-weather-frontend.before-live-stripe-$STAMP"
FAILED_FRONT="/home/mayne/apps/family-weather-live-stripe-failed-$STAMP"
install -d -m 0700 "$BACKUP"
cp -p "$API/.env" "$BACKUP/backend.env.original"
cp -p "$API/routes/event-entitlements-router.js" "$BACKUP/event-entitlements-router.js.original"
printf '%s\n' "$BASE" > "$BACKUP/old-commit"
printf '%s\n' "$EXPECTED" > "$BACKUP/new-commit"
# Clear export attributes before collecting input; secrets travel through stdin only.
unset LIVE_KEY WEBHOOK_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET
printf 'Paste the LIVE restricted key (input hidden): ' > /dev/tty
IFS= read -r -s LIVE_KEY < /dev/tty
printf '\nPaste the LIVE webhook endpoint signing secret (input hidden): ' > /dev/tty
IFS= read -r -s WEBHOOK_SECRET < /dev/tty
printf '\n' > /dev/tty
printf '%s\n%s\n' "$LIVE_KEY" "$WEBHOOK_SECRET" | node "$HELPER" prepare "$BACKUP"
unset LIVE_KEY WEBHOOK_SECRET
# Only the candidate release receives its frontend secret before activation.
cp -p "$BACKUP/frontend.env.candidate" "$STAGE/.env.production.local"
BACKEND_CHANGED=0
OLD_MOVED=0
NEW_MOVED=0
STOPPED=0
API_STOPPED=0
pause_live_release() {
  # Keep the actual public webhook ingress running while blocking new purchases.
  # A clean subprocess environment prevents operator secrets from reaching PM2.
  if env -i PATH="$PATH" HOME=/root PM2_HOME=/root/.pm2 NODE_ENV=production STRIPE_CHECKOUT_PAUSED=1 pm2 restart family-weather-frontend --update-env >/dev/null && systemctl start family-weather-api.service; then
    echo 'Rollback withheld. New purchases are paused; the current live release was restarted to preserve webhook forwarding.' >&2
    if ! node "$FRONT/deploy/stripe-live-config.cjs" verify; then
      echo 'Webhook recovery verification failed. Operator attention is required immediately.' >&2
    fi
  else
    echo 'Rollback withheld, and service recovery is incomplete. Restore live webhook ingress immediately.' >&2
  fi
  echo "Protected backup: $BACKUP" >&2
  exit 1
}
rollback() {
  trap - ERR INT TERM
  set +e
  if ! pm2 stop family-weather-frontend >/dev/null 2>&1; then
    if [[ $NEW_MOVED -eq 1 ]]; then pause_live_release; fi
    echo "Could not stop the frontend for safe rollback. Review protected backup: $BACKUP" >&2
    exit 1
  fi
  if [[ $NEW_MOVED -eq 1 ]]; then
    if ! node "$FRONT/deploy/stripe-live-config.cjs" rollback-check "$BACKUP"; then pause_live_release; fi
    if ! mv -T -- "$FRONT" "$FAILED_FRONT"; then pause_live_release; fi
  fi
  if [[ $OLD_MOVED -eq 1 ]]; then
    if ! mv -T -- "$OLD_FRONT" "$FRONT"; then
      echo 'Previous frontend could not be restored.' >&2
      if [[ $NEW_MOVED -eq 1 && ! -e "$FRONT" ]] && mv -T -- "$FAILED_FRONT" "$FRONT"; then pause_live_release; fi
      echo "Recovery is incomplete. Review protected backup: $BACKUP" >&2
      exit 1
    fi
  fi
  RESTORE_FAILED=0
  if [[ $BACKEND_CHANGED -eq 1 ]]; then
    if ! { cp -p "$BACKUP/backend.env.original" "$API/.env.rollback-candidate" && mv -T -- "$API/.env.rollback-candidate" "$API/.env"; }; then RESTORE_FAILED=1; fi
    if ! { cp -p "$BACKUP/event-entitlements-router.js.original" "$API/routes/event-entitlements-router.js.rollback-candidate" && mv -T -- "$API/routes/event-entitlements-router.js.rollback-candidate" "$API/routes/event-entitlements-router.js"; }; then RESTORE_FAILED=1; fi
  fi
  if [[ $RESTORE_FAILED -eq 0 && ( $API_STOPPED -eq 1 || $BACKEND_CHANGED -eq 1 ) ]]; then
    if ! { systemctl restart family-weather-api.service && systemctl is-active --quiet family-weather-api.service; }; then RESTORE_FAILED=1; fi
  fi
  if [[ $RESTORE_FAILED -eq 0 && $STOPPED -eq 1 ]]; then
    # Next loads the restored env file itself; never merge the operator environment.
    if ! pm2 restart family-weather-frontend >/dev/null; then RESTORE_FAILED=1; fi
  fi
  if [[ $RESTORE_FAILED -eq 1 ]]; then
    pm2 stop family-weather-frontend >/dev/null 2>&1
    echo "Recovery is incomplete; frontend is stopped. Review protected backup: $BACKUP" >&2
  else
    echo "Activation failed; previous files restored and services restarted. Protected backup: $BACKUP" >&2
  fi
  exit 1
}
trap rollback ERR INT TERM
STOPPED=1
pm2 stop family-weather-frontend >/dev/null
API_STOPPED=1
systemctl stop family-weather-api.service
# Recheck after stopping writers, closing the preflight-to-cutover race.
node "$HELPER" pending-check "$BACKUP"
mv -T -- "$FRONT" "$OLD_FRONT"
OLD_MOVED=1
# Narrow backend change only; no schema migration or broad installer.
BACKEND_CHANGED=1
install -o "$(stat -c %u "$API/routes/event-entitlements-router.js")" -g "$(stat -c %g "$API/routes/event-entitlements-router.js")" -m "$(stat -c %a "$API/routes/event-entitlements-router.js")" "$STAGE/backend/event-entitlements-router.js" "$API/routes/event-entitlements-router.js.live-candidate"
mv -T -- "$API/routes/event-entitlements-router.js.live-candidate" "$API/routes/event-entitlements-router.js"
cp -p "$BACKUP/backend.env.candidate" "$API/.env.live-candidate"
mv -T -- "$API/.env.live-candidate" "$API/.env"
systemctl restart family-weather-api.service
systemctl is-active --quiet family-weather-api.service
mv -T -- "$STAGE" "$FRONT"
NEW_MOVED=1
pm2 restart family-weather-frontend >/dev/null
for attempt in {1..20}; do
  if curl --fail --silent --output /dev/null http://127.0.0.1:3001/; then break; fi
  sleep 1
done
curl --fail --silent --output /dev/null http://127.0.0.1:3001/
node "$FRONT/deploy/stripe-live-config.cjs" verify
pm2 save >/dev/null
trap - ERR INT TERM
printf 'Live Stripe configuration installed. Release: %s\nProtected rollback material: %s\nPrevious frontend: %s\n' "$EXPECTED" "$BACKUP" "$OLD_FRONT"
echo 'No Checkout Session, charge, payout change, or entitlement cleanup was performed. A real purchase has not been verified.'
