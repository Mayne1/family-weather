import type { LocationCandidate } from "./location";

export type AlmanacYear = {
  year: number;
  date: string;
  high_f: number;
  low_f: number;
  precipitation_in: number;
  rain: boolean;
  weather_code: number;
  condition: string;
};

export type AlmanacResult = {
  targetDate: string;
  location: string;
  years: AlmanacYear[];
  averageHighF: number;
  averageLowF: number;
  averageWindMph: number;
  rainYears: number;
  rainFrequencyPct: number;
  typicalWeatherCode: number;
  summary: string;
  source: "open-meteo-archive";
};

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function historicalDates(targetDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(targetDate);
  if (!match) throw new Error("Choose a valid calendar date");
  const targetYear = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!validDate(targetYear, month, day)) throw new Error("Choose a valid calendar date");

  const dates: string[] = [];
  const archiveCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (let year = targetYear - 1; year >= 1940 && dates.length < 5; year -= 1) {
    const candidate = `${year}-${match[2]}-${match[3]}`;
    if (validDate(year, month, day) && candidate <= archiveCutoff) dates.push(candidate);
  }
  if (dates.length < 5) throw new Error("Five years of history are not available for that date");
  return dates;
}

export function archiveWeatherCode(code: number) {
  if (code === 0) return 800;
  if (code === 1) return 801;
  if (code === 2) return 802;
  if (code === 3) return 803;
  if (code === 45 || code === 48) return 741;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 500;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 601;
  if (code >= 95) return 211;
  return 802;
}

export function archiveCondition(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain or showers";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "Snow";
  if (code >= 95) return "Thunderstorms";
  return "Mixed conditions";
}

function average(values: number[]) {
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export async function lookupAlmanac(geo: LocationCandidate, targetDate: string): Promise<AlmanacResult> {
  const requestedDates = historicalDates(targetDate);
  const chronological = [...requestedDates].sort();
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(geo.lat));
  url.searchParams.set("longitude", String(geo.lon));
  url.searchParams.set("start_date", chronological[0]);
  url.searchParams.set("end_date", chronological[chronological.length - 1]);
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Historical weather lookup is temporarily unavailable");
  const payload = await response.json();
  const daily = payload?.daily;
  const indices = new Map<string, number>((daily?.time || []).map((date: string, index: number) => [date, index]));
  const years = requestedDates.flatMap((date): AlmanacYear[] => {
    const index = indices.get(date);
    if (index === undefined) return [];
    const rawCode = Math.round(Number(daily?.weather_code?.[index]) || 0);
    const precipitation = Math.max(0, Number(daily?.precipitation_sum?.[index]) || 0);
    return [{
      year: Number(date.slice(0, 4)),
      date,
      high_f: Math.round(Number(daily?.temperature_2m_max?.[index]) || 0),
      low_f: Math.round(Number(daily?.temperature_2m_min?.[index]) || 0),
      precipitation_in: Math.round(precipitation * 100) / 100,
      rain: precipitation >= 0.01,
      weather_code: archiveWeatherCode(rawCode),
      condition: archiveCondition(rawCode),
    }];
  });
  if (years.length < 3) throw new Error("Enough historical weather was not available for that location and date");

  const rainYears = years.filter((year) => year.rain).length;
  const frequency = Math.round(rainYears / years.length * 100);
  const rawCodes = years.map((year) => year.weather_code);
  const typicalWeatherCode = rawCodes.sort((left, right) => rawCodes.filter((code) => code === right).length - rawCodes.filter((code) => code === left).length)[0];
  const windValues = requestedDates.flatMap((date) => {
    const index = indices.get(date);
    const value = index === undefined ? NaN : Number(daily?.wind_speed_10m_max?.[index]);
    return Number.isFinite(value) ? [value] : [];
  });

  return {
    targetDate,
    location: geo.label,
    years,
    averageHighF: average(years.map((year) => year.high_f)),
    averageLowF: average(years.map((year) => year.low_f)),
    averageWindMph: windValues.length ? average(windValues) : 0,
    rainYears,
    rainFrequencyPct: frequency,
    typicalWeatherCode,
    summary: `Rain was recorded on ${rainYears} of the last ${years.length} matching calendar dates.`,
    source: "open-meteo-archive",
  };
}
