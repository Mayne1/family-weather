export type DedupeLocation = {
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

function cityLike(candidate: DedupeLocation) {
  return candidate.provider === "open-meteo" || /^(city|town|village|municipality|administrative|ppl)/i.test(candidate.type);
}

function typeIdentity(candidate: DedupeLocation) {
  const type = normalized(candidate.type);
  if (cityLike(candidate)) return "city";
  if (/post|zip/.test(type)) return "postal";
  if (/airport|aerodrome/.test(type)) return "airport";
  if (/hotel|resort|motel/.test(type)) return "lodging";
  if (/park|garden|reserve/.test(type)) return "park";
  if (/house|building|address|road|street/.test(type)) return "address";
  return type;
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
      if (normalized(existing.name) !== normalized(candidate.name)) return false;
      if (typeIdentity(existing) !== typeIdentity(candidate)) return false;
      return distanceKm(existing, candidate) < 2 && sameRegion(existing, candidate);
    });
    if (!duplicate) kept.push(candidate);
    if (kept.length === limit) break;
  }
  return kept;
}
