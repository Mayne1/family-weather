import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncTtlCache } from './asyncTtlCache.ts';
import { fetchHomeWeather } from './homeWeatherClient.ts';

test('server reuses simultaneous requests, expires readings and separates places', async () => {
  let now = 0, calls = 0;
  const cache = createAsyncTtlCache<number>({ ttlMs: 120, maxEntries: 2, now: () => now });
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all(Array.from({length: 20}, () => cache('Stockton', load, () => true))), Array(20).fill(1));
  assert.equal(await cache('Stockton', load, () => true), 1);
  assert.equal(await cache('London', load, () => true), 2);
  now = 120;
  assert.equal(await cache('Stockton', load, () => true), 3);
});

test('server evicts old places and retries failures instead of caching them', async () => {
  const cache = createAsyncTtlCache<number>({ ttlMs: 1000, maxEntries: 2 });
  let calls = 0;
  const load = async () => ++calls;
  for (const place of ['one','two','three']) await cache(place, load, () => true);
  assert.equal(await cache('one', load, () => true), 4);
  await assert.rejects(cache('failed', async () => { throw Error('provider offline'); }, () => true));
  assert.equal(await cache('failed', load, () => true), 5);
  assert.equal(await cache('partial', load, () => false), 6);
  assert.equal(await cache('partial', load, () => false), 7);
});

test('browser shares requests across pages, expires snapshots and tolerates blocked storage', async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let now = originalNow(), calls = 0, fail = false;
  Date.now = () => now;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw Error('storage blocked'); } });
  globalThis.fetch = async () => {
    calls++;
    return Response.json(fail ? {ok:false} : {ok:true,label:'fixture',fetched_at:new Date(now).toISOString()}, {status: fail ? 502 : 200});
  };
  try {
    await Promise.all(Array.from({length: 10}, () => fetchHomeWeather('?lon=2&lat=1')));
    await fetchHomeWeather('?lat=1&lon=2');
    assert.equal(calls, 1, 'same reading and normalized coordinates reuse work');
    await fetchHomeWeather('?lat=3&lon=4');
    assert.equal(calls, 2, 'different location never receives another place’s cache');
    now += 120001;
    await fetchHomeWeather('?lat=1&lon=2');
    assert.equal(calls, 3, 'expired reading refreshes');
    fail = true;
    await assert.rejects(fetchHomeWeather('?lat=5&lon=6'));
    fail = false;
    await fetchHomeWeather('?lat=5&lon=6');
    assert.equal(calls, 5, 'failed requests can be retried');
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('browser restores a recent snapshot after reload without extending its original age', async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let now = originalNow(), calls = 0;
  Date.now = () => now;
  const data = {ok:true,label:'restored',fetched_at:new Date(now - 119000).toISOString()};
  const storage = new Map([['family-weather-snapshots-v1', JSON.stringify([
    ['/api/weather/home?lat=10&lon=11', {data, expiresAt:now+1000}]
  ])]]);
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  globalThis.fetch = async () => {calls++;return Response.json({ok:true,label:'fresh',fetched_at:new Date(now).toISOString()});};
  try {
    assert.equal((await fetchHomeWeather<{label:string}>('?lat=10&lon=11')).label, 'restored');
    assert.equal(calls,0);
    now += 1001;
    assert.equal((await fetchHomeWeather<{label:string}>('?lat=10&lon=11')).label, 'fresh');
    assert.equal(calls,1);
    storage.set('family-weather-snapshots-v1','not valid JSON');
    await fetchHomeWeather('?lat=12&lon=13');
    assert.equal(calls,2);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});

test('browser retries a refining current reading and force refresh bypasses its saved snapshot', async () => {
  const originalFetch = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let calls = 0;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw Error('storage blocked'); } });
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ok:true,label:`reading-${calls}`,refining_current:calls===1,fetched_at:new Date().toISOString()});
  };
  try {
    assert.equal((await fetchHomeWeather<{label:string}>('?lat=14&lon=15')).label,'reading-1');
    assert.equal((await fetchHomeWeather<{label:string}>('?lat=14&lon=15')).label,'reading-2');
    assert.equal((await fetchHomeWeather<{label:string}>('?lat=14&lon=15')).label,'reading-2');
    assert.equal((await fetchHomeWeather<{label:string}>('?lat=14&lon=15',{force:true})).label,'reading-3');
    assert.equal(calls,3);
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
