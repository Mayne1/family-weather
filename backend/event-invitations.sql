CREATE TABLE IF NOT EXISTS event_invitations (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL,
  headline TEXT,
  honoree_names TEXT,
  message TEXT,
  special_instructions TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_invitations_design_id_idx
  ON event_invitations(design_id);
