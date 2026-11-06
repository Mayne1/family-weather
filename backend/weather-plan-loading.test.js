'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(id, ...args) {
  return id === 'server-only' ? {} : originalLoad.call(this, id, ...args);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(
  fs.readFileSync(file, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText, file);
const { NextRequest } = require('next/server');
const { POST } = require('../app/api/weather/plan/route.ts');
Module._load = originalLoad;

const date = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const reply = (data, status = 200) => Response.json(data, { status });

function request(lat, activity = 'family cookout', ip = '198.51.100.20') {
  return new NextRequest('https://thefamilyweather.com/api/weather/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({
      activity,
      date: date(),
      space: 'outdoor',
      location: 'Test City, CA',
      resolvedLocation: {
        id: `fixture-${lat}`,
        input: 'Test City, CA',
        name: 'Test City',
        label: 'Test City, CA',
        lat,
        lon: -121.29,
        countryCode: 'US',
        country: 'United States',
        admin1: 'California',
        locality: 'Test City',
        postalCode: '',
        type: 'city',
        provider: 'family-weather',
        score: 1,
      },
    }),
  });
}

function successfulProvider() {
  const selectedDate = date();
  const dailyPeriods = [
    { startTime: `${selectedDate}T06:00:00-08:00`, endTime: `${selectedDate}T18:00:00-08:00`, isDaytime: true, temperature: 70, probabilityOfPrecipitation: { value: 5 }, relativeHumidity: { value: 50 }, windSpeed: '5 mph', shortForecast: 'Sunny' },
    { startTime: `${selectedDate}T18:00:00-08:00`, endTime: `${selectedDate}T23:59:00-08:00`, isDaytime: false, temperature: 48, probabilityOfPrecipitation: { value: 5 }, relativeHumidity: { value: 60 }, windSpeed: '4 mph', shortForecast: 'Clear' },
  ];
  const hourlyPeriods = Array.from({ length: 14 }, (_, index) => ({
    startTime: `${selectedDate}T${String(index + 8).padStart(2, '0')}:00:00-08:00`,
    endTime: `${selectedDate}T${String(index + 9).padStart(2, '0')}:00:00-08:00`,
    isDaytime: index < 10,
    temperature: 64 + Math.min(index, 5),
    probabilityOfPrecipitation: { value: 5 },
    relativeHumidity: { value: 50 },
    windSpeed: '5 mph',
    shortForecast: 'Sunny',
  }));
  return async (url) => {
    const value = String(url);
    if (value.includes('/points/')) return reply({ properties: { forecast: 'https://api.weather.gov/fixture/forecast', forecastHourly: 'https://api.weather.gov/fixture/hourly', relativeLocation: { properties: { city: 'Test City', state: 'CA' } } } });
    if (value.endsWith('/fixture/forecast')) return reply({ properties: { periods: dailyPeriods } });
    if (value.endsWith('/fixture/hourly')) return reply({ properties: { periods: hourlyPeriods } });
    return reply({}, 503);
  };
}

test('planner reuses public forecast data across activities and reports its processing time', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  const provider = successfulProvider();
  global.fetch = async (...args) => { calls += 1; return provider(...args); };
  try {
    const first = await POST(request(37.951, 'family cookout'));
    assert.equal(first.status, 200);
    assert.match(first.headers.get('server-timing'), /^planner;dur=/);
    assert.equal((await first.json()).source, 'nws');
    assert.equal(calls, 3);

    const second = await POST(request(37.951, 'graduation party'));
    assert.equal(second.status, 200);
    assert.equal((await second.json()).activity, 'graduation party');
    assert.equal(calls, 3, 'a new activity at the same place and date reuses the forecast');
  } finally {
    global.fetch = originalFetch;
  }
});

test('simultaneous planner requests share one provider lookup', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  const provider = successfulProvider();
  global.fetch = async (...args) => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 15)); return provider(...args); };
  try {
    const responses = await Promise.all(Array.from({ length: 20 }, (_, index) => POST(request(37.952, `activity ${index}`, '198.51.100.21'))));
    assert.equal(calls, 3, 'twenty callers share the point, daily and hourly lookup');
    for (const response of responses) assert.equal(response.status, 200);
  } finally {
    global.fetch = originalFetch;
  }
});

test('failed planner lookups remain retryable', async () => {
  const originalFetch = global.fetch;
  let working = false;
  const provider = successfulProvider();
  global.fetch = async (...args) => working ? provider(...args) : reply({}, 503);
  try {
    const failed = await POST(request(37.953, 'picnic', '198.51.100.22'));
    assert.equal(failed.status, 502);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    working = true;
    const retried = await POST(request(37.953, 'picnic', '198.51.100.22'));
    assert.equal(retried.status, 200);
  } finally {
    global.fetch = originalFetch;
  }
});
