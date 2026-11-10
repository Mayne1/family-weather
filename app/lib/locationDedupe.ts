export type DedupeLocation = {
  id?: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  admin1: string;
  country: string;
  type: string;
  provider: string;
  score: number;
};

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const OPEN_METEO_KIND_LABELS: Record<string, string> = {
  AIRF: "Airfield",
  AIRP: "Airport",
  DAM: "Dam",
  HLL: "Hill",
  LK: "Lake",
  MT: "Mountain",
  PK: "Peak",
  PRK: "Park",
  STM: "Stream",
  PPLX: "Neighborhood",
  PPLL: "Locality",
};

function normalizedType(candidate: DedupeLocation) {
  return candidate.type.trim().toUpperCase();
}

export function openMeteoCityFeature(type: string) {
  return /^(PPL|PPLA\d*|PPLC|PPLG)$/.test(type.trim().toUpperCase());
}

export function openMeteoLocationContext({ name, admin2, admin1, country, featureCode }: {
  name: string;
  admin2: string;
  admin1: string;
  country: string;
  featureCode: string;
}) {
  const label = [name, admin2, admin1, country]
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((candidate) => normalized(candidate) === normalized(value)) === index)
    .join(", ");
  return {
    label,
    locality: openMeteoCityFeature(featureCode) ? name : admin2,
  };
}

export function cityLike(candidate: DedupeLocation) {
  const type = normalizedType(candidate);
  if (candidate.provider === "open-meteo") {
    return openMeteoCityFeature(type);
  }
  return /^(CITY|TOWN|VILLAGE|MUNICIPALITY|HAMLET)$/.test(type);
}

function identityClass(candidate: DedupeLocation) {
  const type = normalizedType(candidate);
  if (cityLike(candidate)) return "city";
  if (candidate.provider === "open-meteo" && type === "PPLX") return "neighborhood";
  if (candidate.provider !== "open-meteo" && /^(QUARTER|NEIGHBOURHOOD|NEIGHBORHOOD|SUBURB)$/.test(type)) return "neighborhood";
  return "";
}

export function locationKindLabel(candidate: DedupeLocation) {
  const type = normalizedType(candidate);
  if (cityLike(candidate)) return "City or town";
  if (candidate.provider === "open-meteo") {
    if (/^ADM\d*$/.test(type) || type === "ADMD") return "Administrative area";
    return OPEN_METEO_KIND_LABELS[type] || "Place";
  }
  if (/^(QUARTER|NEIGHBOURHOOD|NEIGHBORHOOD|SUBURB)$/.test(type)) return "Neighborhood";
  if (/^(AERODROME|AIRPORT)$/.test(type)) return "Airport";
  return candidate.type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Place";
}

export function nominatimFeatureType(result: { addresstype?: string; type?: string }) {
  return String(result.addresstype || result.type || "place").trim();
}

function sameRegion(left: DedupeLocation, right: DedupeLocation) {
  const adminMatches = !left.admin1 || !right.admin1 || normalized(left.admin1) === normalized(right.admin1);
  const countryMatches = !left.country || !right.country || normalized(left.country) === normalized(right.country);
  return adminMatches && countryMatches;
}

function distanceKm(left: DedupeLocation, right: DedupeLocation) {
  const latKm = (left.lat - right.lat) * 111;
  const lonKm = (left.lon - right.lon) * 111 * Math.cos(((left.lat + right.lat) / 2) * Math.PI / 180);
  return Math.hypot(latKm, lonKm);
}

export function dedupeLocationCandidates<T extends DedupeLocation>(candidates: T[], limit: number) {
  const kept: T[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    const duplicate = kept.some((existing) => {
      const sameProvider = normalized(existing.provider) === normalized(candidate.provider);
      if (sameProvider && existing.id && candidate.id && existing.id === candidate.id) return true;
      if (normalized(existing.name) !== normalized(candidate.name)) return false;
      // A loose radius is suitable only for the same city or neighborhood
      // returned by two different geocoders. Venues can legitimately share a
      // name and type within a couple of kilometres, so proximity cannot
      // identify them without a provider identity.
      const existingClass = identityClass(existing);
      const candidateClass = identityClass(candidate);
      if (sameProvider || !existingClass || existingClass !== candidateClass) return false;
      return distanceKm(existing, candidate) < 2 && sameRegion(existing, candidate);
    });
    if (!duplicate) kept.push(candidate);
    if (kept.length === limit) break;
  }
  return kept;
}
