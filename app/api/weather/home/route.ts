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

type NwsObservation = {
  properties?: {
    temperature?: { value?: number | null };
    heatIndex?: { value?: number | null };
    windChill?: { value?: number | null };
    windSpeed?: { value?: number | null };
    relativeHumidity?: { value?: number | null };
    timestamp?: string;
    textDescription?: string;
  };
};

type NwsPoint = {
  properties?: {
    observationStations?: string;
  };
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

function officialCurrentConditions(observation: NwsObservation | null) {
  const properties = observation?.properties;
  const tempC = Number(properties?.temperature?.value);
  if (!Number.isFinite(tempC)) return null;

  const observedAt = String(properties?.timestamp || "");
  const observedTime = Date.parse(observedAt);
  if (!Number.isFinite(observedTime) || Date.now() - observedTime > 2 * 60 * 60 * 1000) return null;

  const heatIndexC = Number(properties?.heatIndex?.value);
  const windChillC = Number(properties?.windChill?.value);
  const feelsC = Number.isFinite(heatIndexC) ? heatIndexC : Number.isFinite(windChillC) ? windChillC : tempC;
  const windKph = Number(properties?.windSpeed?.value);
  return {
    temp_f: Math.round((tempC * 9 / 5 + 32) * 10) / 10,
    feels_like_f: Math.round((feelsC * 9 / 5 + 32) * 10) / 10,
    wind_mph: Number.isFinite(windKph) ? Math.round((windKph / 1.609344) * 10) / 10 : 0,
    weather_code: weatherCode(String(properties?.textDescription || "")),
    humidity_pct: Math.round(Number(properties?.relativeHumidity?.value) || 0),
    observed_at: observedAt,
    source: "nws-observation",
  };
}

async function nwsCurrent(point: NwsPoint | null) {
  const stationsUrl = point?.properties?.observationStations;
  if (!stationsUrl) return null;
  const stations = await jsonOrNull(stationsUrl, NWS_HEADERS);
  const stationUrl = stations?.features?.[0]?.id;
  if (!stationUrl) return null;
  const observation = await jsonOrNull(`${stationUrl}/observations/latest`, NWS_HEADERS);
  return officialCurrentConditions(observation);
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
  const [officialCurrent, officialForecast] = await Promise.all([
    nwsCurrent(point),
    forecastUrl ? jsonOrNull(forecastUrl, NWS_HEADERS) : Promise.resolve(null),
  ]);
  if (officialForecast) {
    days = buildDays(officialForecast?.properties?.periods || []);
    if (days.length) source = "nws";
  }

  if (!days.length) {
    days = normalizeFallbackDays(fallbackForecast?.days);
  }

  const current = officialCurrent || currentPayload?.current || currentPayload?.rightNow || null;
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
    timezone: point?.properties?.timeZone || null,
    current_source: officialCurrent ? "nws-observation" : "family-weather",
    partial: !current || !days.length,
  });
}
