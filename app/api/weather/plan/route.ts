import { NextRequest, NextResponse } from "next/server";


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

async function resolveLocation(query: string) {
  const normalized = query.match(/^(.+?)\\s+([A-Za-z]{2})$/) ? query.replace(/^(.+?)\\s+([A-Za-z]{2})$/, "$1, $2") : query;
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalized)}&count=5&language=en&format=json&countryCode=US`, { cache: "no-store" });
  if (!response.ok) throw new Error("Location lookup failed");
  const data = await response.json();
  const match = data?.results?.[0];
  if (!match) throw new Error(`We couldn't find "${query}". Try a city and state or a ZIP code.`);
  const label = [match.name, match.admin1].filter(Boolean).join(", ");
  return { lat: match.latitude, lon: match.longitude, label };
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const location = String(body.location || "95206").trim();
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const activity = String(body.activity || "event");
    const space = ["indoor", "outdoor", "both"].includes(body.space) ? body.space : "outdoor";

    const geo = await resolveLocation(location);
    const pointResponse = await fetch(`https://api.weather.gov/points/${geo.lat.toFixed(4)},${geo.lon.toFixed(4)}`, { headers: NWS_HEADERS, cache: "no-store" });
    if (!pointResponse.ok) throw new Error("NWS does not cover that location");
    const point = await pointResponse.json();
    const forecastUrl = point?.properties?.forecast;
    if (!forecastUrl) throw new Error("Official forecast unavailable");

    const forecastResponse = await fetch(forecastUrl, { headers: NWS_HEADERS, cache: "no-store" });
    if (!forecastResponse.ok) throw new Error("Forecast lookup failed");
    const forecast = await forecastResponse.json();
    const days = buildDays(forecast?.properties?.periods || []);
    const day = days.find((item) => item.date === date);
    if (!day) throw new Error("That date is outside the live NWS forecast window");

    const place = point?.properties?.relativeLocation?.properties;
    const resolvedLabel = place?.city ? `${place.city}, ${place.state || ""}`.replace(/, $/, "") : geo.label;
    const recommendation = buildRecommendation(day, space, activity);
    return NextResponse.json({ ok: true, source: "nws", location: resolvedLabel, day, space, activity, ...recommendation });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
