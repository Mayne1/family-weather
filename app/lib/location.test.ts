import assert from "node:assert/strict";
import test from "node:test";
import { dedupeLocationCandidates, locationKindLabel, nominatimFeatureType, openMeteoLocationContext } from "./locationDedupe.ts";
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

test("location choices still collapse nearby cross-provider duplicate cities", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "primary", name: "Fairview", locality: "Fairview", label: "Fairview, California, United States", lat: 37.95, lon: -121.29, type: "city", score: 0.8 }),
    candidate({ id: "duplicate", name: "Fairview", locality: "Fairview", label: "Fairview, California, United States", lat: 37.951, lon: -121.291, provider: "open-meteo", type: "PPL", score: 0.6 }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["primary"]);
});

test("location choices preserve nearby same-name same-type venues with distinct provider identities", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "osm-cafe-one", name: "Starbucks", label: "Starbucks, Pacific Avenue, Stockton, California, United States", locality: "Stockton", lat: 37.982, lon: -121.315, type: "cafe", score: 0.8 }),
    candidate({ id: "osm-cafe-two", name: "Starbucks", label: "Starbucks, March Lane, Stockton, California, United States", locality: "Stockton", lat: 37.991, lon: -121.312, type: "cafe", score: 0.7 }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["osm-cafe-one", "osm-cafe-two"]);
});

test("location choices collapse an exact same-provider identity", () => {
  const choices = dedupeLocationCandidates([
    candidate({ id: "osm-42", name: "Victory Park", type: "park", score: 0.8 }),
    candidate({ id: "osm-42", name: "Victory Park", type: "park", score: 0.7 }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["osm-42"]);
});

test("captured Stockton providers collapse the true city and retain accurate feature categories", () => {
  const osmCity = {
    place_id: 321830011,
    lat: 37.9577016,
    lon: -121.290779,
    type: "administrative",
    addresstype: "city",
  };
  const openMeteo = [
    { id: 5399020, name: "Stockton", latitude: 37.9577, longitude: -121.29078, feature_code: "PPLA2", score: 0.7 },
    { id: 5399047, name: "Stockton Metropolitan Airport", latitude: 37.89381, longitude: -121.23911, feature_code: "AIRP", score: 0.3 },
    { id: 5399061, name: "Stockton Creek 672 Dam", latitude: 37.49827, longitude: -119.95934, feature_code: "DAM", score: 0.2 },
  ];
  const choices = dedupeLocationCandidates([
    candidate({
      id: `osm-${osmCity.place_id}`,
      lat: osmCity.lat,
      lon: osmCity.lon,
      type: nominatimFeatureType(osmCity),
      provider: "openstreetmap",
      score: 0.6078898663141631,
    }),
    ...openMeteo.map((result) => candidate({
      id: `geonames-${result.id}`,
      name: result.name,
      label: `${result.name}, California, United States`,
      locality: result.name,
      lat: result.latitude,
      lon: result.longitude,
      type: result.feature_code,
      provider: "open-meteo",
      score: result.score,
    })),
  ], 6);

  assert.equal(choices.filter((choice) => choice.name === "Stockton").length, 1);
  assert.deepEqual(choices.map((choice) => [choice.name, locationKindLabel(choice)]), [
    ["Stockton", "City or town"],
    ["Stockton Metropolitan Airport", "Airport"],
    ["Stockton Creek 672 Dam", "Dam"],
  ]);
});

test("Open-Meteo neighborhood features are not promoted to cities", () => {
  const neighborhood = candidate({
    id: "geonames-5399021",
    name: "Stockton",
    label: "Stockton, California, United States",
    lat: 32.71339,
    lon: -117.12309,
    type: "PPLX",
    provider: "open-meteo",
  });
  assert.equal(locationKindLabel(neighborhood), "Neighborhood");
  assert.deepEqual(openMeteoLocationContext({
    name: "Stockton",
    admin2: "San Diego County",
    admin1: "California",
    country: "United States",
    featureCode: "PPLX",
  }), {
    label: "Stockton, San Diego County, California, United States",
    locality: "San Diego County",
  });
});

test("matching cross-provider neighborhoods collapse without affecting venues", () => {
  const choices = dedupeLocationCandidates([
    candidate({
      id: "osm-stockton-quarter",
      name: "Stockton",
      label: "Stockton, San Diego, California, 92102, United States",
      locality: "San Diego",
      postalCode: "92102",
      lat: 32.7115319,
      lon: -117.125453,
      type: "quarter",
      provider: "openstreetmap",
      score: 0.365,
    }),
    candidate({
      id: "geonames-stockton-neighborhood",
      name: "Stockton",
      label: "Stockton, San Diego County, California, United States",
      locality: "San Diego County",
      lat: 32.71339,
      lon: -117.12309,
      type: "PPLX",
      provider: "open-meteo",
      score: 0.15,
    }),
  ], 6);
  assert.deepEqual(choices.map((choice) => choice.id), ["osm-stockton-quarter"]);
  assert.equal(locationKindLabel(choices[0]), "Neighborhood");
});
