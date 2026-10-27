-- Private account membership is independent of sales and one-use promotions.
CREATE TABLE IF NOT EXISTS family_access_codes (
 code_hash TEXT PRIMARY KEY, created_by_uid TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), disabled_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS family_members (
 owner_uid TEXT PRIMARY KEY, code_hash TEXT NOT NULL REFERENCES family_access_codes(code_hash),
 joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
