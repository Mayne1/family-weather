CREATE TABLE IF NOT EXISTS canva_invitation_jobs (
  state_hash TEXT PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  owner_uid TEXT NOT NULL,
  event_title TEXT NOT NULL,
  capability_hash TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  design_id TEXT,
  status TEXT NOT NULL DEFAULT 'authorizing',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT canva_invitation_jobs_status_check
    CHECK (status IN ('authorizing', 'editing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS canva_invitation_jobs_event_idx
  ON canva_invitation_jobs(event_id, created_at DESC);
