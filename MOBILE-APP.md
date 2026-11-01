# Family Weather mobile workspace

Family Weather uses one Capacitor workspace for iOS and Android. The existing
Next.js site and API remain the source of truth while native-only features such
as widgets, store push notifications, deep links, and device integrations are
added to the generated platform projects.

## Local development

The checked-in `mobile-shell` is a safe local entry point. To load a running
Family Weather web build inside the native container during development:

```bash
CAPACITOR_SERVER_URL=http://YOUR-LAN-IP:3000 npm run mobile:sync
```

Use an HTTPS production URL only for device integration testing. The released
app must include enough local/native functionality to be useful without being
only a remote website wrapper.

## Commands

```bash
npm run mobile:sync
npm run mobile:ios
npm run mobile:android
```

Opening and compiling iOS requires macOS with Xcode. Android uses Android
Studio. Store signing identities are intentionally not committed to Git.

## iPhone test builds alongside Android

The `Family Weather iOS test build` GitHub Actions workflow builds on macOS.
It rebuilds the same `mobile/src` screens used by Android, synchronizes the
iOS plugins and bundled assets, and checks the version and build number
against `android/app/build.gradle`.

The workflow compiles and launches an iPhone simulator app and saves its
screenshot. It also compiles an unsigned device archive and IPA. Download
the `family-weather-ios-test` artifact from the workflow run for:

- `Family-Weather-iPhone.png`: the app running in the iPhone simulator.
- `Family-Weather-iOS-Simulator.zip`: the simulator app, for a Mac simulator.
- `Family-Weather-iOS-unsigned.ipa`: device code requiring Apple signing
  before installation. It is not directly installable or TestFlight-ready.
- Simulator and device build logs.

On-device testing and TestFlight distribution require a separate signed
build using the owner's Apple development team. No signing credentials are
required by the compilation and simulator workflow or stored in the repo.

The app uses the shared production API at `https://thefamilyweather.com`.
Both platforms render the planner's returned advice, including The Eye,
without duplicating weather scoring in either native project.

## Native roadmap

1. App shell, authenticated session, deep links, and safe-area navigation.
2. Native APNs/FCM reply and RSVP notifications.
3. RSVP and announcement reply home-screen/lock-screen widgets.
4. Weather-window widget and active-plan experience.
5. Store billing decision, privacy declarations, screenshots, and submission.
