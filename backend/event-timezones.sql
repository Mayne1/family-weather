-- Additive: do not infer destinations for old events or rewrite their instants.
ALTER TABLE events ADD COLUMN IF NOT EXISTS time_zone TEXT;
