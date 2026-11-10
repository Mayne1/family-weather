/** Legacy events have no zone: retain their existing local presentation. */
export function eventTimeOptions(timeZone?: string | null): Intl.DateTimeFormatOptions {
  if (!timeZone) return {};
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(); return { timeZone }; } catch { return {}; }
}
export function eventClockOptions(timeZone?: string | null): Intl.DateTimeFormatOptions {
  return { ...eventTimeOptions(timeZone), ...(timeZone ? { timeZoneName: 'short' as const } : {}) };
}

export function formatEventDateTime(startsAt?: string | null, timeZone?: string | null): string {
  if (!startsAt) return "Date and time to be announced";
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return "Date and time to be announced";
  return date.toLocaleString("en-US", {
    ...eventClockOptions(timeZone), weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
