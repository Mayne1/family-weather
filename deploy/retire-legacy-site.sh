#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run with sudo: sudo bash deploy/retire-legacy-site.sh" >&2
  exit 1
fi

active_snippet="/etc/nginx/snippets/family-weather-next-legacy.conf"
auth_snippet="/etc/nginx/snippets/fw-auth-nocache.conf"
backup_dir="/etc/nginx/backups"
stamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "${backup_dir}"

[[ -f "${active_snippet}" ]] && cp -a "${active_snippet}" "${backup_dir}/family-weather-next-legacy.${stamp}"
[[ -f "${auth_snippet}" ]] && cp -a "${auth_snippet}" "${backup_dir}/fw-auth-nocache.${stamp}"

cat >"${active_snippet}" <<'NGINX'
location = /index.html { return 301 /; }
location = /privacy.html { return 301 /privacy; }
location = /terms.html { return 301 /terms; }
location = /sms-consent.html { return 301 /sms-consent; }

location ~ ^/(profile|settings|my-events|create-event|invite|feeds|groups|contacts|contact|rsvp-public)\.html$ { return 410; }
location ^~ /weather-intel/ { return 410; }
location ^~ /weather-iq/ { return 410; }
NGINX

cat >"${auth_snippet}" <<'NGINX'
location = /signin.html { return 410; }
location = /auth.html { return 410; }
location = /login.html { return 410; }
location = /login.js { return 410; }
NGINX

if nginx -t; then
  systemctl reload nginx
  echo "Legacy Family Weather pages retired. Backups saved in ${backup_dir}."
else
  [[ -f "${backup_dir}/family-weather-next-legacy.${stamp}" ]] && cp -a "${backup_dir}/family-weather-next-legacy.${stamp}" "${active_snippet}"
  [[ -f "${backup_dir}/fw-auth-nocache.${stamp}" ]] && cp -a "${backup_dir}/fw-auth-nocache.${stamp}" "${auth_snippet}"
  nginx -t
  echo "NGINX validation failed; previous snippets restored." >&2
  exit 1
fi
