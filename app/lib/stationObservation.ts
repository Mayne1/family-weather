/** Normalize a fresh, station-matched official Aviation Weather METAR. */
export type StationIdentity = { id: string; name?: string; latitude?: number; longitude?: number };
export type StationCurrent = { temp_f: number; feels_like_f?: number | null; wind_mph: number | null; weather_code: number; humidity_pct: number | null; observed_at: string; source: string; station?: StationIdentity };
export function metarCurrent(payload: unknown, station: StationIdentity, now = Date.now()): StationCurrent | null {
 if (!Array.isArray(payload) || !/^[A-Z0-9]{3,8}$/.test(station.id)) return null;
 const rows = payload.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
  .filter(v => v.icaoId === station.id && typeof v.obsTime === 'number' && Number.isFinite(v.obsTime))
  .sort((a,b) => Number(b.obsTime) - Number(a.obsTime));
 for (const row of rows) {
  const observed = Number(row.obsTime) * 1000;
  if (observed > now + 300000 || now - observed >= 7200000 || typeof row.temp !== 'number' || !Number.isFinite(row.temp) || row.temp < -90 || row.temp > 60) continue;
  const wx = String(row.wxString || '').toUpperCase();
  const cover = String(row.cover || '').toUpperCase();
  const code = /TS/.test(wx) ? 211 : /SN|PL|SG|IC/.test(wx) ? 601 : /RA|DZ/.test(wx) ? 500 : /FG|BR|HZ|FU|DU|SA/.test(wx) ? 741 : ({CLR:800,SKC:800,CAVOK:800,FEW:801,SCT:802,BKN:803,OVC:804,VV:804} as Record<string,number>)[cover];
  if (code === undefined) continue;
  return { temp_f: Math.round((row.temp * 9 / 5 + 32) * 10) / 10, feels_like_f: null,
   wind_mph: typeof row.wspd === 'number' && Number.isFinite(row.wspd) && row.wspd >= 0 && row.wspd <= 250 ? Math.round(row.wspd * 1.150779 * 10) / 10 : null,
   weather_code: code, humidity_pct: null, observed_at: new Date(observed).toISOString(), source: 'aviationweather-metar', station };
 }
 return null;
}
export function newerObservation(original: StationCurrent | null, candidate: StationCurrent | null): StationCurrent | null {
 if (!candidate) return original;
 if (!original) return candidate;
 return Date.parse(candidate.observed_at) > Date.parse(original.observed_at) ? candidate : original;
}
export function needsFresherObservation(current: StationCurrent | null, now = Date.now()) {
 return !current || !Number.isFinite(Date.parse(current.observed_at)) || now - Date.parse(current.observed_at) >= 1800000;
}
