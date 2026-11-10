export function weatherMood(code: number | undefined, timeZone?: string, now = new Date()) {
  let hour: number;
  try { hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now)); }
  catch { hour = now.getHours(); }
  if (code != null && code >= 200 && code < 300) return 'storm';
  if (code != null && code >= 300 && code < 600) return 'rain';
  if (code != null && code >= 600 && code < 700) return 'snow';
  if (hour < 6 || hour >= 18) return 'night';
  if (code === 800) return 'sunny';
  if (code === 801 || code === 802) return 'partly';
  if (code != null && ((code >= 700 && code < 800) || code > 802)) return 'cloudy';
  return 'cloudy';
}
