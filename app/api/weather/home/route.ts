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
    forecast?: string;
    timeZone?: string;
    relativeLocation?: { properties?: { city?: string; state?: string } };
  };
};

type NwsStationWeather = {
  current: ReturnType<typeof officialCurrentConditions>;
  high_f: number | null;
  low_f: number | null;
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

function finiteNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function officialCurrentConditions(observation: NwsObservation | null) {
  const properties = observation?.properties;
  const tempC = finiteNumberOrNull(properties?.temperature?.value);
  if (tempC === null) return null;

  const observedAt = String(properties?.timestamp || "");
  const observedTime = Date.parse(observedAt);
  if (!Number.isFinite(observedTime) || Date.now() - observedTime > 2 * 60 * 60 * 1000) return null;

  const heatIndexC = finiteNumberOrNull(properties?.heatIndex?.value);
  const windChillC = finiteNumberOrNull(properties?.windChill?.value);
  const feelsC = heatIndexC ?? windChillC ?? tempC;
  const windKph = finiteNumberOrNull(properties?.windSpeed?.value);
  const humidity = finiteNumberOrNull(properties?.relativeHumidity?.value);
  return {
    temp_f: Math.round((tempC * 9 / 5 + 32) * 10) / 10,
    feels_like_f: Math.round((feelsC * 9 / 5 + 32) * 10) / 10,
    wind_mph: windKph !== null ? Math.round((windKph / 1.609344) * 10) / 10 : null,
    weather_code: weatherCode(String(properties?.textDescription || "")),
    humidity_pct: humidity !== null ? Math.round(humidity) : null,
    observed_at: observedAt,
    source: "nws-observation",
  };
}

function dateInTimezone(timeZone: string, value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

async function nwsStationWeather(point: NwsPoint | null, timeZone: string): Promise<NwsStationWeather | null> {
  const stationsUrl = point?.properties?.observationStations;
  if (!stationsUrl) return null;
  const stations = await jsonOrNull(stationsUrl, NWS_HEADERS);
  const stationUrl = stations?.features?.[0]?.id;
  if (!stationUrl) return null;

  const localDate = dateInTimezone(timeZone);
  const [latest, observations] = await Promise.all([
    jsonOrNull(`${stationUrl}/observations/latest`, NWS_HEADERS),
    jsonOrNull(`${stationUrl}/observations?start=${localDate}T00:00:00Z&limit=500`, NWS_HEADERS),
  ]);
  const temperatures = (observations?.features || [])
    .filter((item: NwsObservation) => {
      const timestamp = item?.properties?.timestamp;
      return timestamp && dateInTimezone(timeZone, timestamp) === localDate;
    })
    .map((item: NwsObservation) => Number(item?.properties?.temperature?.value))
    .filter((value: number) => Number.isFinite(value))
    .map((value: number) => value * 9 / 5 + 32);

  return {
    current: officialCurrentConditions(latest),
    high_f: temperatures.length ? Math.round(Math.max(...temperatures)) : null,
    low_f: temperatures.length ? Math.round(Math.min(...temperatures)) : null,
  };
}

function openMeteoCode(code: number) {
  if (code === 0) return 800;
  if (code === 1) return 801;
  if (code === 2) return 802;
  if (code === 3) return 803;
  if (code === 45 || code === 48) return 741;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 500;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 601;
  if (code >= 95) return 211;
  return 802;
}

function openMeteoDescription(code: number) {
  if (code === 0) return "Clear and sunny";
  if (code === 1) return "Mostly sunny";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Mostly cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "Rain or showers possible";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "Snow possible";
  if (code >= 95) return "Thunderstorms possible";
  return "Forecast available";
}

async function calendarForecast(lat: number, lon: number, requestedTimeZone?: string | null) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: requestedTimeZone || "auto",
    forecast_days: "8",
  });
  const payload = await jsonOrNull(`https://api.open-meteo.com/v1/forecast?${params}`);
  const daily = payload?.daily;
  const dates: unknown[] = daily?.time || [];
  const days = dates.map((date, index): WeatherDay => {
    const rawCode = Number(daily?.weather_code?.[index]) || 0;
    return {
      date: String(date),
      weather_code: openMeteoCode(rawCode),
      temp_max_f: Math.round(Number(daily?.temperature_2m_max?.[index]) || 0),
      temp_min_f: Math.round(Number(daily?.temperature_2m_min?.[index]) || 0),
      precip_prob_pct: Math.round(Number(daily?.precipitation_probability_max?.[index]) || 0),
      wind_max_mph: Math.round(Number(daily?.wind_speed_10m_max?.[index]) || 0),
      shortForecast: openMeteoDescription(rawCode),
    };
  });
  return { days, timeZone: String(payload?.timezone || requestedTimeZone || "UTC") };
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
  const rawLat = request.nextUrl.searchParams.get("lat");
  const rawLon = request.nextUrl.searchParams.get("lon");
  const requestedLat = finiteNumberOrNull(rawLat);
  const requestedLon = finiteNumberOrNull(rawLon);
  const hasCoordinates = requestedLat !== null
    && requestedLon !== null
    && requestedLat >= -90
    && requestedLat <= 90
    && requestedLon >= -180
    && requestedLon <= 180;
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
  const [officialForecast, calendar] = await Promise.all([
    forecastUrl ? jsonOrNull(forecastUrl, NWS_HEADERS) : Promise.resolve(null),
    calendarForecast(lat, lon, point?.properties?.timeZone),
  ]);
  const timeZone = calendar.timeZone || point?.properties?.timeZone || "UTC";
  const localDate = dateInTimezone(timeZone);
  const stationWeather = await nwsStationWeather(point, timeZone);
  const officialCurrent = stationWeather?.current || null;
  const officialDays = officialForecast ? buildDays(officialForecast?.properties?.periods || []) : [];

  const daysByDate = new Map(calendar.days.map((day) => [day.date, day]));
  for (const day of officialDays) daysByDate.set(day.date, day);

  const currentDay = daysByDate.get(localDate);
  if (currentDay && stationWeather) {
    if (stationWeather.high_f !== null) currentDay.temp_max_f = Math.max(currentDay.temp_max_f, stationWeather.high_f);
    if (stationWeather.low_f !== null) currentDay.temp_min_f = Math.min(currentDay.temp_min_f, stationWeather.low_f);
  }

  days = [...daysByDate.values()]
    .filter((day) => day.date >= localDate)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 5);
  if (officialDays.length) source = "nws";

  if (!days.length) {
    days = normalizeFallbackDays(fallbackForecast?.days)
      .filter((day) => day.date >= localDate)
      .slice(0, 5);
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
    timezone: timeZone,
    current_source: officialCurrent ? "nws-observation" : "family-weather",
    partial: !current || !days.length,
  });
}
