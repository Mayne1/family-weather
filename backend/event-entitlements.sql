CREATE TABLE IF NOT EXISTS event_entitlements (
  event_id BIGINT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'legacy')),
  product_code TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  distribution_method TEXT NOT NULL CHECK (distribution_method IN ('email', 'share_link', 'legacy')),
  email_limit INTEGER NOT NULL DEFAULT 25 CHECK (email_limit = 25),
  email_consumed INTEGER NOT NULL DEFAULT 0 CHECK (email_consumed BETWEEN 0 AND email_limit),
  share_rsvp_limit INTEGER NOT NULL DEFAULT 50 CHECK (share_rsvp_limit = 50),
  share_invite_token TEXT,
  stripe_checkout_session_id TEXT,
  stripe_checkout_url TEXT,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_entitlements ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;
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

CREATE TABLE IF NOT EXISTS family_weather_migrations (migration_key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM family_weather_migrations WHERE migration_key = 'grandfather_events_before_launch_pricing_v1') THEN
    INSERT INTO event_entitlements (event_id, status, product_code, amount_cents, currency, distribution_method, purchased_at)
    SELECT id, 'legacy', 'legacy_pre_launch', 0, 'usd', 'legacy', now() FROM events ON CONFLICT (event_id) DO NOTHING;
    INSERT INTO family_weather_migrations (migration_key) VALUES ('grandfather_events_before_launch_pricing_v1');
  END IF;
END $$;
