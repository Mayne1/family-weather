CREATE TABLE IF NOT EXISTS event_entitlements (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  product_code TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  distribution_method TEXT NOT NULL DEFAULT 'both',
  email_limit INTEGER NOT NULL DEFAULT 10,
  email_consumed INTEGER NOT NULL DEFAULT 0,
  share_rsvp_limit INTEGER NOT NULL DEFAULT 2147483647,
  share_invite_token TEXT,
  stripe_checkout_session_id TEXT,
  stripe_checkout_url TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  pending_product_code TEXT,
  pending_amount_cents INTEGER,
  promotion_code_hash TEXT,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_entitlements ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;
ALTER TABLE event_entitlements ADD COLUMN IF NOT EXISTS pending_product_code TEXT;
ALTER TABLE event_entitlements ADD COLUMN IF NOT EXISTS pending_amount_cents INTEGER;
ALTER TABLE event_entitlements ADD COLUMN IF NOT EXISTS promotion_code_hash TEXT;

-- Replace the launch-era exact-value constraints with capability constraints.
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_status_check;
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_distribution_method_check;
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_email_limit_check;
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_email_consumed_check;
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_share_rsvp_limit_check;
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_amount_cents_check;
ALTER TABLE event_entitlements DROP CONSTRAINT IF EXISTS event_entitlements_pending_amount_cents_check;

ALTER TABLE event_entitlements ALTER COLUMN amount_cents SET DEFAULT 0;
ALTER TABLE event_entitlements ALTER COLUMN distribution_method SET DEFAULT 'both';
ALTER TABLE event_entitlements ALTER COLUMN email_limit SET DEFAULT 10;
ALTER TABLE event_entitlements ALTER COLUMN share_rsvp_limit SET DEFAULT 2147483647;

-- Existing launch purchases keep everything they bought and receive both distribution paths.
UPDATE event_entitlements
SET status='free', product_code='free_event', amount_cents=0, distribution_method='both', email_limit=10,
    pending_product_code='event_plus_599', pending_amount_cents=599, share_rsvp_limit=2147483647, updated_at=now()
WHERE status='pending' AND product_code='family_weather_launch_event_599';
UPDATE event_entitlements
SET product_code='event_plus_599', distribution_method='both', email_limit=GREATEST(email_limit,25),
    share_rsvp_limit=2147483647, updated_at=now()
WHERE status='paid' AND product_code='family_weather_launch_event_599';
UPDATE event_entitlements SET share_rsvp_limit=2147483647 WHERE share_rsvp_limit <> 2147483647;

ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_status_check CHECK (status IN ('free','pending','paid','legacy'));
ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_distribution_method_check CHECK (distribution_method IN ('email','share_link','both','legacy'));
ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_email_limit_check CHECK (email_limit BETWEEN 0 AND 1000);
ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_email_consumed_check CHECK (email_consumed BETWEEN 0 AND email_limit);
ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_share_rsvp_limit_check CHECK (share_rsvp_limit > 0);
ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_amount_cents_check CHECK (amount_cents >= 0);
ALTER TABLE event_entitlements ADD CONSTRAINT event_entitlements_pending_amount_cents_check CHECK (pending_amount_cents IS NULL OR pending_amount_cents > 0);

CREATE UNIQUE INDEX IF NOT EXISTS event_entitlements_checkout_session_idx ON event_entitlements (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS event_entitlements_share_token_idx ON event_entitlements (share_invite_token) WHERE share_invite_token IS NOT NULL;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS delivery_method TEXT;

CREATE TABLE IF NOT EXISTS share_link_rsvps (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_token TEXT NOT NULL REFERENCES invites(token) ON DELETE CASCADE,
  response_key TEXT NOT NULL UNIQUE,
  responder_email TEXT,
  responder_name TEXT NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('yes', 'maybe', 'no')),
  guests_count INTEGER NOT NULL DEFAULT 0 CHECK (guests_count BETWEEN 0 AND 50),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_link_rsvps_event_idx ON share_link_rsvps (event_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS share_link_rsvps_email_idx ON share_link_rsvps (invite_token, lower(responder_email)) WHERE responder_email IS NOT NULL AND responder_email <> '';

CREATE TABLE IF NOT EXISTS promotion_codes (
  code_hash TEXT PRIMARY KEY,
  code_label TEXT,
  product_code TEXT NOT NULL CHECK (product_code IN ('clean_event_199','event_plus_599','large_event_1999','bigger_event_3999','organization_event_6999','major_event_11999')),
  created_by_uid TEXT NOT NULL,
  redeemed_event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  redeemed_by_uid TEXT,
  redeemed_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE promotion_codes ADD COLUMN IF NOT EXISTS code_label TEXT;
CREATE INDEX IF NOT EXISTS promotion_codes_created_idx ON promotion_codes (created_at DESC);

CREATE TABLE IF NOT EXISTS commerce_events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  owner_uid TEXT,
  event_name TEXT NOT NULL CHECK (event_name IN ('event_created','invitation_saved','share_link_created','email_invitation_sent','checkout_started','purchase_completed','promotion_redeemed','first_rsvp')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_events_name_created_idx ON commerce_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_events_event_idx ON commerce_events (event_id, created_at DESC) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_events_first_rsvp_idx ON commerce_events (event_id, event_name) WHERE event_name='first_rsvp' AND event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS family_weather_migrations (migration_key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM family_weather_migrations WHERE migration_key = 'grandfather_events_before_launch_pricing_v1') THEN
    INSERT INTO event_entitlements (event_id, status, product_code, amount_cents, currency, distribution_method, purchased_at)
    SELECT id, 'legacy', 'legacy_pre_launch', 0, 'usd', 'legacy', now() FROM events ON CONFLICT (event_id) DO NOTHING;
    INSERT INTO family_weather_migrations (migration_key) VALUES ('grandfather_events_before_launch_pricing_v1');
  END IF;
END $$;
