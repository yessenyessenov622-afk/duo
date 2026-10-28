CREATE TABLE IF NOT EXISTS kq_account_data (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  progress jsonb NOT NULL,
  settings jsonb NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{"favoriteLooks":[],"mapFilter":"all-courses","distractionFree":false}'::jsonb,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kq_guest_import (
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  import_id text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, import_id)
);

CREATE TABLE IF NOT EXISTS kq_account_wallpaper (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  image_bytes bytea NOT NULL CHECK (octet_length(image_bytes) <= 2097152),
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
