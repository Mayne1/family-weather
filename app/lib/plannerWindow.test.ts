import assert from "node:assert/strict";
import test from "node:test";
import { recommendedStartTime, timeInputFromWindowLabel, timeInputFromWindowStart } from "./plannerWindow.ts";

test("planner handoff keeps the destination-local start of the recommended window", () => {
  assert.equal(timeInputFromWindowStart("2026-10-31T17:00:00-07:00"), "17:00");
  assert.equal(recommendedStartTime("2026-10-31T17:00:00-07:00", "5 PM–8 PM"), "17:00");
});

test("older planner links recover their start time from the visible window label", () => {
  assert.equal(timeInputFromWindowLabel("5 PM–8 PM"), "17:00");
  assert.equal(timeInputFromWindowLabel("12:30 AM - 3 AM"), "00:30");
  assert.equal(timeInputFromWindowLabel("Historical pattern only"), "");
});
