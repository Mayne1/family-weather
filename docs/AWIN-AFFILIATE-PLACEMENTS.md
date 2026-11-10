# Awin affiliate placements

Separate follow-up to immutable release `501fcb521ec011eb506e9cc301e3a129996ef654`.
Do not alter the existing staged brand/timezone release or operator package.
This change is not deployed by adding these files.

## Approved configuration

- Publisher: Family Weather, Awin ID 3149251.
- Advertiser: CozySpiritStudio INTL, Awin ID 130331.
- Generated destination: https://www.awin1.com/cread.php?awinmid=130331&awinaffid=3149251&ued=https%3A%2F%2Fcozyspiritstudio.com%2F
- Program approval and link supplied by the account owner’s coordinator.
- Text-only creative: no product, discount, price, quality, or delivery claims.

## Placement and purchase scope

One labeled card appears above the public footer on home, today, planner,
weather-history and weather-stories routes. The public route allowlist excludes
legal, pricing, account, private and guest pages.

A card appears below invitation actions or below the RSVP card only after the
valid guest API response explicitly supplies `presentation: promoted`.
Loading, invalid, error, legacy, clean, unbranded and unknown states suppress it.
A guest refresh gate rechecks on mount, focus, visibility change and every 60
seconds while visible. It hides affiliate and Family Weather self-promotions
during checks and after errors or paid responses. No hidden-tab polling occurs.
Request cancellation and resolved-route checks prevent stale free-event data
from displaying a promotion while switching invitation routes.

The $1.99 purchase removes promotions from that event only. It does not buy
site-wide ad-free access. No checkout, price, webhook or entitlement logic changed.

## Privacy

The fixed URL contains only the approved publisher, advertiser and destination.
No event details, locations, guest identifiers or invitation tokens are appended.
The anchor uses `rel="sponsored noopener noreferrer"` and
`referrerPolicy="no-referrer"`. There is no Awin script, pixel, third-party image,
preconnect, automatic redirect or click analytics. Awin is contacted only when a
visitor chooses the link. The card discloses commissions, and the privacy policy
explains click attribution and event-only removal. Existing AdSense is unchanged.

## Release checks

Run `npm test`, `npx tsc --noEmit`, default `npm run build`, focused ESLint and
`git diff --check`. Full lint has existing repository errors; compare results.
Before deployment independently review the exact resulting commit and perform
mobile/desktop visual QA, keyboard focus, free/paid/unknown guest states,
interrupted navigation and RSVP completion checks. Do not buy or trigger a
conversion for testing. Do not load remote creatives or tracking scripts without
reviewing their privacy/consent requirements.

Apply this as a separate reviewed release after the existing rollout is resolved.
Follow the production operator procedure against the exact new SHA; do not reuse
an earlier staged build as though it contains this change. Ordinary release
rollback removes these cards without any database migration.
