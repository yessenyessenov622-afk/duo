CREATE TABLE IF NOT EXISTS kiraquest_password_limits (
  address_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0)
);
CREATE INDEX IF NOT EXISTS kiraquest_password_limits_time_idx ON kiraquest_password_limits(window_start);
