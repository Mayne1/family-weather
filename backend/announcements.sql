CREATE TABLE IF NOT EXISTS fw_announcements (
 id text PRIMARY KEY, owner_uid text NOT NULL, title text NOT NULL, message text NOT NULL,
 theme text NOT NULL DEFAULT 'forest', created_at timestamptz NOT NULL DEFAULT now(), closed boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS fw_announcements_owner ON fw_announcements(owner_uid);
CREATE TABLE IF NOT EXISTS fw_announcement_replies (
 id bigserial PRIMARY KEY, announcement_id text NOT NULL REFERENCES fw_announcements(id) ON DELETE CASCADE,
 name text NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
