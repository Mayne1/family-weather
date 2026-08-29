import { backendUrl } from "./serverConfig";

export type LocationCandidate = {
  id: string;
  input: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  countryCode: string;
  country: string;
  admin1: string;
  locality: string;
  postalCode: string;
  type: string;
  provider: "family-weather" | "openstreetmap" | "open-meteo";
  score: number;
};

type NominatimResult = {
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  type?: string;
  importance?: number;
  address?: Record<string, string | undefined>;
  namedetails?: Record<string, string | undefined>;
};

type OpenMeteoResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  postcodes?: string[];
  feature_code?: string;
  population?: number;
};

const SEARCH_HEADERS = {
  Accept: "application/json",
  "Accept-Language": "en",
  "User-Agent": "FamilyWeather/1.0 (https://thefamilyweather.com)",
};

const curatedLocations = [
  {
    aliases: ["sandals montego bay", "sandals montego bay resort"],
    candidate: {
      id: "curated-sandals-montego-bay",
      name: "Sandals Montego Bay",
      label: "Sandals Montego Bay, 100 Kent Avenue, Montego Bay, Jamaica",
      lat: 18.4936205,
      lon: -77.9261888,
      countryCode: "JM",
      country: "Jamaica",
      admin1: "Saint James",
      locality: "Montego Bay",
      postalCode: "",
      type: "resort",
      provider: "family-weather" as const,
      score: 1,
    },
  },
];

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function englishName(result: NominatimResult) {
  return clean(result.namedetails?.["name:en"] || result.namedetails?.name || result.name);
}

function cityFromAddress(address: Record<string, string | undefined> = {}) {
  return clean(address.city || address.town || address.village || address.municipality || address.hamlet);
}

function fromNominatim(input: string, result: NominatimResult): LocationCandidate | null {
  const lat = Number(result.lat);
  const lon = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const address = result.address || {};
  const streetAddress = address.house_number && address.road ? `${address.house_number} ${address.road}` : "";
  const name = clean(streetAddress || englishName(result) || clean(result.display_name).split(",")[0]);
  const country = clean(address.country);
  const admin1 = clean(address.state || address.region || address.county);
  const locality = cityFromAddress(address);
  const concise = [name, locality && normalized(locality) !== normalized(name) ? locality : "", admin1, clean(address.postcode), country]
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((candidate) => normalized(candidate) === normalized(value)) === index)
    .join(", ");
  return {
    id: `osm-${result.place_id || `${lat}-${lon}`}`,
    input,
    name,
    label: concise || clean(result.display_name) || input,
    lat,
    lon,
    countryCode: clean(address.country_code).toUpperCase(),
    country,
    admin1,
    locality,
    postalCode: clean(address.postcode),
    type: clean(result.type || "place"),
    provider: "openstreetmap",
    score: Number(result.importance) || 0,
  };
}

