# Family Weather production cutover

The Next.js frontend listens on `127.0.0.1:3001`. The existing Express weather/event API remains on `127.0.0.1:3000`.

## Required production configuration

1. Copy `.env.example` to `.env.production.local` and set the real Firebase web key.
2. Confirm the backend service still has its database and Firebase verification environment.
3. Run `bash backend/install-on-vps.sh` once to apply the additive invitation/location tables and install the protected routers.
4. Merge `deploy/nginx-family-weather.conf.example` into the existing certificate-bearing NGINX server block.
5. Validate with `nginx -t` before reload.

## Deploy and verify

```bash
cd /var/www/family-weather-frontend
git pull --ff-only origin codex/family-weather-v4-staging
npm ci
npm run build
bash backend/install-on-vps.sh
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
nginx -t && systemctl reload nginx
```

After the new legal pages are deployed, retire the old static Family Weather entry points:

```bash
sudo bash deploy/retire-legacy-site.sh
```

The script backs up the active snippets, redirects the old legal URLs to the new application, returns `410 Gone` for retired account/template pages, validates NGINX, and restores the previous snippets if validation fails.

After deployment verify the homepage, the three legal pages, a coordinate weather request, an international forecast, a future Almanac request, sign-in, event save, invitation link host, RSVP persistence, `/robots.txt`, `/sitemap.xml`, the old-legal redirects, and the retired-route responses.
