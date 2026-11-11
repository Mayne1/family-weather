import test from "node:test";
import assert from "node:assert/strict";
import { openMeteoCurrent } from "./locationCurrent.ts";

const now = Date.parse("2026-11-11T09:24:00Z");
const payload = {
  utc_offset_seconds: -28800,
  current: {
    time: "2026-11-11T01:15",
    temperature_2m: 53.4,
    apparent_temperature: 52.7,
    relative_humidity_2m: 91,
    weather_code: 0,
    wind_speed_10m: 2.6,
  },
};

test("uses the location grid and converts local provider time to UTC", () => {
  assert.deepEqual(openMeteoCurrent(payload, now), {
    temp_f: 53.4,
    feels_like_f: 52.7,
    wind_mph: 2.6,
    weather_code: 800,
    humidity_pct: 91,
    observed_at: "2026-11-11T09:15:00.000Z",
    source: "open-meteo-current",
  });
});

test("maps severe current conditions instead of reporting clear weather", () => {
  assert.equal(openMeteoCurrent({ ...payload, current: { ...payload.current, weather_code: 95 } }, now)?.weather_code, 211);
});

test("rejects stale, future, invalid, and physically impossible readings", () => {
  assert.equal(openMeteoCurrent({ ...payload, current: { ...payload.current, time: "2026-11-10T22:00" } }, now), null);
  assert.equal(openMeteoCurrent({ ...payload, current: { ...payload.current, time: "2026-11-11T01:30" } }, now), null);
  assert.equal(openMeteoCurrent({ ...payload, current: { ...payload.current, temperature_2m: null } }, now), null);
  assert.equal(openMeteoCurrent({ ...payload, current: { ...payload.current, temperature_2m: 200 } }, now), null);
});
