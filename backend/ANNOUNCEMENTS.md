# Free announcements

Creators use `/announcements`; recipients open `/a/<random-id>` without an account.
Creators copy and share the link themselves. Named replies are private to the
creator. Anyone holding a link can read or forward it. Closing an announcement
disables public reading and replies. The pages are noindex and do not load ads.

## Deployment

Build the frontend, then run `bash backend/install-announcements-on-vps.sh` and
restart the frontend. The installer backs up the current backend, validates its
insertion points, installs the announcement router and creates the two free
announcement tables if necessary. Existing announcements and replies are preserved.

## Verification

`node --test backend/announcements-integration.test.js` covers creation, public
reading/replies, creator-only management, closing and rejection of removed routes.
The tests use an in-memory PostgreSQL emulator, not a live production database.
