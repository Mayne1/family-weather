"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { PLANS, planFor, paidPlan } = require("./commerce-plans");

test("freemium plans retain the approved prices and email allowances", () => {
  assert.deepEqual(
    Object.values(PLANS).map(({ code, priceCents, emailLimit }) => [code, priceCents, emailLimit]),
    [
      ["free_event", 0, 10],
      ["clean_event_199", 199, 10],
      ["event_plus_599", 599, 25],
      ["large_event_1999", 1999, 100],
      ["bigger_event_3999", 3999, 250],
      ["organization_event_6999", 6999, 500],
      ["major_event_11999", 11999, 1000],
    ],
  );
});

test("plan ranks and prices only increase", () => {
  const plans = Object.values(PLANS);
  for (let index = 1; index < plans.length; index += 1) {
    assert.ok(plans[index].rank > plans[index - 1].rank);
    assert.ok(plans[index].priceCents > plans[index - 1].priceCents);
    assert.ok(plans[index].emailLimit >= plans[index - 1].emailLimit);
  }
});

test("the launch product remains Event Plus", () => {
  assert.equal(planFor("family_weather_launch_event_599"), PLANS.event_plus_599);
  assert.equal(paidPlan("family_weather_launch_event_599"), PLANS.event_plus_599);
});

test("free is promoted, clean keeps a signature, and Plus removes promotion", () => {
  assert.equal(PLANS.free_event.presentation, "promoted");
  assert.equal(PLANS.clean_event_199.presentation, "clean");
  assert.equal(PLANS.event_plus_599.presentation, "unbranded");
});

test("upgrades charge only the difference from the current event value", () => {
  assert.equal(PLANS.event_plus_599.priceCents - PLANS.clean_event_199.priceCents, 400);
  assert.equal(PLANS.large_event_1999.priceCents - PLANS.event_plus_599.priceCents, 1400);
  assert.equal(PLANS.major_event_11999.priceCents - PLANS.organization_event_6999.priceCents, 5000);
});

test("unknown and free product codes cannot be registered as paid upgrades", () => {
  assert.equal(paidPlan("free_event"), null);
  assert.equal(paidPlan("not-a-plan"), null);
  assert.equal(planFor("not-a-plan"), PLANS.free_event);
});

test("frontend and backend plan contracts stay aligned", () => {
  const frontend = fs.readFileSync(path.join(__dirname, "..", "app", "lib", "commercePlans.ts"), "utf8");
  for (const plan of Object.values(PLANS)) {
    assert.match(frontend, new RegExp(`code: "${plan.code}"[^\\n]+priceCents: ${plan.priceCents}[^\\n]+emailLimit: ${plan.emailLimit}[^\\n]+rank: ${plan.rank}[^\\n]+presentation: "${plan.presentation}"`));
  }
});

test("database migration explicitly preserves launch purchases as Event Plus", () => {
  const migration = fs.readFileSync(path.join(__dirname, "event-entitlements.sql"), "utf8");
  assert.match(migration, /status='paid' AND product_code='family_weather_launch_event_599'/);
  assert.match(migration, /product_code='event_plus_599'.*email_limit=GREATEST\(email_limit,25\)/s);
  assert.match(migration, /share_rsvp_limit=2147483647/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE/i);
});