function fromOpenMeteo(input: string, result: OpenMeteoResult): LocationCandidate | null {
  const lat = Number(result.latitude);
  const lon = Number(result.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = clean(result.name);
  const admin1 = clean(result.admin1 || result.admin2);
  const country = clean(result.country);
  return {
    id: `geonames-${result.id || `${lat}-${lon}`}`,
    input,
    name,
    label: [name, admin1, country].filter(Boolean).join(", ") || input,
    lat,
    lon,
    countryCode: clean(result.country_code).toUpperCase(),
    country,
    admin1,
    locality: name,
    postalCode: clean(result.postcodes?.[0]),
    type: clean(result.feature_code || "place"),
    provider: "open-meteo",
    score: Math.min(0.8, 0.15 + Math.log10(Math.max(1, Number(result.population) || 1)) / 10),
  };
}

function curatedMatches(input: string) {
  const needle = normalized(input);
  if (needle.length < 3) return [];
  return curatedLocations
    .filter(({ aliases }) => aliases.some((alias) => normalized(alias).startsWith(needle) || needle.startsWith(normalized(alias))))
    .map(({ candidate }) => ({ ...candidate, input }));
}

function providerQuery(input: string) {
  const value = normalized(input);
  if (/^\d{5}(?: \d{4})?$/.test(value)) return `${input}, United States`;
  if (/^(great )?pyramids? of giza( egypt)?$/.test(value) || value === "giza pyramids") {
    return "Great Pyramid of Giza, Egypt";
  }
  return input;
}

async function zipCandidate(input: string, zip: string): Promise<LocationCandidate | null> {
  try {
    const response = await fetch(
      backendUrl(`/weather/geocode?zip=${encodeURIComponent(zip)}`),
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    const data = await response.json();
    const lat = Number(data?.lat);
    const lon = Number(data?.lon);
    if (!response.ok || !data?.ok || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      id: `family-weather-zip-${zip}`,
      input,
      name: clean(data.label || zip),
      label: clean(data.label || zip),
      lat,
      lon,
      countryCode: "US",
      country: "United States",
      admin1: "",
      locality: clean(data.label || zip),
      postalCode: zip,
      type: "postcode",
      provider: "family-weather",
      score: 1,
    };
  } catch {
    return null;
  }
}

async function nominatimCandidates(input: string, limit: number) {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", providerQuery(input));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("namedetails", "1");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("accept-language", "en");
    const response = await fetch(url, { headers: SEARCH_HEADERS, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json() as NominatimResult[];
    return data.map((result) => fromNominatim(input, result)).filter((value): value is LocationCandidate => Boolean(value));
  } catch {
    return [];
  }
}

async function openMeteoCandidates(input: string, limit: number) {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", input);
    url.searchParams.set("count", String(limit));
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    const data = await response.json();
    return (data?.results || []).map((result: OpenMeteoResult) => fromOpenMeteo(input, result)).filter((value: LocationCandidate | null): value is LocationCandidate => Boolean(value));
  } catch {
    return [];
  }
}

function dedupe(candidates: LocationCandidate[], limit: number) {
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const key = `${normalized(candidate.name)}:${candidate.lat.toFixed(3)}:${candidate.lon.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export async function searchLocations(rawInput: string, limit = 6) {
  const input = clean(rawInput).slice(0, 240);
  if (input.length < 2) return [];

  const embeddedZip = input.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1];
  if (embeddedZip) {
    const zip = await zipCandidate(input, embeddedZip);
    if (zip) return [zip];
  }

  const curated = curatedMatches(input);
  const [osm, cities] = await Promise.all([
    nominatimCandidates(input, Math.max(limit, 6)),
    openMeteoCandidates(input, Math.max(limit, 6)),
  ]);
  return dedupe([...curated, ...osm, ...cities], limit);
}

export function isValidLocationCandidate(value: unknown): value is LocationCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocationCandidate>;
  return Number.isFinite(Number(candidate.lat)) && Number.isFinite(Number(candidate.lon))
    && Number(candidate.lat) >= -90 && Number(candidate.lat) <= 90
    && Number(candidate.lon) >= -180 && Number(candidate.lon) <= 180
    && Boolean(clean(candidate.label));
}

export function isAmbiguousLocation(input: string, candidates: LocationCandidate[]) {
  if (candidates.length < 2 || /[,\d]/.test(input) || candidates[0].provider === "family-weather") return false;
  const needle = normalized(input);
  const exact = candidates.filter((candidate) => normalized(candidate.name) === needle);
  if (exact.length < 2) return false;
  return exact[0].score - exact[1].score < 0.15;
}

export class AmbiguousLocationError extends Error {
  suggestions: LocationCandidate[];

  constructor(query: string, suggestions: LocationCandidate[]) {
    super(`We found several places named "${query}". Choose the one you mean.`);
    this.suggestions = suggestions;
  }
}

export async function resolveLocation(query: string, supplied?: unknown) {
  if (isValidLocationCandidate(supplied)) {
    return { ...supplied, lat: Number(supplied.lat), lon: Number(supplied.lon), input: supplied.input || query };
  }
  const suggestions = await searchLocations(query, 6);
  if (!suggestions.length) {
    throw new Error(`We couldn't find "${query}". Try a venue, landmark, address, city, or postal code.`);
  }
  if (isAmbiguousLocation(query, suggestions)) throw new AmbiguousLocationError(query, suggestions);
  return suggestions[0];
}
