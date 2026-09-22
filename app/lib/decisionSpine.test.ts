import assert from "node:assert/strict";
import test from "node:test";
import { buildDecision } from "./decisionSpine.ts";
import type { HourlyCondition } from "./decisionSpine.ts";

function day(overrides: Partial<HourlyCondition> = {}): HourlyCondition[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    time: `2026-09-26T${String(hour).padStart(2, "0")}:00:00-07:00`,
    temperatureF: hour < 9 ? 65 : hour < 13 ? 74 : hour < 17 ? 85 : 78,
    precipitationProbabilityPct: 4,
    windMph: 5,
    humidityPct: 45,
    condition: "Sunny",
    isDaylight: hour >= 7 && hour < 19,
    ...overrides,
  }));
}

test("yard work prefers a practical morning block instead of blindly using 4–7 PM", () => {
  const result = buildDecision({ activity: "yard work", space: "outdoor", hourly: day() });
  assert.equal(result.status, "recommended");
  assert.equal(result.activity.key, "yard-work");
  assert.equal(result.bestWindow?.label, "8 AM–11 AM");
  assert.notEqual(result.bestWindow?.label, "4 PM–7 PM");
});

test("a broadly manageable day is described as workable most of the day", () => {
  const hourly = day().map((item) => ({ ...item, temperatureF: 72 }));
  const result = buildDecision({ activity: "yard work", space: "outdoor", hourly });
  assert.equal(result.goodMostOfDay, true);
  assert.match(result.summary, /most of the practical day/i);
});

test("activity timing matters: a cookout favors late afternoon", () => {
  const hourly = day().map((item) => ({ ...item, temperatureF: 76 }));
  const result = buildDecision({ activity: "barbecue with friends", space: "outdoor", hourly });
  assert.equal(result.activity.key, "cookout");
  assert.equal(result.bestWindow?.label, "4 PM–7 PM");
});

test("dangerous conditions are not turned into a cheerful recommendation", () => {
  const result = buildDecision({
    activity: "outdoor wedding",
    space: "outdoor",
    hourly: day({ condition: "Severe Thunderstorms", precipitationProbabilityPct: 90, windMph: 35 }),
  });
  assert.equal(result.status, "avoid");
  assert.equal(result.bestWindow, null);
  assert.match(result.summary, /no .* block|does not offer a responsible window/i);
});

test("no valid daylight block cannot become a recommended planned time", () => {
  const result = buildDecision({ activity: "yard work", space: "outdoor", hourly: day({ isDaylight: false }) });
  assert.equal(result.status, "avoid");
  assert.equal(result.score, 0);
  assert.equal(result.bestWindow, null);
});

test("missing weather stays missing instead of becoming zero-degree weather", () => {
  const result = buildDecision({
    activity: "yard work",
    space: "outdoor",
    hourly: day({ temperatureF: null, precipitationProbabilityPct: null, windMph: null }),
  });
  assert.equal(result.confidence.level, "low");
  assert.deepEqual(result.confidence.missing.sort(), ["rain probability", "temperature", "wind"]);
  assert.doesNotMatch([...result.reasons, ...result.cautions].join(" "), /cold|0°/i);
});

test("humid heat scores worse than the same dry-air temperature", () => {
  const dry = buildDecision({ activity: "yard work", space: "outdoor", hourly: day({ temperatureF: 88, humidityPct: 25 }) });
  const humid = buildDecision({ activity: "yard work", space: "outdoor", hourly: day({ temperatureF: 88, humidityPct: 80 }) });
  assert.ok(humid.score < dry.score);
  assert.match(humid.cautions.join(" "), /humidity makes/i);
});

test("indoor plans keep their chosen time and treat weather as travel context", () => {
  const result = buildDecision({ activity: "air-conditioned board meeting", space: "indoor", hourly: day() });
  assert.equal(result.status, "recommended");
  assert.equal(result.bestWindow, null);
  assert.match(result.summary, /use your planned time/i);
});

test("the requested activity is never replaced by a different ranked activity", () => {
  const result = buildDecision({ activity: "trim the backyard trees", space: "outdoor", hourly: day() });
  assert.equal(result.activity.key, "tree-work");
  assert.equal(result.activity.requested, "trim the backyard trees");
  assert.doesNotMatch(result.summary, /drone|picnic|walk/i);
});

test("historical data does not pretend it can select an hourly forecast window", () => {
  const result = buildDecision({ activity: "cookout", space: "outdoor", hourly: [], historical: true });
  assert.equal(result.status, "historical-only");
  assert.equal(result.bestWindow, null);
  assert.match(result.summary, /cannot support an hourly recommendation/i);
});
