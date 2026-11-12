import test from "node:test";
import assert from "node:assert/strict";
import { GOOGLE_ADS_CONSENT_KEY, GOOGLE_ADS_SCRIPT_ID } from "./googleAds.ts";
import { EVENT_CONVERSION_PENDING_KEY, consumePendingConversion, eventConversionDestination, continueAfterEventSave, finishEventConversion } from "./googleAdsEventConversion.ts";

const base = "https://thefamilyweather.com";
const label = "TestLabelForUnitTestsOnly";
const destination = `AW-951353708/${label}`;
const transactionId = "12345678-1234-4234-8234-123456789abc";
const record = () => ({ destination, transactionId, returnPath: "/events/123/invitation", createdAt: Date.now() });

test("a real form-action label is required; the known About Us action is rejected", () => {
  for (const invalid of [undefined, "", "ACTUAL_LABEL/extra", "AW-951353708/label", "short", "-NJ0CM6qjrYdEOyC0sUD", "HVkECKnQ2rYdEOyC0sUD"]) assert.equal(eventConversionDestination(invalid), null);
  assert.equal(eventConversionDestination(label), destination);
});

test("pending conversions are short lived, one time and contain only validated destinations", () => {
  let raw: string | null = JSON.stringify(record());
  const storage = { getItem: () => raw, removeItem: () => { raw = null; } };
  assert.equal(consumePendingConversion(storage, destination)?.transactionId, transactionId);
  assert.equal(consumePendingConversion(storage, destination), null);
  for (const changes of [{ destination: "AW-other/action" }, { transactionId: "person@example.com" }, { returnPath: "https://example.com" }, { returnPath: "/events/123/invitation?token=secret" }, { createdAt: Date.now() - 120001 }, { createdAt: Date.now() + 10000 }]) {
    raw = JSON.stringify({ ...record(), ...changes });
    assert.equal(consumePendingConversion(storage, destination), null);
    assert.equal(raw, null);
  }
  assert.equal(consumePendingConversion({ getItem: () => { throw new Error("denied"); }, removeItem: () => {} }, destination), null);
});

test("success bridge reports once with consent, no private values, and always continues", () => {
  const original = Object.fromEntries(["window", "document", "navigator", "setTimeout", "clearTimeout"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let consent: string | null = JSON.stringify({ choice: "granted", updatedAt: Date.now() });
  let pending: string | null = null;
  const navigation: string[] = [];
  const scripts: Record<string, unknown>[] = [];
  const metas: Record<string, unknown>[] = [];
  let timer: (() => void) | undefined;
  let timerDelay = 0;
  const listeners: Record<string, () => void> = {};
  const browser = {
    location: { href: `${base}/create-event?location=PrivateHome`, replace: (path: string) => navigation.push(path) },
    localStorage: { getItem: (key: string) => key === GOOGLE_ADS_CONSENT_KEY ? consent : null },
    sessionStorage: { getItem: () => pending, setItem: (key: string, value: string) => { assert.equal(key, EVENT_CONVERSION_PENDING_KEY); pending = value; }, removeItem: () => { pending = null; } },
    dataLayer: [] as unknown[],
    familyWeatherGoogleAdsLoaded: false,
  };
  const doc = {
    referrer: "", querySelectorAll: () => [], querySelector: () => null,
    getElementById: () => scripts.find(script => script.id === GOOGLE_ADS_SCRIPT_ID),
    createElement: (tag: string) => ({ tag, addEventListener: (name: string, callback: () => void) => { listeners[name] = callback; } }),
    head: { appendChild: (element: Record<string, unknown>) => { if (element.tag === "script") scripts.push(element); else metas.push(element); } },
  };
  const nav = { globalPrivacyControl: false };
  const calls = () => browser.dataLayer.map(value => Array.from(value as ArrayLike<unknown>));
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: nav });
    Object.defineProperty(globalThis, "setTimeout", { configurable: true, value: (fn: () => void, delay: number) => { timer = fn; timerDelay = delay; return 1; } });
    Object.defineProperty(globalThis, "clearTimeout", { configurable: true, value: () => {} });

    continueAfterEventSave("123", undefined);
    assert.equal(navigation.pop(), "/events/123/invitation");
    assert.equal(pending, null);
    continueAfterEventSave("123", label);
    assert.equal(navigation.pop(), "/event-saved");
    assert.equal(scripts.length, 0, "no tag loads on the private form");
    assert.equal(metas.at(-1)?.content, "no-referrer");
    browser.location.href = base + "/event-saved";
    finishEventConversion(label);
    assert.equal(pending, null);
    assert.equal(scripts.length, 1);
    assert.equal(timerDelay, 2500, "cold script gets a separate load deadline");
    listeners.load();
    assert.equal(timerDelay, 1500, "conversion gets its callback window after load");
    const conversions = calls().filter(call => call[0] === "event" && call[1] === "conversion");
    assert.equal(conversions.length, 1);
    const parameters = conversions[0][2] as Record<string, unknown>;
    assert.deepEqual(Object.keys(parameters).sort(), ["event_callback", "event_timeout", "send_to", "transaction_id"]);
    assert.equal(parameters.send_to, destination);
    assert.notEqual(parameters.transaction_id, "123");
    assert.equal(JSON.stringify(calls()).includes("PrivateHome"), false);
    assert.equal(JSON.stringify(calls()).includes("/events/123"), false);
    (parameters.event_callback as () => void)();
    timer?.();
    assert.deepEqual(navigation, ["/events/123/invitation"]);
    finishEventConversion(label);
    assert.equal(calls().filter(call => call[1] === "conversion").length, 1);
    assert.equal(navigation.pop(), "/events");

    for (const scenario of ["denied", "missing", "gpc", "preview", "query", "private-referrer"]) {
      consent = scenario === "missing" ? null : JSON.stringify({ choice: scenario === "denied" ? "denied" : "granted", updatedAt: Date.now() });
      nav.globalPrivacyControl = scenario === "gpc";
      browser.location.href = scenario === "preview" ? "https://preview.example.com/event-saved" : base + "/event-saved" + (scenario === "query" ? "?email=private@example.com" : "");
      browser.familyWeatherGoogleAdsLoaded = false;
      doc.referrer = scenario === "private-referrer" ? base + "/create-event?location=PrivateHome" : "";
      pending = JSON.stringify(record());
      finishEventConversion(label);
      assert.equal(calls().filter(call => call[1] === "conversion").length, 1, scenario);
      assert.equal(scripts.length, 1, scenario);
    }
    for (const failure of ["load-error", "load-timeout"]) {
      consent = JSON.stringify({ choice: "granted", updatedAt: Date.now() });
      nav.globalPrivacyControl = false;
      browser.location.href = base + "/event-saved";
      browser.familyWeatherGoogleAdsLoaded = false;
      scripts.length = 0;
      doc.referrer = "";
      pending = JSON.stringify(record());
      finishEventConversion(label);
      if (failure === "load-error") listeners.error(); else timer?.();
      assert.equal(navigation.at(-1), "/events/123/invitation", failure);
      assert.equal(pending, null, failure);
    }
  } finally {
    for (const key of Object.keys(original)) {
      const descriptor = original[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
