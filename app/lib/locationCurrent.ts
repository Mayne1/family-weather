export type LocationCurrent = {
  temp_f: number;
  feels_like_f: number | null;
  wind_mph: number | null;
  weather_code: number;
  humidity_pct: number | null;
  observed_at: string;
  source: "open-meteo-current";
};

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function conditionCode(raw: number) {
  if (raw === 0) return 800;
  if (raw === 1) return 801;
  if (raw === 2) return 802;
  if (raw === 3) return 804;
  if (raw === 45 || raw === 48) return 741;
  if ((raw >= 51 && raw <= 67) || (raw >= 80 && raw <= 82)) return 500;
  if ((raw >= 71 && raw <= 77) || (raw >= 85 && raw <= 86)) return 601;
  if (raw >= 95) return 211;
  return 802;
}

export function openMeteoCurrent(payload: unknown, now = Date.now()): LocationCurrent | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const current = root.current;
  if (!current || typeof current !== "object") return null;
  const row = current as Record<string, unknown>;
  const temp = numberOrNull(row.temperature_2m);
  const rawTime = typeof row.time === "string" ? row.time : "";
  const offsetSeconds = numberOrNull(root.utc_offset_seconds);
  if (temp === null || temp < -130 || temp > 140 || !rawTime) return null;

  const includesZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(rawTime);
  let observed = Date.parse(includesZone ? rawTime : `${rawTime}Z`);
  if (!includesZone && offsetSeconds !== null) observed -= offsetSeconds * 1000;
  if (!Number.isFinite(observed) || observed > now + 5 * 60_000 || now - observed >= 2 * 60 * 60_000) return null;

  const feels = numberOrNull(row.apparent_temperature);
  const wind = numberOrNull(row.wind_speed_10m);
  const humidity = numberOrNull(row.relative_humidity_2m);
  const rawCode = numberOrNull(row.weather_code);
  return {
    temp_f: Math.round(temp * 10) / 10,
    feels_like_f: feels !== null && feels >= -150 && feels <= 160 ? Math.round(feels * 10) / 10 : null,
    wind_mph: wind !== null && wind >= 0 && wind <= 250 ? Math.round(wind * 10) / 10 : null,
    weather_code: conditionCode(rawCode === null ? 2 : Math.round(rawCode)),
    humidity_pct: humidity !== null && humidity >= 0 && humidity <= 100 ? Math.round(humidity) : null,
    observed_at: new Date(observed).toISOString(),
    source: "open-meteo-current",
  };
}
