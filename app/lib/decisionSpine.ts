export type Space = "indoor" | "outdoor" | "both";

export type HourlyCondition = {
  time: string;
  temperatureF: number | null;
  feelsLikeF?: number | null;
  precipitationProbabilityPct: number | null;
  /** Expected precipitation for the provider's forecast interval (often 1 or 6 hours). */
  precipitationAmountMm?: number | null;
  /** Length of the precipitation interval represented by precipitationAmountMm. */
  precipitationWindowHours?: number | null;
  precipitationSource?: string | null;
  windMph: number | null;
  windGustMph?: number | null;
  humidityPct?: number | null;
  condition?: string;
  isDaylight?: boolean | null;
};

export type DecisionWindow = {
  start: string;
  end: string;
  label: string;
  score: number;
};

export type DecisionResult = {
  version: "decision-spine/v1";
  status: "recommended" | "caution" | "avoid" | "insufficient-data" | "historical-only";
  score: number;
  activity: { key: string; label: string; requested: string };
  bestWindow: DecisionWindow | null;
  alternateWindow: DecisionWindow | null;
  goodMostOfDay: boolean;
  summary: string;
  reasons: string[];
  cautions: string[];
  avoidWindows: string[];
  confidence: { level: "high" | "medium" | "low"; missing: string[] };
};

type ActivityProfile = {
  key: string;
  label: string;
  patterns: RegExp[];
  durationHours: number;
  preferredHours: [number, number];
  usableHours: [number, number];
  daylightOnly: boolean;
  comfortableTemperature: [number, number];
  workableTemperature: [number, number];
  maximumWindMph: number;
  maximumRainPct: number;
};

const PROFILES: ActivityProfile[] = [
  {
    key: "tree-work",
    label: "tree work",
    patterns: [/tree\s*(work|trim|cut|prun)/i, /(trim|cut|prun).*(tree|branch)/i, /(tree|branch).*(trim|cut|prun)/i, /arbor/i],
    durationHours: 2,
    preferredHours: [8, 12],
    usableHours: [8, 17],
    daylightOnly: true,
    comfortableTemperature: [48, 80],
    workableTemperature: [38, 88],
    maximumWindMph: 10,
    maximumRainPct: 15,
  },
  {
    key: "mowing",
    label: "mowing the lawn",
    patterns: [/mow/i, /cut.*(grass|lawn)/i, /(grass|lawn).*cut/i],
    durationHours: 2,
    preferredHours: [8, 12],
    usableHours: [8, 18],
    daylightOnly: true,
    comfortableTemperature: [50, 82],
    workableTemperature: [40, 89],
    maximumWindMph: 18,
    maximumRainPct: 15,
  },
  {
    key: "yard-work",
    label: "yard work",
    patterns: [/yard/i, /landscap/i, /rake/i, /weed/i, /garden/i],
    durationHours: 3,
    preferredHours: [8, 13],
    usableHours: [7, 18],
    daylightOnly: true,
    comfortableTemperature: [48, 82],
    workableTemperature: [38, 90],
    maximumWindMph: 18,
    maximumRainPct: 20,
  },
  {
    key: "cookout",
    label: "cookout",
    patterns: [/cookout/i, /barbecue/i, /barbeque/i, /bbq/i, /grill/i],
    durationHours: 3,
    preferredHours: [16, 20],
    usableHours: [11, 21],
    daylightOnly: false,
    comfortableTemperature: [55, 86],
    workableTemperature: [45, 94],
    maximumWindMph: 18,
    maximumRainPct: 20,
  },
  {
    key: "beach-day",
    label: "beach day",
    patterns: [/beach/i, /swim/i, /pool/i, /water\s*park/i],
    durationHours: 2,
    preferredHours: [10, 16],
    usableHours: [8, 19],
    daylightOnly: true,
    comfortableTemperature: [68, 88],
    workableTemperature: [60, 94],
    maximumWindMph: 12,
    maximumRainPct: 15,
  },
  {
    key: "park-day",
    label: "park day",
    patterns: [/park/i, /picnic/i, /playground/i],
    durationHours: 2,
    preferredHours: [9, 17],
    usableHours: [8, 19],
    daylightOnly: true,
    comfortableTemperature: [52, 84],
    workableTemperature: [42, 92],
    maximumWindMph: 20,
    maximumRainPct: 25,
  },
  {
    key: "walking",
    label: "walk",
    patterns: [/walk/i, /hike/i, /jog/i, /run(ning)?/i],
    durationHours: 2,
    preferredHours: [7, 18],
    usableHours: [6, 20],
    daylightOnly: true,
    comfortableTemperature: [45, 78],
    workableTemperature: [32, 88],
    maximumWindMph: 22,
    maximumRainPct: 30,
  },
  {
    key: "outdoor-event",
    label: "outdoor event",
    patterns: [/wedding/i, /festival/i, /party/i, /concert/i, /ceremony/i, /event/i],
    durationHours: 3,
    preferredHours: [14, 19],
    usableHours: [9, 21],
    daylightOnly: false,
    comfortableTemperature: [55, 82],
    workableTemperature: [45, 90],
    maximumWindMph: 16,
    maximumRainPct: 20,
  },
];

