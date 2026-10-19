export type RainSummary = {
  peakHourlyProbabilityPct: number | null;
  dayProbabilityPct: number | null;
  source: "weatherapi";
};

function probability(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

// A peak hourly probability is not a calculated probability for the whole day.
export function summarizeRain(dayProbabilityPct: number | null, hourly: ReadonlyArray<{ probabilityPct: number | null }>): RainSummary {
  const values = hourly.map(hour => probability(hour.probabilityPct)).filter((value): value is number => value !== null);
  return {
    peakHourlyProbabilityPct: values.length ? Math.max(...values) : null,
    dayProbabilityPct: probability(dayProbabilityPct),
    source: "weatherapi",
  };
}
