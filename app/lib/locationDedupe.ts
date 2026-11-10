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

function distanceKm(left: DedupeLocation, right: DedupeLocation) {
  const latKm = (left.lat - right.lat) * 111;
  const lonKm = (left.lon - right.lon) * 111 * Math.cos(((left.lat + right.lat) / 2) * Math.PI / 180);
  return Math.hypot(latKm, lonKm);
}

export function dedupeLocationCandidates<T extends DedupeLocation>(candidates: T[], limit: number) {
  const kept: T[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    const duplicate = kept.some((existing) => {
      if (normalized(existing.label) === normalized(candidate.label)) return true;
      if (normalized(existing.name) !== normalized(candidate.name)) return false;
      if (distanceKm(existing, candidate) < 2) return true;
      return cityLike(existing) && cityLike(candidate)
        && normalized(existing.admin1) === normalized(candidate.admin1)
        && normalized(existing.country) === normalized(candidate.country);
    });
    if (!duplicate) kept.push(candidate);
    if (kept.length === limit) break;
  }
  return kept;
}
