import test from "node:test";
import assert from "node:assert/strict";
import { COZY_SPIRIT_AFFILIATE_URL, supportsEventAffiliate, supportsPublicAffiliate } from "./affiliatePromotions.ts";

test("only explicitly resolved valid free events receive affiliate placements", () => {
  for (const presentation of [undefined, null, "", "clean", "unbranded", "legacy", "unknown"]) {
    assert.equal(supportsEventAffiliate(presentation, true), false);
  }
  assert.equal(supportsEventAffiliate("promoted", true), true);
  assert.equal(supportsEventAffiliate("promoted", false), false);
  assert.equal(supportsEventAffiliate("promoted", true, true), false);
});

test("public placements have a narrow route allowlist", () => {
  for (const path of ["/", "/today", "/plan", "/weather-history", "/weather-stories", "/weather-stories/rain"]) assert.equal(supportsPublicAffiliate(path), true);
  for (const path of ["/privacy", "/terms", "/pricing", "/events", "/family", "/create-event", "/invitation/secret", "/rsvp.html", "/weather-stories-private", "/signin"]) assert.equal(supportsPublicAffiliate(path), false);
});

test("approved affiliate URL is fixed and contains no visitor or event identifiers", () => {
  const url = new URL(COZY_SPIRIT_AFFILIATE_URL);
  assert.equal(url.origin, "https://www.awin1.com");
  assert.equal(url.pathname, "/cread.php");
  assert.deepEqual([...url.searchParams], [["awinmid", "130331"], ["awinaffid", "3149251"], ["ued", "https://cozyspiritstudio.com/"]]);
});

import { guestPresentation } from "./commercePlans.ts";
test("guest API presentation fails closed for missing and unknown entitlement data", () => {
  for (const code of [undefined, null, "", "new_unknown_plan"]) {
    for (const status of [undefined, "free", "paid", "pending", "legacy"]) assert.notEqual(guestPresentation(code, status), "promoted");
  }
  assert.equal(guestPresentation("free_event", "free"), "promoted");
  assert.equal(guestPresentation("free_event", "pending"), "promoted");
  for (const status of [undefined, "legacy", "paid", "unknown"]) assert.notEqual(guestPresentation("free_event", status), "promoted");
  assert.equal(guestPresentation("clean_event_199", "paid"), "clean");
  assert.equal(guestPresentation("event_plus_599", "paid"), "unbranded");
  assert.equal(guestPresentation("family_access", "paid"), "unbranded");
});
