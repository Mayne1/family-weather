import assert from "node:assert/strict";
import test from "node:test";
import { dedupeLocationCandidates } from "./locationDedupe.ts";
import type { LocationCandidate } from "./location.ts";

function candidate(overrides: Partial<LocationCandidate>): LocationCandidate {
  return {
    id: "test", input: "Stockton", name: "Stockton", label: "Stockton, California, United States",
    lat: 37.9577, lon: -121.2908, countryCode: "US", country: "United States", admin1: "California",
    locality: "Stockton", postalCode: "", type: "city", provider: "openstreetmap", score: 0.7,
    ...overrides,
  };
}

test("location choices collapse the same city returned by two providers", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "osm", lat: 37.9577, lon: -121.2908, provider: "openstreetmap", type: "city", score: 0.7 }),
    candidate({ id: "meteo", lat: 37.9571, lon: -121.2902, provider: "open-meteo", type: "PPLA2", score: 0.5 }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["osm"]);
});

test("location choices keep genuinely different same-named cities", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "ca", admin1: "California", lat: 37.95, lon: -121.29 }),
    candidate({ id: "nj", admin1: "New Jersey", lat: 40.1, lon: -74.7, label: "Stockton, New Jersey, United States" }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["ca", "nj"]);
});
