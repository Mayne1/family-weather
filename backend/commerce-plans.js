"use strict";

const PLANS = Object.freeze({
  free_event: Object.freeze({ code: "free_event", name: "Free Event", priceCents: 0, emailLimit: 10, rank: 0, presentation: "promoted" }),
  clean_event_199: Object.freeze({ code: "clean_event_199", name: "Clean Event", priceCents: 199, emailLimit: 10, rank: 1, presentation: "clean" }),
  event_plus_599: Object.freeze({ code: "event_plus_599", name: "Event Plus", priceCents: 599, emailLimit: 25, rank: 2, presentation: "unbranded" }),
  large_event_1999: Object.freeze({ code: "large_event_1999", name: "Large Event", priceCents: 1999, emailLimit: 100, rank: 3, presentation: "unbranded" }),
  bigger_event_3999: Object.freeze({ code: "bigger_event_3999", name: "Bigger Event", priceCents: 3999, emailLimit: 250, rank: 4, presentation: "unbranded" }),
  organization_event_6999: Object.freeze({ code: "organization_event_6999", name: "Organization Event", priceCents: 6999, emailLimit: 500, rank: 5, presentation: "unbranded" }),
  major_event_11999: Object.freeze({ code: "major_event_11999", name: "Major Event", priceCents: 11999, emailLimit: 1000, rank: 6, presentation: "unbranded" }),
});

function planFor(code) {
  if (code === "family_weather_launch_event_599") return PLANS.event_plus_599;
  return PLANS[code] || PLANS.free_event;
}

function paidPlan(code) {
  const plan = code === "family_weather_launch_event_599" ? PLANS.event_plus_599 : PLANS[code];
  return plan && plan.priceCents > 0 ? plan : null;
}

module.exports = { PLANS, planFor, paidPlan };
