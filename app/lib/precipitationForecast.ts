import type { LocationCandidate } from "./location";

export type PrecipitationOverlay = {
  dayProbabilityPct: number | null;
  hourly: Array<{
    time: string;
    probabilityPct: number | null;
    amountMm: number | null;
    source: "weatherapi";
  }>;
};

function numberOrNull(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Optional international precipitation overlay.
 *
 * MET Norway remains the international weather source. WeatherAPI is used only
 * when WEATHERAPI_KEY is configured, because it supplies the percentage chance
 * of rain that MET Norway's global forecast does not expose.
 */
export async function weatherApiPrecipitation(geo: LocationCandidate, date: string): Promise<PrecipitationOverlay | null> {
  const key = process.env.WEATHERAPI_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", key);
  url.searchParams.set("q", `${geo.lat.toFixed(4)},${geo.lon.toFixed(4)}`);
  url.searchParams.set("days", "10");
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "FamilyWeather/1.0 (https://thefamilyweather.com)" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const day = Array.isArray(payload?.forecast?.forecastday)
      ? payload.forecast.forecastday.find((item: any) => item?.date === date)
      : null;
    if (!day) return null;

    const hourly = Array.isArray(day.hour)
      ? day.hour.map((item: any) => ({
        time: typeof item?.time === "string" ? item.time.replace(" ", "T") : "",
        probabilityPct: numberOrNull(item?.chance_of_rain),
        amountMm: numberOrNull(item?.precip_mm),
        source: "weatherapi" as const,
      })).filter((item: { time: string }) => item.time)
      : [];

    return {
      dayProbabilityPct: numberOrNull(day?.day?.daily_chance_of_rain),
      hourly,
    };
  } catch {
    // Supplemental data must never take down the working MET/NWS forecast.
    return null;
  }
}
