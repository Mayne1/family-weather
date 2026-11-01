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

The iOS preview and device-test GitHub Actions workflows build on macOS.
It rebuilds the same `mobile/src` screens used by Android, synchronizes the
iOS plugins and bundled assets, and checks the version and build number
against `android/app/build.gradle`.

The preview workflow compiles and launches an iPhone simulator app and saves
its screenshot. Download its `family-weather-ios-test` artifact for:

- `Family-Weather-iPhone.png`: the app running in the iPhone simulator.
- `Family-Weather-iOS-Simulator.zip`: the simulator app, for a Mac simulator.
- Simulator build logs.

The independent device workflow builds the Debug configuration, matching the
Android APK's testing stage, without keeping a simulator running. Its
`family-weather-ios-device-debug` artifact contains device build logs and
`Family-Weather-iOS-v10-unsigned.ipa`. This IPA needs Apple signing before
installation; it is not directly installable or TestFlight-ready.

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
