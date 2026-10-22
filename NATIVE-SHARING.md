# Native invitation and announcement sharing

Existing behavior: event management creates/reuses an invitation URL; announcement management exposes its public URL. Both previously only copied the URL through the Clipboard API. Neither used navigator.share().

Changes: both use NativeShare. Supported browsers offer Share Invitation or Share Announcement with the title, a short message, and the existing unique public URL. The title also appears in the text because some receiving applications ignore the separate title field. The user's OS determines which installed messaging applications appear. No recipient selection, contacts request, delivery request, or new server storage happens in this feature.

Copy Invitation Link / Copy Announcement Link remains available, including on unsupported desktops, with confirmation only after clipboard success. A denied clipboard request displays a selectable URL instead. Cancelling the native menu is quiet. A blocked sharing API falls back to the copy button. Native sharing runs directly from the click, after link creation has already completed, preserving browser user activation. No delivery confirmation is claimed.

Existing public invitation and announcement URLs, templates, response forms, event management, email delivery and payments are unchanged. No integration or payment code is removed by this change. This checkout already contained the previously requested SMS removal; this change does not restore it.

## Automated validation

- `node --experimental-strip-types --test app/lib/nativeShare.test.ts`: 5 passed (both payloads, immediate native call, unsupported browser, cancellation, blocked API).
- `node --test backend/announcements-integration.test.js backend/invitation-event-id-joins.test.js backend/signature-invitations.test.js`: 5 passed, including public announcement reading/replying and private management, invitation design preservation and joins.
- `npm run build`: passed, including TypeScript and production compilation.
- `git diff --check`: passed.

## Remaining device acceptance checks before production

Real iPhone, Android and desktop browser interaction has not been tested in this environment. API stubs are not device testing. Use an HTTPS staging environment and a test event/announcement:

1. iPhone Safari and Android Chrome: generate/select the link, tap Share, choose Messages, email and WhatsApp when installed; verify title, message and URL in the composer. Cancel once and ensure no error or automatic send.
2. Desktop without native sharing: copy the link, paste it, confirm exact URL and copy confirmation. If clipboard permission is denied, confirm manual selection works.
3. Open each shared URL on a separate signed-out device. View the invitation and submit an RSVP; view the announcement and submit a reply. Confirm the owner sees each response. No messages should be sent to real recipients without authorization.
4. Confirm existing email invitation and event purchase controls remain present.

No production deployment is authorized by this change. Complete device checks and obtain approval before deploying.
