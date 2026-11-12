import test from "node:test";
import assert from "node:assert/strict";
import {
  GOOGLE_ADS_ID, GOOGLE_ADS_SCRIPT_ID, GOOGLE_ADS_CONSENT_KEY,
  readGoogleAdsConsent, writeGoogleAdsConsent, supportsGoogleAdsPage,
  requiresGoogleAdsDocumentNavigation, loadGoogleAdsMeasurement, revokeGoogleAdsMeasurement,
} from "./googleAds.ts";

const base = "https://thefamilyweather.com";
const url = (path: string) => new URL(path, base);

test("only public URLs without visitor details qualify for Google Ads", () => {
  for (const path of ["/", "/today", "/plan", "/about", "/pricing", "/weather-stories", "/weather-stories/rainy-day", "/?gclid=Abc_123-xyz", "/?gbraid=123&wbraid=456&gad_source=1"]) assert.equal(supportsGoogleAdsPage(url(path)), true, path);
  for (const path of ["/events", "/events/123", "/create-event", "/invitation/secret", "/rsvp.html?token=secret", "/a/private", "/announcements", "/family", "/privacy", "/terms", "/plan?location=Home", "/?email=person@example.com", "/?gclid=person@example.com", "/?account=signin", "/#secret", "/weather-stories-private", "/weather-stories/one/two", "/?unknown=x"]) assert.equal(supportsGoogleAdsPage(url(path)), false, path);
});

test("consent is explicit, expires after 180 days and fails closed", () => {
  const now = Date.now();
  const read = (value: string | null) => readGoogleAdsConsent({ getItem: () => value }, now);
  assert.equal(read(null), null);
  assert.equal(read("bad-json"), null);
  assert.equal(read('{"choice":"granted"}'), null);
  assert.equal(read(JSON.stringify({ choice: "granted", updatedAt: now + 1 })), null);
  assert.equal(read(JSON.stringify({ choice: "granted", updatedAt: now - 180 * 86400000 })), null);
  assert.equal(read(JSON.stringify({ choice: "granted", updatedAt: now })), "granted");
  assert.equal(read(JSON.stringify({ choice: "denied", updatedAt: now })), "denied");
  assert.equal(readGoogleAdsConsent({ getItem: () => { throw new Error("unavailable"); } }), null);
  assert.equal(writeGoogleAdsConsent({ setItem: () => { throw new Error("unavailable"); } }, "granted"), false);
  let saved = "";
  assert.equal(writeGoogleAdsConsent({ setItem: (key, value) => { assert.equal(key, GOOGLE_ADS_CONSENT_KEY); saved = value; } }, "denied"), true);
  assert.equal(JSON.parse(saved).choice, "denied");
});

test("full documents isolate private pages and tagged navigation", () => {
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/"), url("/create-event"), false), true);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/events"), url("/"), false), true);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/"), url("/plan?location=Home"), false), true);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/"), url("/about"), false), false);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/"), url("/about"), true), true);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/events"), url("/events/123"), false), false);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/"), url("/#activity-checker"), true), false);
  assert.equal(requiresGoogleAdsDocumentNavigation(url("/"), new URL("https://example.com"), true), false);
});

test("runtime loads the supplied tag once after consent and never fabricates conversions", () => {
  const original = Object.fromEntries(["window", "document", "navigator"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let consent: string | null = null;
  let reloads = 0;
  const scripts: Array<Record<string, unknown>> = [];
  const browser = {
    location: { href: base + "/", reload: () => { reloads++; } },
    localStorage: { getItem: () => consent },
    dataLayer: [] as unknown[],
    familyWeatherGoogleAdsLoaded: false,
  };
  const doc = {
    referrer: "", getElementById: () => scripts.find(script => script.id === GOOGLE_ADS_SCRIPT_ID),
    querySelector: () => null, createElement: () => ({}),
    head: { appendChild: (script: Record<string, unknown>) => { scripts.push(script); } },
  };
  const nav = { globalPrivacyControl: false };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: nav });
    assert.equal(loadGoogleAdsMeasurement(), false);
    assert.equal(scripts.length, 0);
    consent = JSON.stringify({ choice: "denied", updatedAt: Date.now() });
    assert.equal(loadGoogleAdsMeasurement(), false);
    consent = JSON.stringify({ choice: "granted", updatedAt: Date.now() });
    for (const location of ["http://localhost:3000/", "https://preview.example.com/", base + "/invitation/secret", base + "/plan?location=Home"]) {
      browser.location.href = location;
      assert.equal(loadGoogleAdsMeasurement(), false, location);
    }
    browser.location.href = base + "/?gclid=abc123";
    nav.globalPrivacyControl = true;
    assert.equal(loadGoogleAdsMeasurement(), false);
    nav.globalPrivacyControl = false;
    doc.referrer = base + "/invitation/secret";
    assert.equal(loadGoogleAdsMeasurement(), false);
    doc.referrer = "https://www.google.com/";
    assert.equal(loadGoogleAdsMeasurement(), true);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, `https://www.googletagmanager.com/gtm.js?id=${GOOGLE_ADS_ID}`);
    assert.equal(scripts[0].async, true);
    assert.equal(scripts[0].referrerPolicy, "no-referrer");
    const calls = browser.dataLayer.map(value => Array.from(value as ArrayLike<unknown>));
    assert.deepEqual(calls.map(call => call[0]), ["consent", "set", "consent", "js"]);
    assert.equal((calls[0][2] as Record<string, string>).ad_storage, "denied");
    assert.equal((calls[2][2] as Record<string, string>).ad_personalization, "denied");
    assert.equal((calls[2][2] as Record<string, string>).ad_user_data, "granted");
    assert.equal((calls[1][1] as Record<string, string>).page_location, base + "/");
    assert.equal((calls[1][1] as Record<string, string>).page_referrer, "");
    assert.equal(JSON.stringify(calls).includes("conversion"), false);
    assert.equal(loadGoogleAdsMeasurement(), true);
    assert.equal(scripts.length, 1);
    revokeGoogleAdsMeasurement();
    assert.equal(reloads, 1);
    assert.equal((Array.from(browser.dataLayer.at(-1) as ArrayLike<unknown>)[2] as Record<string, string>).ad_storage, "denied");
  } finally {
    for (const key of ["window", "document", "navigator"]) {
      const descriptor = original[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
