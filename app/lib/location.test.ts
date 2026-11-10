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

test("location choices keep same-named cities in the same state when coordinates show they are distinct", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "north", name: "Springfield", locality: "Springfield", label: "Springfield, California, United States", lat: 38.1, lon: -121.2 }),
    candidate({ id: "south", name: "Springfield", locality: "Springfield", label: "Springfield, California, United States", lat: 36.8, lon: -120.4, provider: "open-meteo", type: "PPL" }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["north", "south"]);
});

test("location choices keep nearby same-named places when their types are unrelated", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "town", name: "Fairview", locality: "Fairview", label: "Fairview, California, United States", lat: 37.95, lon: -121.29, type: "city" }),
    candidate({ id: "park", name: "Fairview", locality: "Stockton", label: "Fairview Park, Stockton, California, United States", lat: 37.951, lon: -121.291, type: "park", score: 0.6 }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["town", "park"]);
});

test("location choices still collapse nearby duplicate places when geographic and type identity agree", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "primary", name: "Fairview", locality: "Fairview", label: "Fairview, California, United States", lat: 37.95, lon: -121.29, type: "city", score: 0.8 }),
    candidate({ id: "duplicate", name: "Fairview", locality: "Fairview", label: "Fairview, California, United States", lat: 37.951, lon: -121.291, provider: "open-meteo", type: "PPL", score: 0.6 }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["primary"]);
});
