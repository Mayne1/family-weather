# Family Weather widgets — current Android build 15

The current app design is unchanged. Redesign PR #5 is parked and is not included.

## iPhone

WidgetKit extension with circular, rectangular and inline Lock Screen families,
plus a small Home Screen widget. Requires iOS 17 for widgets; the main app still
targets iOS 15. Add Family Weather in the system widget picker, edit the widget,
and search/select a city. Default city is explicitly Stockton, CA. Each widget
has its own city; this does not change the location selected inside the app.
Tapping opens Family Weather through `familyweather://home`.

The extension fetches the same public `/api/weather/home` API as the app.
Refresh requested about every 30 minutes with jitter; Apple controls the actual
schedule. Cached weather is marked saved after network failure. Entries expire
after two hours and show no current temperature until refreshed. No accounts,
event names, or guest information appear on the Lock Screen. No App Groups or
additional paid entitlements are introduced. Physical iPhone installation still
requires signing, as with the previous build.

## Android

Resizable weather widget, with Home Screen and keyguard category support.
Actual Lock Screen placement depends on Android version and manufacturer widget
host support; availability on every Android phone is not promised. Select a city
from search results during setup; tap its name to change it later. Tap the rest
to open the app. Minimum advertised size is 3 × 3 cells.

Network work runs through JobScheduler, not inside the broadcast receiver.
Widget refreshes request a 30-minute interval; Android may delay them. The widget
shows a fetched time, saved-data state on failures and withholds values older
than two hours when rendered. No background location permission is needed.

## Verification and deployment

The current Android app on Mayne's phone is the widget-enabled package
`com.thefamilyweather.app.widgetpreview`. Build 15 deliberately keeps that exact
package identity and the stable repository test-signing certificate so it updates
the installed widget app rather than installing either retired look-alike package.
The build workflow rejects the artifact unless the package is `widgetpreview`,
the version code is 15, and the version is 2.1.0. It also verifies the packaged
certificate and both native widget definitions before publishing the APK.

The retired `com.thefamilyweather.app` and
`com.thefamilyweather.app.nighttest` packages are not current release targets.
Website deployment is unnecessary for this Android update because it continues
to use the existing public and authenticated APIs.

Physical-device widget placement and background refresh timing still require
device testing after installation.

## Health-check finding

November 1 live checks: homepage, Today and How It Works return HTTP 200.
Stockton home weather returns NWS observations and forecasts, and the planner
returns live MET Norway advice including The Eye. AQI can legitimately be null.
London/Tokyo home requests fall back to `source: family-weather`, with no current
observation timestamp and UTC timezone even for Tokyo. This fallback's provenance
and timezone need investigation before calling international home weather ready.
Widgets currently reject unverified `family-weather` forecast responses and show
unavailable/saved data instead of presenting them as verified local weather.
No server weather-provider configuration was changed by the widget work.

Current temperature additionally requires a parseable observation timestamp less
than two hours old. Unstamped backend current values are withheld even when
a verified forecast is available. A valid 0°F observation remains valid.

## Build 12 — screenshot feedback

- Fixed clear weather code 800 incorrectly selecting the cloudy plate (`>=700`
  previously also matched 800). One tested mood selector now handles day/night
  and keeps rain/storm/snow scenes during the night. Main layout/CSS unchanged.
- Replaced Capacitor placeholder launcher artwork with the green bars-and-dot
  mark from Mayne’s reference. Vector masters are in `branding/`.
- Added a separate **Announcements & RSVPs** widget on both platforms. Counts
  include announcement totals/replies and invitation yes/maybe/no totals. They
  are totals, not unread counts. Large accounts show a partial marker.
- Sign in to the test app to sync. Uses existing owner-only APIs. No passwords,
  authentication tokens, guest names, or message text are sent to widget storage.
  Sign-out/account changes clear the prior snapshot. Fetch failures preserve
  its original checked time rather than publish false zero counts.
- **Refresh limit:** this version syncs on opening/resuming the app and every
  five minutes while visible. It does not fetch new account replies while the
  app remains closed. Native widgets display a saved snapshot/checked time;
  after a day they request an app refresh. Independent push/background account
  refresh is still outstanding. Weather widgets continue their separate schedule.
- iPhone account widget sharing uses App Group `group.com.thefamilyweather.app`
  on the app and extension. Signing/provisioning must include this capability.
  The earlier build-11 statement about no shared entitlements applies to the
  weather-only build, not this account summary widget.
- Android build 12 uses the same separate widget-test package/key as build 11,
  allowing an update without removing the main app or its saved data.


### Test-signing correction

The build-11 widget test APK was signed with an ephemeral default Android debug
key, despite the workflow restoring a key under HOME. Build 12 explicitly binds
its widgetTest signing configuration to a decoded repository test keystore in
`android/family-weather-widget-test.keystore`. CI verifies the packaged signer
fingerprint before publishing. That keystore is for public test builds only.

The installed build-11 **Family Weather Widgets Test** must be removed once
before this corrected build can install. Keep the original Family Weather app.
Removing only the test app clears its local login/location/widget placement;
server-side events, announcements and replies remain in the account. Subsequent
widget-test builds must retain the fixed certificate to update in place.

## Build 13 — delete saved events in the app

My Events now has a Delete event action on every card and inside the event
workspace. The inline confirmation names the event and warns that invitations
and RSVP answers are removed. Cancel sends no request. The action refreshes the
signed-in session, uses the existing authenticated DELETE /api/events/:id route,
blocks duplicate taps, retains the event after a failed request, and removes only
the confirmed event after a successful response. Account changes prevent the
request. Response widgets are asked to refresh after deletion.

Verified with rendered React interaction checks: cancel, correct event/fresh
bearer token, duplicate submission, failed-request retry, account switch, and
workspace-to-list success. No real user event was deleted during testing.

## Build 14 — compact event delete control

The new event wrapper inherited the broad `.nativeList article` two-column grid,
which squeezed the event card and stretched its delete sibling to full height.
Event wrappers now explicitly use block layout. A 44 × 44 px trash icon sits in
the card’s top-right corner, with a named accessible label and the same existing
confirmation. The title reserves space for the icon. A browser check verifies
card/control bounds, page overflow, cancel and confirmed deletion at phone sizes
and captures synthetic-data screenshots for inspection. No real records are used.

## Build 15 — one current Android package

Build 15 carries the website's shared announcement design catalog into the
widget-enabled app while retaining the weather widget, Announcements & RSVPs
widget, compact event deletion, and current launcher artwork. The package,
version, certificate, widgets, and shared design source are covered by automated
regression checks so an APK from either retired package cannot be published as
the current download again.
