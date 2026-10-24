// Providers used by the planner expose at most 16 days. Keep a one-day
// timezone margin at either boundary; clearly distant dates go straight to history.
export async function forecastForDate<T>(date: string, lookup: () => Promise<T>, now = new Date()): Promise<T | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose a valid calendar date');
  const target = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(target.getTime()) || target.toISOString().slice(0, 10) !== date) throw new Error('Choose a valid calendar date');
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = (target.getTime() - today) / 86400000;
  if (days < -1 || days > 16) return null;
  return lookup();
}
