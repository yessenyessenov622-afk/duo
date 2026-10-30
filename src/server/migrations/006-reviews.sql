CREATE TABLE IF NOT EXISTS kq_reviews (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited boolean NOT NULL DEFAULT false,
  hidden_at timestamptz,
  hidden_reason text
);
CREATE INDEX IF NOT EXISTS kq_reviews_public_created_idx ON kq_reviews (created_at DESC, user_id) WHERE hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS kq_reviews_public_rating_idx ON kq_reviews (rating DESC, created_at DESC, user_id) WHERE hidden_at IS NULL;

CREATE TABLE IF NOT EXISTS kq_review_write_limits (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  last_action_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
