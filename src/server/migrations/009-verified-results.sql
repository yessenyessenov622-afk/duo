CREATE TABLE IF NOT EXISTS kq_verified_lessons (
  user_id text NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mint integer NOT NULL CHECK (mint > 0),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS kq_verified_lessons_period_idx ON kq_verified_lessons(completed_at, user_id);
CREATE TABLE IF NOT EXISTS kq_ranking_privacy (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  hidden boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS kq_verified_rate_limit (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts integer NOT NULL DEFAULT 0
);
