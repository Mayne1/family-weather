import { NextRequest, NextResponse } from "next/server";
import { lookupAlmanac } from "../../../lib/almanac";
import type { AlmanacResult } from "../../../lib/almanac";
import { AmbiguousLocationError, resolveLocation } from "../../../lib/location";
import type { LocationCandidate } from "../../../lib/location";
import { enforceRateLimit } from "../../../lib/requestSecurity";
import { buildDecision } from "../../../lib/decisionSpine";
import type { DecisionResult, HourlyCondition, Space } from "../../../lib/decisionSpine";

const NWS_HEADERS = { "User-Agent": "FamilyWeather/1.0 (thefamilyweather.com)", Accept: "application/geo+json" };

type NwsPeriod = {
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  probabilityOfPrecipitation?: { value?: number | null };
  relativeHumidity?: { value?: number | null };
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

type ForecastDay = {
  date: string;
  weather_code: number;
  temp_max_f: number;
  temp_min_f: number;
  precip_prob_pct: number;
  wind_max_mph: number;
  shortForecast?: string;
};

function recommendationFromDecision(decision: DecisionResult, historical?: AlmanacResult | null) {
  if (historical) {
    return {
      score: null,
      bestWindow: "Historical pattern only",
      summary: decision.summary,
      advice: [
        { tone: historical.rainFrequencyPct >= 40 ? "warn" : "good", title: "Five-year rain pattern", copy: `${historical.rainYears} of ${historical.years.length} matching dates recorded rain. This is history, not a forecast.` },
        { tone: historical.averageHighF >= 90 ? "warn" : "good", title: "Typical temperature", copy: `The five-year average was ${historical.averageHighF}° high and ${historical.averageLowF}° low.` },
        { tone: historical.averageWindMph > 12 ? "warn" : "good", title: "Typical peak wind", copy: `Matching dates averaged about ${historical.averageWindMph} mph for peak wind.` },
        { tone: "warn", title: "No hourly promise", copy: "Use a live forecast closer to the date before choosing a time." },
      ],
    };
  }

  const advice = [
    ...decision.reasons.map((copy, index) => ({ tone: "good", title: index === 0 ? "Why this window works" : "Supporting condition", copy })),
    ...decision.cautions.map((copy, index) => ({ tone: "warn", title: index === 0 ? "What could interfere" : "Additional caution", copy })),
  ];
  if (decision.alternateWindow) advice.push({ tone: "good", title: "Second choice", copy: `${decision.alternateWindow.label} is the next-best non-overlapping window.` });
  if (decision.confidence.level !== "high") advice.push({ tone: "warn", title: `${decision.confidence.level[0].toUpperCase()}${decision.confidence.level.slice(1)} confidence`, copy: `The hourly data is missing ${decision.confidence.missing.join(", ") || "some forecast detail"}.` });
  return {
    score: decision.score,
    bestWindow: decision.bestWindow?.label || (decision.status === "recommended" ? "Your planned time" : "No responsible window"),
    summary: decision.summary,
    advice: advice.slice(0, 5),
  };
}

function nwsHourly(periods: NwsPeriod[], date: string): HourlyCondition[] {
  return periods.filter((period) => period.startTime.slice(0, 10) === date).map((period) => ({
    time: period.startTime,
    temperatureF: Number.isFinite(period.temperature) ? period.temperature : null,
    precipitationProbabilityPct: typeof period.probabilityOfPrecipitation?.value === "number" ? period.probabilityOfPrecipitation.value : null,
    windMph: period.windSpeed ? maxWind(period.windSpeed) : null,
    humidityPct: typeof period.relativeHumidity?.value === "number" ? period.relativeHumidity.value : null,
    condition: period.shortForecast,
    isDaylight: period.isDaytime,
  }));
}

async function nwsForecast(geo: LocationCandidate, date: string) {
  const pointResponse = await fetch(`https://api.weather.gov/points/${geo.lat.toFixed(4)},${geo.lon.toFixed(4)}`, { headers: NWS_HEADERS, cache: "no-store" });
  if (!pointResponse.ok) return null;
  const point = await pointResponse.json();
  const forecastUrl = point?.properties?.forecast;
  const hourlyUrl = point?.properties?.forecastHourly;
  if (!forecastUrl || !hourlyUrl) return null;
  const [forecastResponse, hourlyResponse] = await Promise.all([
    fetch(forecastUrl, { headers: NWS_HEADERS, cache: "no-store" }),
    fetch(hourlyUrl, { headers: NWS_HEADERS, cache: "no-store" }),
  ]);
  if (!forecastResponse.ok || !hourlyResponse.ok) return null;
  const [forecast, hourlyForecast] = await Promise.all([forecastResponse.json(), hourlyResponse.json()]);
  const day = buildDays(forecast?.properties?.periods || []).find((item) => item.date === date);
  if (!day) return null;
  const place = point?.properties?.relativeLocation?.properties;
  const label = place?.city ? `${place.city}, ${place.state || ""}`.replace(/, $/, "") : geo.label;
  return { source: "nws", label, day, hourly: nwsHourly(hourlyForecast?.properties?.periods || [], date) };
}

async function globalForecast(geo: LocationCandidate, date: string) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geo.lat));
  url.searchParams.set("longitude", String(geo.lon));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset");
  url.searchParams.set("hourly", "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "16");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Worldwide forecast lookup failed");
  const data = await response.json();
  const index = Array.isArray(data?.daily?.time) ? data.daily.time.indexOf(date) : -1;
  if (index < 0) return null;
  const day: ForecastDay = {
    date,
    weather_code: Math.round(Number(data.daily.weather_code?.[index]) || 0),
    temp_max_f: Math.round(Number(data.daily.temperature_2m_max?.[index]) || 0),
    temp_min_f: Math.round(Number(data.daily.temperature_2m_min?.[index]) || 0),
    precip_prob_pct: Math.round(Number(data.daily.precipitation_probability_max?.[index]) || 0),
    wind_max_mph: Math.round(Number(data.daily.wind_speed_10m_max?.[index]) || 0),
    shortForecast: "Worldwide forecast",
  };
  const sunrise = data.daily.sunrise?.[index];
  const sunset = data.daily.sunset?.[index];
  const hourly: HourlyCondition[] = Array.isArray(data?.hourly?.time) ? data.hourly.time.flatMap((time: string, hourlyIndex: number) => {
    if (!time.startsWith(`${date}T`)) return [];
    const code = Number(data.hourly.weather_code?.[hourlyIndex]);
    return [{
      time,
      temperatureF: numericOrNull(data.hourly.temperature_2m?.[hourlyIndex]),
      feelsLikeF: numericOrNull(data.hourly.apparent_temperature?.[hourlyIndex]),
      precipitationProbabilityPct: numericOrNull(data.hourly.precipitation_probability?.[hourlyIndex]),
      windMph: numericOrNull(data.hourly.wind_speed_10m?.[hourlyIndex]),
      windGustMph: numericOrNull(data.hourly.wind_gusts_10m?.[hourlyIndex]),
      humidityPct: numericOrNull(data.hourly.relative_humidity_2m?.[hourlyIndex]),
      condition: globalCondition(code),
      isDaylight: typeof sunrise === "string" && typeof sunset === "string" ? time >= sunrise && time < sunset : null,
    }];
  }) : [];
  return { source: "open-meteo", label: geo.label, day, hourly };
}

