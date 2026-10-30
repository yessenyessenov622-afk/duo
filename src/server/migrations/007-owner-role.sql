CREATE TABLE IF NOT EXISTS kq_owner_role (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  user_id text UNIQUE NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kq_review_moderation_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  author_id text NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('hide', 'restore')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS kq_review_moderation_recent_idx ON kq_review_moderation_log(created_at DESC, id DESC);
