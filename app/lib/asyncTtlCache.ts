// Public weather data only. Each process keeps a bounded cache and shares work
// between simultaneous requests. Failures are never saved as fresh readings.
export function createAsyncTtlCache<T>({ ttlMs, maxEntries, now = Date.now }: {
  ttlMs: number; maxEntries: number; now?: () => number;
}) {
  const values = new Map<string, { value: T; expiresAt: number }>();
  const pending = new Map<string, Promise<T>>();
  return async function get(key: string, load: () => Promise<T>, canCache: (value: T) => boolean) {
    const saved = values.get(key);
    if (saved && saved.expiresAt > now()) {
      values.delete(key);
      values.set(key, saved);
      return saved.value;
    }
    values.delete(key);
    const existing = pending.get(key);
    if (existing) return existing;
    const task = Promise.resolve().then(load).then(value => {
      if (canCache(value)) {
        values.set(key, { value, expiresAt: now() + ttlMs });
        while (values.size > maxEntries) values.delete(values.keys().next().value!);
      }
      return value;
    });
    // Avoid retaining unbounded in-flight keys during a burst of unique places.
    const tracked = pending.size < maxEntries;
    if (tracked) pending.set(key, task);
    try { return await task; }
    finally { if (tracked) pending.delete(key); }
  };
}
