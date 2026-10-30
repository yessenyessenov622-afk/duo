import "server-only";
import type { PoolClient } from "pg";
import { getPool } from "@/src/server/db";
import { ApiError } from "@/src/server/http";
import type { ReviewInput } from "@/src/lib/review-validation";

const PAGE_SIZE = 10;
type ReviewRow = { rating: number; body: string; created_at: Date; updated_at: Date; edited: boolean; author: string; mascot: string; mine: boolean };

export async function listReviews(page: number, stars: number | null, sort: "newest" | "rating", viewer: string | null) {
  const pool = getPool();
  const order = sort === "rating" ? "r.rating DESC, r.created_at DESC, r.user_id ASC" : "r.created_at DESC, r.user_id ASC";
  const [list, summary] = await Promise.all([
    pool.query<ReviewRow>(`SELECT r.rating, r.body, r.created_at, r.updated_at, r.edited, COALESCE(NULLIF(u.username, ''), 'Участник') AS author,
      COALESCE(d.settings->'mascot'->>'id', 'neo') AS mascot, (r.user_id = $3) AS mine
      FROM kq_reviews r JOIN "user" u ON u.id = r.user_id LEFT JOIN kq_account_data d ON d.user_id = r.user_id
      WHERE r.hidden_at IS NULL AND ($1::int IS NULL OR r.rating = $1) ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET $2`, [stars, (page - 1) * PAGE_SIZE, viewer]),
    pool.query<{ count: string; average: string | null; filtered: string }>(`SELECT COUNT(*) AS count, AVG(rating) AS average,
      COUNT(*) FILTER (WHERE $1::int IS NULL OR rating = $1) AS filtered FROM kq_reviews WHERE hidden_at IS NULL`, [stars]),
  ]);
  const s = summary.rows[0];
  return { reviews: list.rows, total: Number(s.count), average: s.average === null ? null : Number(s.average), filtered: Number(s.filtered), page, pageSize: PAGE_SIZE };
}

export async function ownReview(client: PoolClient, userId: string) {
  const result = await client.query('SELECT rating, body, created_at, updated_at, edited, hidden_at, hidden_reason FROM kq_reviews WHERE user_id = $1', [userId]);
  return result.rows[0] ?? null;
}

async function limit(client: PoolClient, userId: string) {
  await client.query(`INSERT INTO kq_review_write_limits (user_id, last_action_at)
    VALUES ($1, CURRENT_TIMESTAMP - INTERVAL '30 seconds') ON CONFLICT (user_id) DO NOTHING`, [userId]);
  const result = await client.query(`UPDATE kq_review_write_limits SET last_action_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND last_action_at <= CURRENT_TIMESTAMP - INTERVAL '30 seconds' RETURNING user_id`, [userId]);
  if (!result.rowCount) throw new ApiError(429, "review_rate_limited", "Подождите 30 секунд перед следующим изменением отзыва.", 30);
}

export async function saveReview(client: PoolClient, userId: string, review: ReviewInput) {
  await limit(client, userId);
  await client.query(`INSERT INTO kq_reviews (user_id, rating, body) VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body,
    updated_at = CURRENT_TIMESTAMP, edited = true`, [userId, review.rating, review.body]);
  return ownReview(client, userId);
}

export async function deleteReview(client: PoolClient, userId: string) {
  await limit(client, userId);
  await client.query('DELETE FROM kq_reviews WHERE user_id = $1', [userId]);
}