const GENERAL_OUTDOOR: ActivityProfile = {
  key: "general-outdoor",
  label: "outdoor activity",
  patterns: [],
  durationHours: 2,
  preferredHours: [9, 18],
  usableHours: [7, 20],
  daylightOnly: true,
  comfortableTemperature: [50, 82],
  workableTemperature: [38, 90],
  maximumWindMph: 18,
  maximumRainPct: 25,
};

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function localHour(time: string) {
  const match = time.match(/T(\d{2}):/);
  return match ? Number(match[1]) : Number.NaN;
}

function clock(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized === 12) return "12 PM";
  return `${normalized > 12 ? normalized - 12 : normalized} ${normalized >= 12 ? "PM" : "AM"}`;
}

function windowLabel(start: number, end: number) {
  return `${clock(start)}–${clock(end)}`;
}

function severeCondition(text = "") {
  return /thunder|tornado|hurricane|blizzard|ice storm|freezing rain|severe/i.test(text);
}

function effectiveTemperature(hourly: HourlyCondition) {
  const provided = finite(hourly.feelsLikeF);
  if (provided !== null) return provided;
  const temperature = finite(hourly.temperatureF);
  if (temperature === null) return null;
  const humidity = finite(hourly.humidityPct);
  const wind = finite(hourly.windMph);

  if (temperature >= 80 && humidity !== null && humidity >= 40) {
    const heatIndex = -42.379
      + 2.04901523 * temperature
      + 10.14333127 * humidity
      - 0.22475541 * temperature * humidity
      - 0.00683783 * temperature ** 2
      - 0.05481717 * humidity ** 2
      + 0.00122874 * temperature ** 2 * humidity
      + 0.00085282 * temperature * humidity ** 2
      - 0.00000199 * temperature ** 2 * humidity ** 2;
    return Math.max(temperature, heatIndex);
  }
  if (temperature <= 50 && wind !== null && wind >= 3) {
    return 35.74 + 0.6215 * temperature - 35.75 * wind ** 0.16 + 0.4275 * temperature * wind ** 0.16;
  }
  return temperature;
}

function profileFor(activity: string, space: Space): ActivityProfile {
  if (space === "indoor") {
    return {
      ...GENERAL_OUTDOOR,
      key: "indoor",
      label: activity.trim() || "indoor activity",
      daylightOnly: false,
      preferredHours: [0, 24],
      usableHours: [0, 24],
      durationHours: 1,
      maximumWindMph: 100,
      maximumRainPct: 100,
      comfortableTemperature: [-100, 150],
      workableTemperature: [-100, 150],
    };
  }
  return PROFILES.find((profile) => profile.patterns.some((pattern) => pattern.test(activity))) || GENERAL_OUTDOOR;
}

type ScoredHour = HourlyCondition & {
  hour: number;
  score: number;
  usable: boolean;
  reasons: string[];
  cautions: string[];
  missing: string[];
};

