CREATE TABLE IF NOT EXISTS kq_activity_start (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO kq_activity_start (singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS kq_user_activity (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  first_visit timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_visit timestamptz,
  visits bigint NOT NULL DEFAULT 0,
  last_study_signal timestamptz
);
CREATE TABLE IF NOT EXISTS kq_user_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS kq_user_visits_period_idx ON kq_user_visits(started_at, user_id);
CREATE TABLE IF NOT EXISTS kq_active_days (
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS kq_active_days_period_idx ON kq_active_days(day, user_id);
CREATE TABLE IF NOT EXISTS kq_guest_activity (
  token_hash text PRIMARY KEY,
  last_visit timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS kq_guest_activity_expiry_idx ON kq_guest_activity(last_visit);
CREATE TABLE IF NOT EXISTS kq_guest_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS kq_guest_visits_period_idx ON kq_guest_visits(started_at);
CREATE TABLE IF NOT EXISTS kq_study_samples (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seconds integer NOT NULL CHECK (seconds BETWEEN 1 AND 20)
);
CREATE INDEX IF NOT EXISTS kq_study_samples_period_idx ON kq_study_samples(captured_at, user_id);
CREATE INDEX IF NOT EXISTS kq_study_samples_user_idx ON kq_study_samples(user_id, captured_at);
