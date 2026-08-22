import { NextRequest, NextResponse } from "next/server";

const API = "http://127.0.0.1:3000/weather";
const NWS_HEADERS = {
  "User-Agent": "FamilyWeather/1.0 (thefamilyweather.com)",
  Accept: "application/geo+json",
};

type NwsPeriod = {
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  probabilityOfPrecipitation?: { value?: number | null };
  windSpeed?: string;
  shortForecast?: string;
};

type WeatherDay = {
  date: string;
  weather_code: number;
  temp_max_f: number;
  temp_min_f: number;
  precip_prob_pct: number;
  wind_max_mph: number;
  shortForecast?: string;
};

const maxWind = (value = "0") =>
  Math.round(Math.max(...(value.match(/\d+(?:\.\d+)?/g)?.map(Number) || [0])));

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

function buildDays(periods: NwsPeriod[]): WeatherDay[] {
  const nights = periods.filter((period) => !period.isDaytime);
  return periods
    .filter((period) => period.isDaytime)
    .slice(0, 5)
    .map((period) => {
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

function normalizeFallbackDays(value: unknown): WeatherDay[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((day) => {
    const item = day as Record<string, unknown>;
    return {
      date: String(item.date || ""),
      weather_code: Math.round(Number(item.weather_code) || 802),
      temp_max_f: Math.round(Number(item.temp_max_f) || 0),
      temp_min_f: Math.round(Number(item.temp_min_f) || Number(item.temp_max_f) || 0),
      precip_prob_pct: Math.round(Number(item.precip_prob_pct) || 0),
      wind_max_mph: Math.round(Number(item.wind_max_mph) || 0),
      shortForecast: item.shortForecast ? String(item.shortForecast) : undefined,
    };
  }).filter((day) => day.date);
}

async function jsonOrNull(url: string, headers?: HeadersInit) {
  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const requestedLat = Number(request.nextUrl.searchParams.get("lat"));
  const requestedLon = Number(request.nextUrl.searchParams.get("lon"));
  const hasCoordinates = Number.isFinite(requestedLat) && Number.isFinite(requestedLon);
  const lat = hasCoordinates ? requestedLat : 37.9177;
  const lon = hasCoordinates ? requestedLon : -121.3123;

  const [currentPayload, fallbackForecast, point] = await Promise.all([
    jsonOrNull(`${API}/current?lat=${lat}&lon=${lon}`),
    jsonOrNull(`${API}/forecast10?lat=${lat}&lon=${lon}`),
    jsonOrNull(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      NWS_HEADERS,
    ),
  ]);

  let days: WeatherDay[] = [];
  let source = "family-weather-nws";

  const forecastUrl = point?.properties?.forecast;
  if (forecastUrl) {
    const officialForecast = await jsonOrNull(forecastUrl, NWS_HEADERS);
    days = buildDays(officialForecast?.properties?.periods || []);
    if (days.length) source = "nws";
  }

  if (!days.length) {
    days = normalizeFallbackDays(fallbackForecast?.days);
  }

  const current = currentPayload?.current || currentPayload?.rightNow || null;
  if (!current && !days.length) {
    return NextResponse.json(
      { ok: false, error: "Weather service unavailable" },
      { status: 502 },
    );
  }

  const place = point?.properties?.relativeLocation?.properties;
  const label = place?.city
    ? `${place.city}, ${place.state || ""}`.replace(/, $/, "")
    : hasCoordinates
      ? "Your location"
      : "Stockton, California";

  return NextResponse.json({
    ok: true,
    label,
    lat,
    lon,
    current,
    days,
    source,
    partial: !current || !days.length,
  });
}
