"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

// Load the real Next route and TypeScript helpers in this isolated test process.
const load = Module._load;
Module._load = function (name, ...args) {
  if (name === "server-only") return {};
  return load.call(this, name, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  module._compile(output.outputText, filename);
};
const { NextRequest } = require("next/server");
const { POST } = require("../app/api/weather/plan/route.ts");
const { todayPlannerHref, handedOffLocation } = require("../app/lib/todayHandoff.ts");
const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const json = (body, status = 200) => Response.json(body, { status });

for (const place of [
  { label: "Stockton, CA", lat: 37.9177, lon: -121.3123, code: "US", country: "United States" },
  { label: "Sacramento, CA", lat: 38.5816, lon: -121.4944, code: "US", country: "United States" },
  { label: "London", lat: 51.5074, lon: -0.1278, code: "GB", country: "United Kingdom" },
]) {
  test(`Today handoff reaches the real planner provider route: ${place.label}`, async (t) => {
    const urls = [];
    t.mock.method(global, "fetch", async (input) => {
      const url = new URL(String(input));
      urls.push(url);
      if (url.hostname === "nominatim.openstreetmap.org") {
        assert.equal(url.pathname, "/reverse");
        assert.equal(Number(url.searchParams.get("lat")), place.lat);
        assert.equal(Number(url.searchParams.get("lon")), place.lon);
        // Reverse features can have different coordinates. Only use metadata.
        return json({ lat: "0", lon: "0", address: { country_code: place.code.toLowerCase(), country: place.country } });
      }
      if (url.pathname.startsWith("/points/")) return json({ properties: { forecast: "https://api.weather.gov/test/daily", forecastHourly: "https://api.weather.gov/test/hourly" } });
      if (url.hostname === "api.weather.gov") return json({ properties: { periods: [{ startTime: `${date}T12:00:00+00:00`, endTime: `${date}T13:00:00+00:00`, isDaytime: true, temperature: 70, probabilityOfPrecipitation: { value: 0 }, windSpeed: "2 mph", shortForecast: "Sunny" }] } });
      if (url.hostname === "api.met.no") return json({ properties: { timeseries: [{ time: `${date}T12:00:00Z`, data: { instant: { details: { air_temperature: 20, wind_speed: 1, relative_humidity: 60 } }, next_1_hours: { summary: { symbol_code: "clearsky_day" }, details: { precipitation_amount: 0 } } } }] } });
      throw new Error(`Unexpected provider: ${url.hostname}`);
    });
    const params = new URL(todayPlannerHref(date, place), "https://thefamilyweather.com").searchParams;
    const resolvedLocation = handedOffLocation(params.get("location"), params.get("lat"), params.get("lon"));
    const response = await POST(new NextRequest("https://thefamilyweather.com/api/weather/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity: "yard work", location: params.get("location"), date: params.get("date"), space: "outdoor", resolvedLocation }),
    }));
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.resolvedLocation.countryCode, place.code);
    assert.equal(result.resolvedLocation.country, place.country);
    assert.equal(result.resolvedLocation.lat, place.lat);
    assert.equal(result.resolvedLocation.lon, place.lon);
    assert.equal(result.day.date, date);
    assert.equal(result.source, place.code === "US" ? "nws" : "met-norway");
    assert.equal(urls.some(url => url.hostname === "api.weather.gov"), place.code === "US");
    assert.equal(urls.some(url => url.hostname === "api.met.no"), place.code !== "US");
  });
}

test("unresolved country fails explicitly without choosing an incorrect weather provider", async (t) => {
  const urls = [];
  t.mock.method(global, "fetch", async (input) => {
    urls.push(new URL(String(input)));
    return json({ error: "Unable to geocode" });
  });
  const resolvedLocation = handedOffLocation("Your location", "0", "0");
  const response = await POST(new NextRequest("https://thefamilyweather.com/api/weather/plan", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: "Your location", date, resolvedLocation }),
  }));
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /verify this location's country/);
  assert.deepEqual(urls.map(url => url.hostname), ["nominatim.openstreetmap.org"]);
});
