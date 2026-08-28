import { NextRequest, NextResponse } from "next/server";
import { isAmbiguousLocation, isValidLocationCandidate, searchLocations } from "../../../lib/location";
import type { LocationCandidate } from "../../../lib/location";

const NWS_HEADERS = { "User-Agent": "FamilyWeather/1.0 (thefamilyweather.com)", Accept: "application/geo+json" };

type NwsPeriod = {
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  probabilityOfPrecipitation?: { value?: number | null };
  windSpeed?: string;
  shortForecast?: string;
};

function maxWind(value = "0") {
  const speeds = value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [0];
  return Math.round(Math.max(...speeds));
}

function weatherCode(summary = "") {
  const text = summary.toLowerCase();
  if (/thunder/.test(text)) return 211;
  if (/snow|sleet|ice/.test(text)) return 601;
  if (/rain|shower|drizzle/.test(text)) return 500;
  if (/fog|haze|smoke/.test(text)) return 741;
  if (/mostly cloudy/.test(text)) return 803;
  if (/partly cloudy|partly sunny/.test(text)) return 802;
  if (/mostly sunny|few clouds/.test(text)) return 801;
  if (/sunny|clear/.test(text)) return 800;
  return 802;
}

function buildDays(periods: NwsPeriod[]): ForecastDay[] {
  const nights = periods.filter((period) => !period.isDaytime);
  return periods.filter((period) => period.isDaytime).map((period) => {
    const date = period.startTime.slice(0, 10);
    const night = nights.find((candidate) => candidate.startTime.slice(0, 10) === date);
    const shortForecast = period.shortForecast || "Forecast available";
    return {
      date,
      weather_code: weatherCode(shortForecast),
      temp_max_f: Math.round(period.temperature),
      temp_min_f: Math.round(night?.temperature ?? period.temperature),
      precip_prob_pct: Math.round(period.probabilityOfPrecipitation?.value || 0),
      wind_max_mph: maxWind(period.windSpeed),
      shortForecast,
    };
  });
}

class AmbiguousLocationError extends Error {
  suggestions: LocationCandidate[];

  constructor(query: string, suggestions: LocationCandidate[]) {
    super(`We found several places named "${query}". Choose the one you mean.`);
    this.suggestions = suggestions;
  }
}

async function resolveLocation(query: string, supplied?: unknown) {
  if (isValidLocationCandidate(supplied)) {
    return { ...supplied, lat: Number(supplied.lat), lon: Number(supplied.lon), input: supplied.input || query };
  }
  const suggestions = await searchLocations(query, 6);
  if (!suggestions.length) {
    throw new Error(`We couldn't find "${query}". Try a venue, landmark, address, city, or postal code.`);
  }
  if (isAmbiguousLocation(query, suggestions)) throw new AmbiguousLocationError(query, suggestions);
  return suggestions[0];
}


type ForecastDay = {
  date: string;
  weather_code: number;
  temp_max_f: number;
  temp_min_f: number;
  precip_prob_pct: number;
  wind_max_mph: number;
  shortForecast?: string;
};

function clamp(value: number, low = 0, high = 100) {
  return Math.max(low, Math.min(high, Math.round(value)));
}

