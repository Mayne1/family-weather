import test from "node:test";
import assert from "node:assert/strict";
import { GOOGLE_ADS_CONSENT_KEY } from "./googleAds.ts";
import { PURCHASE_CONVERSION_DESTINATION, PURCHASE_CONVERSION_PENDING_KEY, PURCHASE_CONVERSION_SEEN_PREFIX, consumePendingPurchase, preparePurchaseConversion, finishPurchaseConversion } from "./googleAdsPurchaseConversion.ts";

const transactionId = "a".repeat(64);
const base = "https://thefamilyweather.com";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}

test("purchase handoff rejects missing, stale, private, invalid and repeated receipts", () => {
  const storage = memory();
  const pending = { transactionId, returnPath: "/events/123", createdAt: Date.now() };
  assert.equal(consumePendingPurchase(storage), null);
  for (const invalid of [{ transactionId: "cs_live_private" }, { returnPath: "https://example.com" }, { returnPath: "/events/123?session_id=private" }, { createdAt: Date.now() - 120001 }, { createdAt: Date.now() + 10000 }]) {
    storage.setItem(PURCHASE_CONVERSION_PENDING_KEY, JSON.stringify({ ...pending, ...invalid }));
    assert.equal(consumePendingPurchase(storage), null);
    assert.equal(storage.getItem(PURCHASE_CONVERSION_PENDING_KEY), null);
  }
  storage.setItem(PURCHASE_CONVERSION_PENDING_KEY, JSON.stringify(pending));
  assert.equal(consumePendingPurchase(storage)?.transactionId, transactionId);
  assert.equal(consumePendingPurchase(storage), null);
  storage.setItem(PURCHASE_CONVERSION_SEEN_PREFIX + transactionId, "1");
  storage.setItem(PURCHASE_CONVERSION_PENDING_KEY, JSON.stringify(pending));
  assert.equal(consumePendingPurchase(storage), null);
});

test("verified purchase queue uses supplied action, opaque ID and consent, never receipt URL or price", () => {
  const keys = ["window", "document", "navigator", "setTimeout", "clearTimeout"];
  const original = Object.fromEntries(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const storage = memory();
  const calls: unknown[][] = [];
  const navigation: string[] = [];
  let choice = "granted";
  const browser = {
    location: { href: `${base}/events/123?payment=processing&session_id=cs_live_private`, replace: (path: string) => navigation.push(path) },
    localStorage: { getItem: (key: string) => key === GOOGLE_ADS_CONSENT_KEY ? JSON.stringify({ choice, updatedAt: Date.now() }) : null },
    sessionStorage: storage,
    familyWeatherGoogleAdsLoaded: true,
    gtag: (...args: unknown[]) => calls.push(args),
  };
  const nav = { globalPrivacyControl: false };
  const doc = { querySelectorAll: () => [], createElement: () => ({}), head: { appendChild: () => {} }, getElementById: () => ({ addEventListener: () => {} }) };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: nav });
    Object.defineProperty(globalThis, "setTimeout", { configurable: true, value: () => 1 });
    Object.defineProperty(globalThis, "clearTimeout", { configurable: true, value: () => {} });
    assert.equal(preparePurchaseConversion("123", "cs_live_private"), false);
    assert.equal(preparePurchaseConversion("123", transactionId), true);
    assert.equal(navigation.pop(), "/purchase-complete");
    browser.location.href = base + "/purchase-complete";
    finishPurchaseConversion();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(0, 2), ["event", "conversion"]);
    const payload = calls[0][2] as Record<string, unknown>;
    assert.equal(payload.send_to, PURCHASE_CONVERSION_DESTINATION);
    assert.equal(payload.transaction_id, transactionId);
    assert.deepEqual(Object.keys(payload).sort(), ["event_callback", "event_timeout", "send_to", "transaction_id"]);
    assert.equal(JSON.stringify(calls).includes("cs_live_private"), false);
    assert.equal(JSON.stringify(calls).includes("/events/123"), false);
    (payload.event_callback as () => void)();
    assert.equal(navigation.pop(), "/events/123");
    assert.equal(preparePurchaseConversion("123", transactionId), false);
    finishPurchaseConversion();
    assert.equal(calls.length, 1);
    for (const scenario of ["declined", "gpc", "preview"]) {
      storage.removeItem(PURCHASE_CONVERSION_SEEN_PREFIX + transactionId);
      choice = scenario === "declined" ? "denied" : "granted";
      nav.globalPrivacyControl = scenario === "gpc";
      browser.location.href = scenario === "preview" ? "https://preview.example.com/events/123" : base + "/events/123";
      assert.equal(preparePurchaseConversion("123", transactionId), false, scenario);
      assert.equal(calls.length, 1, scenario);
    }
  } finally {
    for (const key of keys) {
      const descriptor = original[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
