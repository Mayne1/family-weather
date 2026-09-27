import assert from "node:assert/strict";
import test from "node:test";
import { metForecast } from "./metForecast.ts";
import { weatherApiPrecipitation } from "./precipitationForecast.ts";
import type { LocationCandidate } from "./location.ts";

const geo = { lat: 18.47, lon: -77.92, label: "Montego Bay" } as LocationCandidate;
function series() {
  return Array.from({ length: 72 }, (_, hour) => ({
    time: new Date(Date.UTC(2026, 8, 27, hour)).toISOString(),
    data: {
      instant: { details: { air_temperature: 27, wind_speed: 4, relative_humidity: 60 } },
      next_1_hours: { summary: { symbol_code: "clearsky_day" }, details: { precipitation_amount: 0 } },
    },
  }));
}

test("MET uses destination calendar boundaries and preserves six-hour thunder", async (t) => {
  const rows = series();
  Object.assign(rows[9].data, { next_6_hours: { summary: { symbol_code: "rainandthunder" } } });
  t.mock.method(globalThis, "fetch", async () => Response.json({ properties: { timeseries: rows } }));
  const jamaica = await metForecast(geo, "2026-09-28", "America/Jamaica");
  assert.equal(jamaica?.hourly.length, 24);
  assert.equal(jamaica?.hourly[0].time, "2026-09-28T00:00:00");
  assert.equal(jamaica?.hourly[23].time, "2026-09-28T23:00:00");
  const storm = await metForecast(geo, "2026-09-27", "America/Jamaica");
  assert.equal(storm?.hourly.find((hour) => hour.time.includes("T07:"))?.thunderRisk, true);
  assert.equal(storm?.hourly.find((hour) => hour.time.includes("T10:"))?.thunderRisk, false);
  assert.equal(storm?.hourly[0].precipitationProbabilityPct, null);
  const lisbon = await metForecast(geo, "2026-09-28", "Europe/Lisbon");
  assert.equal(lisbon?.hourly.length, 24);
  assert.equal(lisbon?.hourly[0].time, "2026-09-28T00:00:00");
  const unknown = await metForecast(geo, "2026-09-28", "Invalid/Timezone");
  assert.equal(unknown?.hourly[0].localTimeKnown, false);
});

test("WeatherAPI preserves missing rain probability and surfaces thunder codes", async (t) => {
  const previous = process.env.WEATHERAPI_KEY;
  process.env.WEATHERAPI_KEY = "fixture-only";
  t.after(() => { if (previous === undefined) delete process.env.WEATHERAPI_KEY; else process.env.WEATHERAPI_KEY = previous; });
  t.mock.method(globalThis, "fetch", async () => Response.json({
    location: { tz_id: "America/Jamaica" },
    forecast: { forecastday: [{ date: "2026-09-28", day: { daily_chance_of_rain: 62 },
      hour: [{ time: "2026-09-28 15:00", chance_of_rain: null, precip_mm: null, condition: { code: 1276, text: "Heavy rain" } }],
    }] },
  }));
  const result = await weatherApiPrecipitation(geo, "2026-09-28");
  assert.equal(result?.hourly[0].condition, "Thunderstorms");
  assert.equal(result?.hourly[0].probabilityPct, null);
  assert.equal(result?.hourly[0].amountMm, null);
  assert.equal(result?.dayProbabilityPct, 62);
});
