CREATE TABLE IF NOT EXISTS kiraquest_pin_devices (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  pin_hash text,
  pin_revision integer NOT NULL DEFAULT 0,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  blocked_until timestamptz,
  last_recovery_at timestamptz,
  attempt_window_start timestamptz,
  attempt_window_count integer NOT NULL DEFAULT 0 CHECK (attempt_window_count >= 0),
  PRIMARY KEY (user_id, device_hash)
);

-- A session's original device cannot be changed by deleting a browser cookie.
CREATE TABLE IF NOT EXISTS kiraquest_pin_sessions (
  session_id text PRIMARY KEY REFERENCES "session"(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  device_hash text NOT NULL,
  pin_revision integer,
  unlocked_until timestamptz,
  FOREIGN KEY (user_id, device_hash)
    REFERENCES kiraquest_pin_devices(user_id, device_hash) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS kiraquest_pin_sessions_device_idx
  ON kiraquest_pin_sessions(user_id, device_hash);

CREATE TABLE IF NOT EXISTS kiraquest_pin_recoveries (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL,
  device_hash text NOT NULL,
  old_session_id text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  FOREIGN KEY (user_id, device_hash)
    REFERENCES kiraquest_pin_devices(user_id, device_hash) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS kiraquest_pin_recoveries_expiry_idx
  ON kiraquest_pin_recoveries(expires_at);
