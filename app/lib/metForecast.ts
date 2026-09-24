import type { LocationCandidate } from "./location";
import type { HourlyCondition } from "./decisionSpine";

type MetTimeseries = {
  time?: string;
  data?: {
    instant?: { details?: Record<string, unknown> };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: Record<string, unknown> };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: Record<string, unknown> };
  };
};

function metNumber(value: unknown) {
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

export async function metForecast(geo: LocationCandidate, date: string) {
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
  const points = series.filter((item) => typeof item.time === "string" && item.time.slice(0, 10) === date);
  if (!points.length) return null;

  const hourly: HourlyCondition[] = points.map((item) => {
    const instant = item.data?.instant?.details || {};
    const next = item.data?.next_1_hours || item.data?.next_6_hours;
    const symbol = next?.summary?.symbol_code || "";
    return {
      time: item.time as string,
      temperatureF: metTemperatureF(instant.air_temperature),
      feelsLikeF: null,
      precipitationProbabilityPct: null,
      windMph: metWindMph(instant.wind_speed),
      windGustMph: metWindMph(instant.wind_speed_of_gust),
      humidityPct: metNumber(instant.relative_humidity),
      condition: metCondition(symbol),
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
    timezone: null,
    day: {
      date,
      weather_code: 0,
      temp_max_f: Math.round(Math.max(...temperatures)),
      temp_min_f: Math.round(Math.min(...temperatures)),
      precip_prob_pct: null,
      wind_max_mph: Math.round(Math.max(...winds, 0)),
      shortForecast: metCondition(symbols[0] || ""),
    },
    hourly,
  };
}