function buildRecommendation(day: ForecastDay, space: string, activity: string) {
  const exposure = space === "indoor" ? 0.2 : space === "both" ? 0.6 : 1;
  const heatPenalty = Math.max(0, day.temp_max_f - 84) * 1.7 * exposure;
  const coldPenalty = Math.max(0, 58 - day.temp_max_f) * 1.2 * exposure;
  const rainPenalty = day.precip_prob_pct * 0.55 * exposure;
  const windPenalty = Math.max(0, day.wind_max_mph - 12) * 2 * exposure;
  const activityPenalty = activity === "park day" || activity === "game" ? heatPenalty * 0.25 : 0;
  const score = clamp(100 - heatPenalty - coldPenalty - rainPenalty - windPenalty - activityPenalty);

  let bestWindow = "12–3 PM";
  if (day.temp_max_f >= 90) bestWindow = "5–8 PM";
  else if (day.temp_max_f >= 82) bestWindow = "4–7 PM";
  else if (day.temp_max_f < 65) bestWindow = "1–4 PM";
  if (space === "indoor") bestWindow = "Your planned time";

  const advice = [];
  if (day.precip_prob_pct < 20) advice.push({ tone: "good", title: "Rain is unlikely", copy: `Only a ${day.precip_prob_pct}% chance is currently forecast.` });
  else if (day.precip_prob_pct < 50) advice.push({ tone: "warn", title: "Keep cover nearby", copy: `${day.precip_prob_pct}% rain chance—have a quick backup ready.` });
  else advice.push({ tone: "warn", title: "Use the indoor backup", copy: `${day.precip_prob_pct}% rain chance makes exposure the main concern.` });

  if (day.temp_max_f >= 90 && space !== "indoor") advice.push({ tone: "warn", title: "Plan for heat", copy: `The high is near ${day.temp_max_f}°. Shade and cold drinks matter.` });
  else advice.push({ tone: "good", title: "Temperature is manageable", copy: `The forecast high is ${day.temp_max_f}° with a low near ${day.temp_min_f}°.` });

  if (day.wind_max_mph <= 12) advice.push({ tone: "good", title: "Wind stays manageable", copy: `Peak wind is around ${day.wind_max_mph} mph.` });
  else advice.push({ tone: "warn", title: "Secure lightweight items", copy: `Wind could reach ${day.wind_max_mph} mph.` });

  return { score, bestWindow, advice };
}

async function nwsForecast(geo: LocationCandidate, date: string) {
  const pointResponse = await fetch(`https://api.weather.gov/points/${geo.lat.toFixed(4)},${geo.lon.toFixed(4)}`, { headers: NWS_HEADERS, cache: "no-store" });
  if (!pointResponse.ok) return null;
  const point = await pointResponse.json();
  const forecastUrl = point?.properties?.forecast;
  if (!forecastUrl) return null;
  const forecastResponse = await fetch(forecastUrl, { headers: NWS_HEADERS, cache: "no-store" });
  if (!forecastResponse.ok) return null;
  const forecast = await forecastResponse.json();
  const day = buildDays(forecast?.properties?.periods || []).find((item) => item.date === date);
  if (!day) return null;
  const place = point?.properties?.relativeLocation?.properties;
  const label = place?.city ? `${place.city}, ${place.state || ""}`.replace(/, $/, "") : geo.label;
  return { source: "nws", label, day };
}

async function globalForecast(geo: LocationCandidate, date: string) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geo.lat));
  url.searchParams.set("longitude", String(geo.lon));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "16");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Worldwide forecast lookup failed");
  const data = await response.json();
  const index = Array.isArray(data?.daily?.time) ? data.daily.time.indexOf(date) : -1;
  if (index < 0) throw new Error("That date is outside the live forecast window");
  const day: ForecastDay = {
    date,
    weather_code: Math.round(Number(data.daily.weather_code?.[index]) || 0),
    temp_max_f: Math.round(Number(data.daily.temperature_2m_max?.[index]) || 0),
    temp_min_f: Math.round(Number(data.daily.temperature_2m_min?.[index]) || 0),
    precip_prob_pct: Math.round(Number(data.daily.precipitation_probability_max?.[index]) || 0),
    wind_max_mph: Math.round(Number(data.daily.wind_speed_10m_max?.[index]) || 0),
    shortForecast: "Worldwide forecast",
  };
  return { source: "open-meteo", label: geo.label, day };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const location = String(body.location || "95206").trim();
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const activity = String(body.activity || "event");
    const space = ["indoor", "outdoor", "both"].includes(body.space) ? body.space : "outdoor";

    const geo = await resolveLocation(location, body.resolvedLocation);
    const forecast = geo.countryCode === "US" ? await nwsForecast(geo, date) || await globalForecast(geo, date) : await globalForecast(geo, date);
    const recommendation = buildRecommendation(forecast.day, space, activity);
    return NextResponse.json({
      ok: true,
      source: forecast.source,
      location: forecast.label,
      resolvedLocation: geo,
      day: forecast.day,
      space,
      activity,
      ...recommendation,
    });
  } catch (error) {
    if (error instanceof AmbiguousLocationError) {
      return NextResponse.json({ ok: false, error: error.message, suggestions: error.suggestions }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
