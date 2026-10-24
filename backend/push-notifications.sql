CREATE TABLE IF NOT EXISTS fw_push_subscriptions (
 id text PRIMARY KEY, owner_uid text NOT NULL, endpoint text NOT NULL UNIQUE,
 p256dh text NOT NULL, auth text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fw_push_owner ON fw_push_subscriptions(owner_uid);
CREATE TABLE IF NOT EXISTS fw_push_deliveries (
 id bigserial PRIMARY KEY, subscription_id text NOT NULL REFERENCES fw_push_subscriptions(id) ON DELETE CASCADE,
 event_key text NOT NULL, payload jsonb NOT NULL, attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), claimed_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(subscription_id,event_key)
);
CREATE INDEX IF NOT EXISTS fw_push_pending ON fw_push_deliveries(available_at);
