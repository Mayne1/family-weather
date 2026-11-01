# Family Weather widgets — build 11

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
to open the app. Minimum advertised size is 3 × 2 cells.

Network work runs through JobScheduler, not inside the broadcast receiver.
Widget refreshes request a 30-minute interval; Android may delay them. The widget
shows a fetched time, saved-data state on failures and withholds values older
than two hours when rendered. No background location permission is needed.

## Verification and deployment

The Android workflow builds an APK with the existing stable test-signing key.
The iOS workflows compile device and simulator builds and assert the WidgetKit
extension is embedded. Build numbers match at 11, marketing version 2.0.
Do not merge unless native builds pass. Physical-device widget placement and
background refresh timing still need testing. Website deployment is unnecessary
for these widgets because they use existing endpoints.
