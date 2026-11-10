import assert from "node:assert/strict";
import test from "node:test";
import { weatherScoreCaption } from "./weatherReview.ts";

test("historical weather review labels a numeric activity fit out of 100", () => {
  assert.equal(weatherScoreCaption("almanac", 72, false), "Historical fit · out of 100");
});

test("historical weather review says not scored only when no fit score exists", () => {
  assert.equal(weatherScoreCaption("almanac", null, false), "Not scored · historical data");
});

test("incomplete data status takes priority over score wording", () => {
  assert.equal(weatherScoreCaption("forecast", null, true), "Hourly details missing");
});
