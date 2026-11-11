import test from "node:test";
import assert from "node:assert/strict";
import { currentWindText, handedOffLocation, todayPlannerHref } from "./todayHandoff.ts";

test("wind labels distinguish forecast, station observation, and unspecified sources", () => {
  assert.equal(currentWindText(1, "nws-grid-forecast"), "Forecast wind 1 mph.");
  assert.equal(currentWindText(2.6, "nws-observation"), "Observed wind 3 mph.");
  for (const source of [undefined, "family-weather", "open-meteo-current"]) {
    assert.equal(currentWindText(1, source), "Wind 1 mph.");
  }
  assert.equal(currentWindText(null, "nws-grid-forecast"), "Forecast wind unavailable.");
  assert.equal(currentWindText(NaN), "Wind unavailable.");
});

test("each Today handoff preserves its date and exact forecast point, including another location", () => {
  for (const weather of [
    { label: "Stockton, CA", lat: 37.9177, lon: -121.3123 },
    { label: "Sacramento, CA", lat: 38.5816, lon: -121.4944 },
    { label: "Your location", lat: 0, lon: 0 },
  ]) {
    for (const date of ["2026-11-13", "2026-11-14", "2026-11-13"]) {
      const url = new URL(todayPlannerHref(date, weather), "https://thefamilyweather.com");
      assert.equal(url.searchParams.get("date"), date);
      assert.equal(url.searchParams.get("location"), weather.label);
      const resolved = handedOffLocation(url.searchParams.get("location")!, url.searchParams.get("lat")!, url.searchParams.get("lon")!);
      assert.equal(resolved?.lat, weather.lat);
      assert.equal(resolved?.lon, weather.lon);
      assert.equal(resolved?.label, weather.label);
    }
  }
});

test("ordinary label-only planner URLs still geocode; malformed coordinates are rejected", () => {
  for (const [label, lat, lon] of [["Stockton, CA", "", ""], ["", "38", "-121"], ["x", "91", "0"], ["x", "0", "181"], ["x", "NaN", "0"]]) {
    assert.equal(handedOffLocation(label, lat, lon), null);
  }
});
