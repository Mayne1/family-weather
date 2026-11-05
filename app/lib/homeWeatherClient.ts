// Reuse the same public reading between the homepage and the weather strip.
// No account data is stored here, and coordinates remain part of every key.
const TTL_MS = 120_000;
const MAX_ENTRIES = 16;
const STORAGE_KEY = "family-weather-snapshots-v1";
type Reading = { data: Record<string, unknown>; expiresAt: number };
const readings = new Map<string, Reading>();
const pending = new Map<string, Promise<Record<string, unknown>>>();

function isReading(value: unknown): value is Reading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Reading;
  return Number.isFinite(reading.expiresAt) && reading.expiresAt > Date.now()
    && reading.expiresAt <= Date.now() + TTL_MS
    && reading.data?.ok === true;
}

function restore(key: string) {
  const local = readings.get(key);
  if (isReading(local)) return local.data;
  readings.delete(key);
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(stored)) {
      for (const [url, value] of stored.slice(-MAX_ENTRIES)) {
        if (typeof url === "string" && isReading(value)) readings.set(url, value);
      }
      return readings.get(key)?.data;
    }
  } catch { /* Storage is optional, including in private browsing. */ }
}

export async function fetchHomeWeather<T>(query = ""): Promise<T> {
  const params = new URLSearchParams(query);
  params.sort();
  const suffix = params.toString();
  const url = `/api/weather/home${suffix ? `?${suffix}` : ""}`;
  const cached = restore(url);
  if (cached) return cached as T;
  const active = pending.get(url);
  if (active) return active as Promise<T>;
  const task = (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    const data = await response.json();
    if (!response.ok || data?.ok !== true) throw new Error("Weather is temporarily unavailable.");
    const fetchedAt = typeof data.fetched_at === "string" ? Date.parse(data.fetched_at) : Date.now();
    readings.set(url, { data, expiresAt: Math.min(Date.now(), Number.isFinite(fetchedAt) ? fetchedAt : Date.now()) + TTL_MS });
    for (const [key, value] of readings) if (!isReading(value)) readings.delete(key);
    while (readings.size > MAX_ENTRIES) readings.delete(readings.keys().next().value!);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...readings])); } catch { /* Optional cache. */ }
    return data as Record<string, unknown>;
  })();
  pending.set(url, task);
  try { return await task as T; }
  finally { pending.delete(url); }
}
