const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
test("affiliate card discloses commercial purpose and suppresses referrer data", () => {
  const card = read("app/components/AffiliatePromotion.tsx");
  assert.match(card, /ADVERTISEMENT/);
  assert.match(card, /may earn a commission/);
  assert.match(card, /rel="sponsored noopener noreferrer"/);
  assert.match(card, /referrerPolicy="no-referrer"/);
  assert.doesNotMatch(card, /<img|<Image|<Script|<iframe|fetch\(|onClick|localStorage|document\.cookie/);
});
test("guest placements require entitlement and validity rather than client purchase state", () => {
  assert.match(read("app/invitation/[token]/page.tsx"), /supportsEventAffiliate\(data.presentation, data.valid, Boolean\(error\)\)/);
  assert.match(read("app/rsvp.html/page.tsx"), /supportsEventAffiliate\(data\?\.presentation, data\?\.valid === true, Boolean\(error\)\)/);
});
test("privacy describes affiliate click behavior and event-only purchase scope", () => {
  const privacy = read("app/privacy/page.tsx");
  assert.match(privacy, /Affiliate links/);
  assert.match(privacy, /does not remove advertising from public Family Weather pages/);
  assert.match(privacy, /do not load Awin tracking scripts/);
});

test("RSVP navigation isolates state and cancels stale submissions", () => {
  const page = read("app/rsvp.html/page.tsx");
  assert.match(page, /<RsvpContent key={queryString} queryString={queryString}/);
  assert.match(page, /submission.current\?\.abort\(\)/);
  assert.match(page, /signal: controller.signal/);
  assert.match(page, /if \(controller.signal.aborted\) return;/);
  assert.match(page, /if \(!controller.signal.aborted\)/);
});
test("standalone weather story pages have exactly one placement", () => {
  for (const file of ["app/weather-stories/page.tsx", "app/weather-stories/[slug]/page.tsx"]) assert.equal((read(file).match(/<AffiliatePromotion \/>/g) || []).length, 1);
});

test("guest promotions revalidate on focus and visibility and fail closed", () => {
  const component = read("app/components/GuestAffiliatePromotion.tsx");
  assert.match(component, /window.addEventListener\("focus", refresh\)/);
  assert.match(component, /document.addEventListener\("visibilitychange", refresh\)/);
  assert.match(component, /setVerified\(null\)/);
  assert.match(component, /verified\?\.token === token/);
  assert.match(component, /!controller.signal.aborted && response.ok && data.ok/);
  assert.match(component, /cache: "no-store"/);
});

test("foreground refresh also gates Family Weather self-promotion", () => {
  const component = read("app/components/GuestAffiliatePromotion.tsx");
  assert.match(component, /document.visibilityState === "visible"/);
  assert.match(component, /60_000/);
  assert.match(component, /window.clearInterval\(timer\)/);
  assert.match(component, /<AffiliatePromotion \/>{children}/);
  assert.match(read("app/invitation/[token]/page.tsx"), /<GuestAffiliatePromotion key={token} token={token}><aside/);
});