function scoreHour(hourly: HourlyCondition, profile: ActivityProfile, space: Space): ScoredHour {
  const hour = localHour(hourly.time);
  const airTemperature = finite(hourly.temperatureF);
  const temperature = effectiveTemperature(hourly);
  const rain = finite(hourly.precipitationProbabilityPct);
  const wind = finite(hourly.windGustMph) ?? finite(hourly.windMph);
  const missing: string[] = [];
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 100;
  let usable = Number.isFinite(hour) && hour >= profile.usableHours[0] && hour < profile.usableHours[1];

  if (space === "indoor") {
    return { ...hourly, hour, score: 100, usable: true, reasons: ["The activity is indoors, so outdoor comfort does not determine the time."], cautions, missing };
  }

  if (profile.daylightOnly && hourly.isDaylight === false) {
    score -= 100;
    usable = false;
    cautions.push("This activity needs daylight.");
  }
  if (severeCondition(hourly.condition)) {
    score -= 100;
    usable = false;
    cautions.push("Potentially dangerous weather is forecast during this hour.");
  }

  if (temperature === null) {
    missing.push("temperature");
    score -= 12;
  } else if (temperature < profile.workableTemperature[0] || temperature > profile.workableTemperature[1]) {
    const distance = temperature < profile.workableTemperature[0]
      ? profile.workableTemperature[0] - temperature
      : temperature - profile.workableTemperature[1];
    score -= 38 + distance * 2;
    cautions.push(temperature > profile.workableTemperature[1] ? "Heat makes this a poor work period." : "Cold makes this a poor work period.");
  } else if (temperature < profile.comfortableTemperature[0] || temperature > profile.comfortableTemperature[1]) {
    const distance = temperature < profile.comfortableTemperature[0]
      ? profile.comfortableTemperature[0] - temperature
      : temperature - profile.comfortableTemperature[1];
    score -= 10 + distance * 2;
    cautions.push(temperature > profile.comfortableTemperature[1] ? "This period is warmer than ideal." : "This period is cooler than ideal.");
  } else {
    reasons.push("Temperature is in a comfortable range for this activity.");
  }
  if (temperature !== null && airTemperature !== null && temperature >= airTemperature + 4) {
    cautions.push(`Humidity makes ${Math.round(airTemperature)}° feel closer to ${Math.round(temperature)}°.`);
  }

  if (rain === null) {
    missing.push("rain probability");
    score -= 14;
  } else if (rain > 70) {
    score -= 65;
    cautions.push(`Rain is likely during this period (\${Math.round(rain)}% chance).`);
  } else if (rain > profile.maximumRainPct) {
    score -= Math.min(42, 12 + (rain - profile.maximumRainPct) * 0.8);
    cautions.push(`Rain risk is \${Math.round(rain)}% during this period, higher than this activity tolerates well.`);
  } else {
    reasons.push(`Rain risk is \${Math.round(rain)}% during this period and stays within a workable range.`);
  }

  if (wind === null) {
    missing.push("wind");
    score -= 10;
  } else if (wind > profile.maximumWindMph * 1.6) {
    score -= 55;
    cautions.push("Wind is too strong for this activity.");
  } else if (wind > profile.maximumWindMph) {
    score -= 20 + (wind - profile.maximumWindMph) * 2;
    cautions.push("Wind may interfere with this activity.");
  } else {
    reasons.push("Wind stays within a workable range.");
  }

  if (hour < profile.preferredHours[0] || hour >= profile.preferredHours[1]) score -= 8;
  return { ...hourly, hour, score: Math.max(0, Math.round(score)), usable, reasons, cautions, missing };
}

function windowFrom(hours: ScoredHour[]): DecisionWindow {
  const start = hours[0].hour;
  const end = hours[hours.length - 1].hour + 1;
  const score = Math.round(hours.reduce((sum, item) => sum + item.score, 0) / hours.length);
  return { start: hours[0].time, end: hours[hours.length - 1].time, label: windowLabel(start, end), score };
}

function unique(items: string[]) {
  return [...new Set(items)];
}

function strongestMessages(block: ScoredHour[], field: "reasons" | "cautions", limit = 3) {
  return unique(block.flatMap((hour) => hour[field])).slice(0, limit);
}

