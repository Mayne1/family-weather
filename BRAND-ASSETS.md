# Canonical Family Weather artwork

The exact approved source is `public/brand/family-weather-logo.jpg` (1024 × 1024). It is the green gradient disk, ascending white bars, and yellow sun from the Family Weather Facebook page, approved November 10, 2026.

Source: https://www.facebook.com/photo/?fbid=122096128953549994&set=a.122095160391549994

Run `node scripts/generate-brand-assets.mjs` after `npm ci` to reproduce favicon, PWA/notification, Apple touch, iOS, Android launcher images, and native launch-screen variants. The script only resizes or pads the supplied image; it does not redraw it. Android adaptive icons contain the whole source inside the central 66/108 safe area. iOS receives an opaque 1024px image and applies its own mask. Launch screens preserve every original resource dimension, placing the exact source at 30% of the shorter side on a dark green background.

Web headers and the shared iOS/Android header use the same source. Social cards embed it directly without an external fetch. Native platform rendering still needs device/simulator validation after building.
