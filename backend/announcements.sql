CREATE TABLE IF NOT EXISTS fw_announcements (
 id text PRIMARY KEY, owner_uid text NOT NULL, title text NOT NULL, message text NOT NULL,
 theme text NOT NULL DEFAULT 'forest', created_at timestamptz NOT NULL DEFAULT now(), closed boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS fw_announcements_owner ON fw_announcements(owner_uid);
CREATE TABLE IF NOT EXISTS fw_announcement_replies (
 id bigserial PRIMARY KEY, announcement_id text NOT NULL REFERENCES fw_announcements(id) ON DELETE CASCADE,
 name text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fw_sms_orders (
 id text PRIMARY KEY, owner_uid text NOT NULL, announcement_id text NOT NULL REFERENCES fw_announcements(id),
 session_id text UNIQUE, checkout_url text, paid boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fw_sms_wallets (owner_uid text PRIMARY KEY, balance integer NOT NULL DEFAULT 0 CHECK(balance>=0));
CREATE TABLE IF NOT EXISTS fw_sms_sends (
 id text PRIMARY KEY, owner_uid text NOT NULL, announcement_id text NOT NULL REFERENCES fw_announcements(id),
 recipient text NOT NULL, status text NOT NULL DEFAULT 'pending', provider_id text,
 consent_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(announcement_id,recipient)
);
