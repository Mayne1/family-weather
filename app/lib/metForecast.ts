import type { LocationCandidate } from "./location";
import type { HourlyCondition } from "./decisionSpine";

type MetTimeseries = {
  time?: string;
  thunderRisk?: boolean;
  rainExpected?: boolean;
  data?: {
    instant?: { details?: Record<string, unknown> };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: Record<string, unknown> };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: Record<string, unknown> };
    next_12_hours?: { summary?: { symbol_code?: string }; details?: Record<string, unknown> };
  };
};

function metNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function metTemperatureF(value: unknown) {
  const number = metNumber(value);
  return number === null ? null : Math.round((number * 9) / 5 + 32);
}

function metWindMph(value: unknown) {
  const number = metNumber(value);
  return number === null ? null : Math.round(number * 2.23694);
}

function metCondition(symbol = "") {
  const text = symbol.toLowerCase();
  if (text.includes("thunder")) return "Thunderstorms";
  if (text.includes("snow") || text.includes("sleet")) return "Snow";
  if (text.includes("rain") || text.includes("shower") || text.includes("drizzle")) return "Rain or showers";
  if (text.includes("fog")) return "Fog";
  if (text.includes("clear") || text.includes("fair")) return "Clear";
  return "Cloudy";
}

function localParts(isoTime: string, timezone: string | null) {
  if (!timezone) return isoTime.slice(0, 19);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(isoTime));
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return values.year && values.month && values.day && values.hour
      ? `${values.year}-${values.month}-${values.day}T${values.hour}:00:00`
      : isoTime.slice(0, 19);
  } catch {
    return isoTime.slice(0, 19);
  }
}

export async function metForecast(geo: LocationCandidate, date: string, timezone: string | null = null) {
  const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${geo.lat.toFixed(4)}&lon=${geo.lon.toFixed(4)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "FamilyWeather/1.0 (https://thefamilyweather.com)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Worldwide forecast lookup failed");
  const payload = await response.json();
  const series: MetTimeseries[] = Array.isArray(payload?.properties?.timeseries) ? payload.properties.timeseries : [];
  let validTimezone: string | null = null;
  try {
    if (timezone) { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); validTimezone = timezone; }
  } catch { /* Missing timezone cannot support a local-time recommendation. */ }
  // Retain hazards from every overlapping summary, including six-hour blocks
  // that begin before the selected day's first representative point.
  const hazards = series.flatMap((item) => {
    const start = Date.parse(item.time || "");
    if (!Number.isFinite(start)) return [];
    return ([1, 6, 12] as const).flatMap((hours) => {
      const period = item.data?.[`next_${hours}_hours`];
      if (!period) return [];
      const symbol = period.summary?.symbol_code || "";
      const thunder = /thunder/i.test(symbol) || (metNumber(period.details?.probability_of_thunder) ?? 0) > 0;
      const rain = /rain|shower|drizzle/i.test(symbol);
      return thunder || rain ? [{ start, end: start + hours * 3600000, thunder, rain }] : [];
    });
  });
  // MET Norway switches from hourly points to six-hour blocks farther out. Expand each block into representative hourly points so the planner can evaluate a two-hour activity window without inventing new weather values.
  const points = series.flatMap((item, index) => {
    if (typeof item.time !== "string") return [];
    const start = Date.parse(item.time);
    if (!Number.isFinite(start)) return [];
    const nextTime = series[index + 1]?.time;
    const next = typeof nextTime === "string" ? Date.parse(nextTime) : start + 60 * 60 * 1000;
    const duration = item.data?.next_1_hours ? 1 : item.data?.next_6_hours ? 6 : 1;
    const end = Math.min(Number.isFinite(next) && next > start ? next : start + 3600000, start + duration * 3600000);
    const rows: MetTimeseries[] = [];
    for (let timestamp = start; timestamp < end; timestamp += 60 * 60 * 1000) {
      const utcTime = new Date(timestamp).toISOString();
      const localTime = localParts(utcTime, validTimezone);
      const overlapping = hazards.filter((hazard) => hazard.start < timestamp + 3600000 && hazard.end > timestamp);
      if (localTime.slice(0, 10) === date) rows.push({ ...item, time: localTime,
        thunderRisk: overlapping.some((hazard) => hazard.thunder),
        rainExpected: overlapping.some((hazard) => hazard.rain),
      });
    }
    return rows;
  });
  if (!points.length) return null;

  const hourly: HourlyCondition[] = points.map((item) => {
    const instant = item.data?.instant?.details || {};
    const next = item.data?.next_1_hours || item.data?.next_6_hours;
    const precipitationWindowHours = item.data?.next_1_hours ? 1 : item.data?.next_6_hours ? 6 : null;
    const details = next?.details || {};
    const symbol = next?.summary?.symbol_code || "";
    return {
      time: item.time as string,
      localTimeKnown: Boolean(validTimezone),
      thunderRisk: item.thunderRisk,
      rainExpected: item.rainExpected,
      temperatureF: metTemperatureF(instant.air_temperature),
      feelsLikeF: null,
      precipitationProbabilityPct: metNumber(details.probability_of_precipitation),
      precipitationAmountMm: metNumber(details.precipitation_amount),
      precipitationWindowHours,
      precipitationSource: "met-norway",
      windMph: metWindMph(instant.wind_speed),
      windGustMph: metWindMph(instant.wind_speed_of_gust),
      humidityPct: metNumber(instant.relative_humidity),
      condition: symbol ? metCondition(symbol) : undefined,
      isDaylight: null,
    };
  });
  const temperatures = hourly.map((item) => item.temperatureF).filter((value): value is number => typeof value === "number");
  const winds = hourly.map((item) => item.windMph).filter((value): value is number => typeof value === "number");
  const symbols = points.map((item) => item.data?.next_1_hours?.summary?.symbol_code || item.data?.next_6_hours?.summary?.symbol_code || "").filter(Boolean);
  return {
    source: "met-norway" as const,
    label: geo.label,
    updatedAt: payload?.properties?.meta?.updated_at || null,
    timezone: validTimezone,
    day: {
      date,
      weather_code: 0,
      temp_max_f: temperatures.length ? Math.round(Math.max(...temperatures)) : 0,
      temp_min_f: temperatures.length ? Math.round(Math.min(...temperatures)) : 0,
      precip_prob_pct: null,
      wind_max_mph: Math.round(Math.max(...winds, 0)),
      shortForecast: metCondition(symbols[0] || ""),
    },
    hourly,
  };
}
