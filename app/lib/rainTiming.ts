import type { HourlyCondition, DecisionWindow } from './decisionSpine';

export function clockLabel(time: string) {
  const hour = Number(time.slice(11, 13));
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function rainTiming(hourly: HourlyCondition[], window: DecisionWindow | null) {
  const rows = hourly.filter(h => h.localTimeKnown !== false).map(h => ({
    time: h.time, label: clockLabel(h.time),
    probability: typeof h.precipitationProbabilityPct === 'number' && Number.isFinite(h.precipitationProbabilityPct) && h.precipitationProbabilityPct >= 0 && h.precipitationProbabilityPct <= 100 ? h.precipitationProbabilityPct : null,
    intervalHours: h.precipitationWindowHours || 1,
    thunder: Boolean(h.thunderRisk || /thunder|lightning/i.test(h.condition || '')),
    inWindow: Boolean(window && h.time >= window.start && h.time <= window.end),
  })).sort((a,b) => a.time.localeCompare(b.time));
  const known = rows.filter(r => r.probability !== null);
  const peak = known.length ? Math.max(...known.map(r => r.probability!)) : null;
  // DecisionWindow.end is the START of its final hourly slot, not the exclusive end.
  const after = window ? rows.filter(r => r.time > window.end) : [];
  const lastHour = window ? Number(window.end.slice(11,13)) : -1;
  const cleanup = after.filter(r => Number(r.time.slice(11,13)) <= lastHour + 2);
  return { rows, peak, peakLabels: known.filter(r => r.probability === peak).map(r => r.label), cleanup };
}
export type RainTiming = ReturnType<typeof rainTiming>;
