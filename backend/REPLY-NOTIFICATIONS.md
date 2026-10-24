# Reply notifications

This release is based on the pre-advertising-change commit. Do not deploy the separate advertising branch to obtain notifications.

## Behavior

Organizers see “Notify me when someone responds” in Announcements and event management. Enabling it subscribes that browser/device to future responses to all announcements and invitations owned by the signed-in account. No recipient account, phone number, SMS credits or email delivery is involved. A separate permission grant is required on each device. The off button removes that device's server subscription and pending deliveries.

On supported iPhones/iPads, add Family Weather to the Home Screen, open it from that icon, sign in, then enable notifications. Android and desktop browsers use their native notification permission prompt. Lock-screen visibility and sounds follow the device's notification and Focus settings.

Notifications use generic text so family messages and event titles aren't exposed on the lock screen. Tapping opens the relevant announcement manager or event page; existing authentication and ownership checks still apply. A badge indicator is requested where supported, then cleared when the notification is opened. This is a notification feature, not a native home-screen widget or an unread-count inbox.

## Architecture

- A manifest and two PNG icons support Home Screen installation.
- The service worker handles push and notification clicks only. It does not intercept requests or cache private pages, weather, or tokens.
- Authenticated subscription endpoints store a push endpoint and browser encryption keys per owner. No VAPID private key reaches the browser. Known browser push-service hosts are allowlisted to prevent arbitrary server-side HTTP destinations.
- Announcement replies and both invitation RSVP paths enqueue deliveries in the same transaction as saving the response. Only currently subscribed devices belonging to the owner receive jobs.
- The worker claims up to ten jobs with PostgreSQL row locks, polls every five seconds, and performs network sends outside response requests. Temporary failures retry with backoff. Expired subscriptions (404/410) and their jobs are removed; jobs expire after a day or ten attempts. Jobs survive server restarts. Provider delivery is at-least-once; stable notification tags reduce duplicate visible alerts after a crash.
- No notifications are generated for historical replies. Turning notifications off removes pending jobs for that device.

## Deployment

Run from the frontend checkout of `codex/reply-notifications`:

```bash
npm ci && npm test && npm run build &&
bash backend/install-notifications-on-vps.sh &&
pm2 restart family-weather-frontend --update-env && pm2 save
```

The installer validates the expected server mount, backs up server/routes, installs pinned `web-push@3.6.7` in the API app, creates additive database tables, and generates VAPID keys in the API .env only if no existing pair is present. Keys are never printed; the .env is mode 0600. Keep these keys stable across deployments. It installs the subscription router, queue worker and response hooks, then restarts the API with a rollback of server/routes on service restart failure. An older response-route installer must not overwrite these hooks.

Frontend: `/var/www/family-weather-frontend`; API: `/home/mayne/apps/family-weather-api`; API systemd service: `family-weather-api.service`.

## Verification

Automated coverage includes authenticated and owner-scoped subscription management, private-key non-disclosure, unsafe endpoint rejection, announcement-owner routing, email/shared RSVP delivery enqueueing, response updates, unsubscribe cascading, retry/expired-device behavior, service-worker display/badge, and safe click destinations. Backend tests use pg-mem; push delivery and worker browser APIs are mocked. Existing app tests and a production build must pass. Production PostgreSQL worker claiming and physical device delivery require deployment verification.

After deployment: enable on an organizer's phone, lock the phone, submit a new announcement reply from a second device, tap the alert and check the correct reply opens. Repeat with an invitation RSVP, then disable notifications and confirm a subsequent reply produces no alert. Test one iPhone Home Screen app and one Android browser. Check that existing sharing and RSVP still work without enabling notifications.

References: https://webkit.org/blog/13878/ and https://github.com/web-push-libs/web-push
