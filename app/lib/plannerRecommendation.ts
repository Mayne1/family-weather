import type { AlmanacResult } from "./almanac";
import { historicalActivityFit } from "./decisionSpine";
import type { DecisionResult, Space } from "./decisionSpine";

export function recommendationFromDecision(decision: DecisionResult, historical?: AlmanacResult | null, space: Space = "outdoor") {
  if (historical) {
    const fit = historicalActivityFit(decision.activity.requested, space, historical.years);
    return {
      score: fit.score,
      bestWindow: "Historical pattern only",
      summary: fit.explanation,
      advice: [
        { tone: historical.rainFrequencyPct >= 40 ? "warn" : "good", title: "Five-year rain pattern", copy: `${historical.rainYears} of ${historical.years.length} matching dates recorded rain. This is history, not a forecast.` },
        { tone: historical.averageHighF >= 90 ? "warn" : "good", title: "Typical temperature", copy: `The five-year average was ${historical.averageHighF}° high and ${historical.averageLowF}° low.` },
        { tone: historical.averageWindMph > 12 ? "warn" : "good", title: "Typical peak wind", copy: `Matching dates averaged about ${historical.averageWindMph} mph for peak wind.` },
        { tone: "warn", title: "No hourly promise", copy: "Use a live forecast closer to the date before choosing a time." },
      ],
    };
  }

  if (decision.status === "insufficient-data" || decision.safety?.kind === "insufficient") {
    const detail = decision.safety?.detail || decision.summary || "There is not enough hourly forecast data to make a responsible weather recommendation.";
    return {
      score: null,
      bestWindow: "Weather data incomplete",
      summary: detail,
      advice: [
        { tone: "warn", title: "Weather data incomplete", copy: detail },
        { tone: "good", title: "What to do next", copy: "Try again later, choose another date, or create the event without treating this as a bad-weather verdict." },
      ],
    };
  }

  const advice = decision.safety
    ? [{ tone: "warn", title: decision.safety.title, copy: decision.safety.detail }]
    : [
    ...(decision.guidance ? [{ tone: decision.status === "avoid" ? "warn" : "good", title: decision.guidance.title, copy: decision.guidance.copy }] : []),
    ...decision.reasons.map((copy, index) => ({ tone: "good", title: index === 0 ? "Why this window works" : "Supporting condition", copy })),
    ...decision.cautions.map((copy, index) => ({ tone: "warn", title: index === 0 ? "What could interfere" : "Additional caution", copy })),
  ];
  if (decision.alternateWindow) advice.push({ tone: "good", title: "Second choice", copy: `${decision.alternateWindow.label} is the next-best non-overlapping window.` });
  if (decision.confidence.level !== "high") advice.push({ tone: "warn", title: `${decision.confidence.level[0].toUpperCase()}${decision.confidence.level.slice(1)} confidence`, copy: `The hourly data is missing ${decision.confidence.missing.join(", ") || "some forecast detail"}.` });
  return {
    score: decision.safety ? null : decision.score,
    bestWindow: decision.safety ? "Choose another day" : decision.bestWindow?.label || (decision.status === "recommended" ? "Your planned time" : "No responsible window"),
    summary: decision.summary,
    advice: advice.slice(0, 5),
  };
}

