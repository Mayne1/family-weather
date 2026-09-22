"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const page = fs.readFileSync(path.join(__dirname, "..", "app", "design-preview", "HomePreview.tsx"), "utf8");

test("homepage does not silently replace its city with unconfirmed device coordinates", () => {
  assert.match(page, /HOME_LOCATION_STORAGE_KEY = "family-weather-home-location-v2"/);
  const initialLocationFlow = page.slice(page.indexOf("useEffect"), page.indexOf("const useCurrentLocation"));
  assert.match(initialLocationFlow, /localStorage\.getItem\(HOME_LOCATION_STORAGE_KEY\)/);
  assert.doesNotMatch(initialLocationFlow, /navigator\.geolocation/);
});

test("device location remains available as an explicit visitor action", () => {
  const explicitLocationFlow = page.slice(page.indexOf("const useCurrentLocation"));

  assert.match(explicitLocationFlow, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(explicitLocationFlow, /localStorage\.setItem\(HOME_LOCATION_STORAGE_KEY/);
  assert.match(page, /onClick=\{useCurrentLocation\}/);
});
