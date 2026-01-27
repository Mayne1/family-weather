// src/lib/apiBox.ts
// Centralized external API calls (weather providers, geocoding, etc.)
// Keep UI components clean by only calling functions from this module.

export type WeatherNow = {
  locationName: string;
  tempF: number;
  condition: string;
  feelsLikeF: number;
  windMph: number;
  humidityPct: number;
  updatedAtISO: string;
};

export type DailyForecast = {
  dateISO: string; // YYYY-MM-DD
  highF: number;
  lowF: number;
  condition: string;
  precipChancePct: number;
};

export type AlertItem = {
  id: string;
  title: string;
  severity: "info" | "watch" | "warning";
  area: string;
};

export type HomeWeatherBundle = {
  now: WeatherNow;
  tenDay: DailyForecast[];
  alerts: AlertItem[];
};

// MVP: mock provider.
// Next: swap to paid provider + caching, without touching UI.
export async function getHomeWeatherBundle(params?: {
  // later: lat/lng, user location, units, etc.
  locationName?: string;
}): Promise<HomeWeatherBundle> {
  const locationName = params?.locationName ?? "Northern California";

  // Simulate network latency so loading states are real
  await new Promise((r) => setTimeout(r, 350));

  const today = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  const tenDay: DailyForecast[] = Array.from({ length: 10 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      dateISO: toISO(d),
      highF: 62 + ((i * 3) % 9),
      lowF: 44 + ((i * 2) % 7),
      condition: i % 3 === 0 ? "Partly Cloudy" : i % 3 === 1 ? "Sunny" : "Light Rain",
      precipChancePct: i % 3 === 2 ? 45 : i % 3 === 0 ? 15 : 5,
    };
  });

  const alerts: AlertItem[] = [
    { id: "a1", title: "Flood Advisory", severity: "watch", area: "Your County" },
    { id: "a2", title: "Red Flag Conditions Possible", severity: "warning", area: "Nearby Region" },
  ];

  return {
    now: {
      locationName,
      tempF: 58,
      feelsLikeF: 56,
      condition: "Cloudy",
      windMph: 11,
      humidityPct: 62,
      updatedAtISO: new Date().toISOString(),
    },
    tenDay,
    alerts,
  };
}
