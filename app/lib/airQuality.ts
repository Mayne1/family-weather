// Open-Meteo / CAMS current modeled air quality, expressed on the US AQI scale.
export function normalizeAirQuality(current: { us_aqi?: unknown; time?: unknown } | null | undefined, now = Date.now()) {
  const value = current?.us_aqi;
  const time = current?.time;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
      typeof time !== "number" || !Number.isFinite(time) ||
      now - time * 1000 > 3 * 60 * 60 * 1000 || time * 1000 - now > 60 * 60 * 1000) return null;
  const aqi = Math.round(value);
  const category = aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : aqi <= 150 ? "Unhealthy for sensitive groups" : aqi <= 200 ? "Unhealthy" : aqi <= 300 ? "Very unhealthy" : "Hazardous";
  return { us_aqi: aqi, category, updated_at: new Date(time * 1000).toISOString(), source: "Open-Meteo / CAMS", estimated: true };
}
