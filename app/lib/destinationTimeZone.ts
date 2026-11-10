import 'server-only';
import { validTimeZone } from '../../backend/event-time';
const cache = new Map<string, { zone: string; expires: number }>();
const inFlight = new Map<string, Promise<string | null>>();
export async function destinationTimeZone(lat: number, lon: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const promise = lookup(lat, lon);
  inFlight.set(key, promise);
  try { return await promise; } finally { inFlight.delete(key); }
}
async function lookup(lat: number, lon: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) return saved.zone;
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat)); url.searchParams.set('longitude', String(lon));
    url.searchParams.set('timezone', 'auto'); url.searchParams.set('forecast_days', '1'); url.searchParams.set('daily', 'weather_code');
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (!validTimeZone(data.timezone)) return null;
    if (cache.size > 1000) cache.clear();
    cache.set(key, { zone: data.timezone, expires: Date.now() + 86400000 });
    return data.timezone;
  } catch { return null; }
}
