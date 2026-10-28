-- Keyed digest of the normalized address; never store the address in this limiter.
CREATE TABLE IF NOT EXISTS kiraquest_otp_send_limits (
  address_hash text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS kiraquest_otp_send_limits_time_idx ON kiraquest_otp_send_limits(last_sent_at);