export function buildDecision(input: {
  activity: string;
  space: Space;
  hourly: HourlyCondition[];
  historical?: boolean;
}): DecisionResult {
  const requested = input.activity.trim() || "outdoor activity";
  const profile = profileFor(requested, input.space);

  if (input.historical) {
    return {
      version: "decision-spine/v1",
      status: "historical-only",
      score: 0,
      activity: { key: profile.key, label: profile.label, requested },
      bestWindow: null,
      alternateWindow: null,
      goodMostOfDay: false,
      summary: "Historical patterns can describe the date, but they cannot support an hourly recommendation.",
      reasons: [],
      cautions: ["Use a live forecast closer to the date before choosing a time."],
      avoidWindows: [],
      confidence: { level: "low", missing: ["hourly forecast"] },
    };
  }

  const scored = input.hourly
    .filter((hour) => Number.isFinite(localHour(hour.time)))
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((hour) => scoreHour(hour, profile, input.space));
  const allMissing = unique(scored.flatMap((hour) => hour.missing));

  if (!scored.length) {
    return {
      version: "decision-spine/v1",
      status: "insufficient-data",
      score: 0,
      activity: { key: profile.key, label: profile.label, requested },
      bestWindow: null,
      alternateWindow: null,
      goodMostOfDay: false,
      summary: "There is not enough hourly forecast data to choose a responsible time.",
      reasons: [],
      cautions: ["Try again when an hourly forecast is available."],
      avoidWindows: [],
      confidence: { level: "low", missing: ["hourly forecast"] },
    };
  }

  if (input.space === "indoor") {
    return {
      version: "decision-spine/v1",
      status: "recommended",
      score: 100,
      activity: { key: profile.key, label: profile.label, requested },
      bestWindow: null,
      alternateWindow: null,
      goodMostOfDay: true,
      summary: "The activity is indoors, so use your planned time and check weather mainly for travel and access.",
      reasons: ["Outdoor temperature, rain, and wind do not determine the indoor activity time."],
      cautions: [],
      avoidWindows: [],
      confidence: { level: "high", missing: [] },
    };
  }

  const candidates: ScoredHour[][] = [];
  for (let index = 0; index <= scored.length - profile.durationHours; index += 1) {
    const block = scored.slice(index, index + profile.durationHours);
    const consecutive = block.every((hour, offset) => offset === 0 || hour.hour === block[offset - 1].hour + 1);
    if (consecutive && block.every((hour) => hour.usable)) candidates.push(block);
  }
  candidates.sort((left, right) => {
    const leftScore = windowFrom(left).score;
    const rightScore = windowFrom(right).score;
    if (rightScore !== leftScore) return rightScore - leftScore;
    const leftPreferred = left[0].hour >= profile.preferredHours[0] && left[0].hour < profile.preferredHours[1];
    const rightPreferred = right[0].hour >= profile.preferredHours[0] && right[0].hour < profile.preferredHours[1];
    return Number(rightPreferred) - Number(leftPreferred) || left[0].hour - right[0].hour;
  });

  const bestBlock = candidates[0] || [];
  const bestWindow = bestBlock.length ? windowFrom(bestBlock) : null;
  const alternateBlock = candidates.find((block) => {
    if (!bestBlock.length) return false;
    const bestHours = new Set(bestBlock.map((hour) => hour.time));
    return block.every((hour) => !bestHours.has(hour.time)) && windowFrom(block).score >= (bestWindow?.score || 0) - 12;
  });
  const alternateWindow = alternateBlock ? windowFrom(alternateBlock) : null;

  const practicalHours = scored.filter((hour) => hour.usable);
  const strongHours = practicalHours.filter((hour) => hour.score >= 70);
  const goodMostOfDay = practicalHours.length >= 6 && strongHours.length / practicalHours.length >= 0.7;
  const score = bestWindow?.score ?? 0;
  const status = score >= 75 ? "recommended" : score >= 50 ? "caution" : "avoid";
  const reasons = bestBlock.length ? strongestMessages(bestBlock, "reasons") : [];
  const cautions = bestBlock.length ? strongestMessages(bestBlock, "cautions") : unique(scored.flatMap((hour) => hour.cautions)).slice(0, 3);
  const avoidWindows = scored
    .filter((hour) => hour.usable && hour.score < 45)
    .map((hour) => windowLabel(hour.hour, hour.hour + 1));
  const missingRatio = scored.filter((hour) => hour.missing.length > 0).length / scored.length;
  const confidence = missingRatio === 0
    ? { level: "high" as const, missing: [] }
    : missingRatio <= 0.35
      ? { level: "medium" as const, missing: allMissing }
      : { level: "low" as const, missing: allMissing };

  let summary: string;
  if (!bestWindow) summary = `No ${profile.durationHours}-hour block meets the basic timing and safety needs for ${requested}.`;
  else if (goodMostOfDay) summary = `${requested} is workable through most of the practical day; ${bestWindow.label} is the strongest block, not the only usable time.`;
  else if (status === "recommended") summary = `${bestWindow.label} is the strongest practical window for ${requested}.`;
  else if (status === "caution") summary = `${bestWindow.label} is the least troublesome window, but the plan needs preparation or flexibility.`;
  else summary = `The forecast does not offer a responsible window for ${requested}.`;

  return {
    version: "decision-spine/v1",
    status,
    score,
    activity: { key: profile.key, label: profile.label, requested },
    bestWindow,
    alternateWindow,
    goodMostOfDay,
    summary,
    reasons,
    cautions,
    avoidWindows: unique(avoidWindows).slice(0, 6),
    confidence,
  };
}
