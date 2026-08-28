CREATE TABLE IF NOT EXISTS event_locations (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  normalized_label TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  country_code VARCHAR(2),
  country TEXT,
  admin1 TEXT,
  locality TEXT,
  postal_code TEXT,
  place_type TEXT,
  provider TEXT NOT NULL,
  provider_place_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_locations_coordinates_idx
  ON event_locations (latitude, longitude);
