export function localWeatherDate(timeZone?: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

// NWS removes the completed daytime period in the evening. Keep tonight on
// its own calendar date instead of silently jumping to tomorrow.
export function dailyPeriods<T extends { startTime: string; isDaytime: boolean }>(periods: T[]): T[] {
  const days = new Set(periods.filter(p => p.isDaytime).map(p => p.startTime.slice(0, 10)));
  const seen = new Set<string>();
  return periods.filter(p => {
    const date = p.startTime.slice(0, 10);
    if ((!p.isDaytime && days.has(date)) || seen.has(date)) return false;
    seen.add(date);
    return true;
  });
}