function numericOrNull(value: unknown) {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function globalCondition(code: number) {
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain or showers";
  if ([45, 48].includes(code)) return "Fog";
  if ([0, 1].includes(code)) return "Clear";
  return "Cloudy";
}

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "weather-plan", 30, 60_000);
  if (limited) return limited;
  try {
    const body = await request.json();
    const location = String(body.location || "95206").trim();
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const activity = String(body.activity || "event");
    const space: Space = ["indoor", "outdoor", "both"].includes(body.space) ? body.space : "outdoor";

    const geo = await resolveLocation(location, body.resolvedLocation);
    const forecast = geo.countryCode === "US" ? await nwsForecast(geo, date) || await globalForecast(geo, date) : await globalForecast(geo, date);
    const almanac = forecast ? null : await lookupAlmanac(geo, date);
    const day: ForecastDay = forecast?.day || {
      date,
      weather_code: almanac!.typicalWeatherCode,
      temp_max_f: almanac!.averageHighF,
      temp_min_f: almanac!.averageLowF,
      precip_prob_pct: almanac!.rainFrequencyPct,
      wind_max_mph: almanac!.averageWindMph,
      shortForecast: almanac!.summary,
    };
    const decision = buildDecision({ activity, space, hourly: forecast?.hourly || [], historical: Boolean(almanac) });
    const recommendation = recommendationFromDecision(decision, almanac);
    return NextResponse.json({
      ok: true,
      source: forecast?.source || "almanac",
      location: forecast?.label || geo.label,
      resolvedLocation: geo,
      day,
      almanac,
      space,
      activity,
      decision,
      ...recommendation,
    });
  } catch (error) {
    if (error instanceof AmbiguousLocationError) {
      return NextResponse.json({ ok: false, error: error.message, suggestions: error.suggestions }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Weather service unavailable" }, { status: 502 });
  }
}
