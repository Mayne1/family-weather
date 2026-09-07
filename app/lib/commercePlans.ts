export const COMMERCE_PLANS = [
  { code: "free_event", name: "Free Event", priceCents: 0, emailLimit: 10, rank: 0, presentation: "promoted" },
  { code: "clean_event_199", name: "Clean Event", priceCents: 199, emailLimit: 10, rank: 1, presentation: "clean" },
  { code: "event_plus_599", name: "Event Plus", priceCents: 599, emailLimit: 25, rank: 2, presentation: "unbranded" },
  { code: "large_event_1999", name: "Large Event", priceCents: 1999, emailLimit: 100, rank: 3, presentation: "unbranded" },
  { code: "bigger_event_3999", name: "Bigger Event", priceCents: 3999, emailLimit: 250, rank: 4, presentation: "unbranded" },
  { code: "organization_event_6999", name: "Organization Event", priceCents: 6999, emailLimit: 500, rank: 5, presentation: "unbranded" },
  { code: "major_event_11999", name: "Major Event", priceCents: 11999, emailLimit: 1000, rank: 6, presentation: "unbranded" },
] as const;

export type CommercePlanCode = (typeof COMMERCE_PLANS)[number]["code"];
export type PresentationLevel = (typeof COMMERCE_PLANS)[number]["presentation"] | "legacy";

export function commercePlan(code?: string | null) {
  if (code === "family_weather_launch_event_599") return COMMERCE_PLANS[2];
  return COMMERCE_PLANS.find((plan) => plan.code === code) || COMMERCE_PLANS[0];
}

export function formatPlanPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100);
}
