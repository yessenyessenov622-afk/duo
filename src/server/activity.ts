import "server-only";
import type { PoolClient } from "pg";
import { activityTiming } from "@/src/lib/activity-timing";

// All decisions use the database clock. The locked account row serializes tabs.
export async function recordUserActivity(client: PoolClient, userId: string, studying: boolean) {
  await client.query('INSERT INTO kq_user_activity (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  const result = await client.query(`SELECT last_visit, last_study_signal
    FROM kq_user_activity WHERE user_id = $1 FOR UPDATE`, [userId]);
  const row = result.rows[0];
  const clock = await client.query('SELECT clock_timestamp() AS now');
  const nowDate = new Date(clock.rows[0].now);
  const now = nowDate.getTime();
  const lastVisit = row.last_visit ? new Date(row.last_visit).getTime() : null;
  const previousStudy = row.last_study_signal ? new Date(row.last_study_signal).getTime() : null;
  // A long gap is not counted; short intervals from parallel tabs cannot overlap.
  const { newVisit, seconds } = activityTiming(now, lastVisit, previousStudy, studying);
  await client.query(`UPDATE kq_user_activity SET last_visit = $4,
    visits = visits + $2, last_study_signal = CASE WHEN $3 THEN $4::timestamptz ELSE NULL END WHERE user_id = $1`, [userId, newVisit ? 1 : 0, studying, nowDate]);
  await client.query("INSERT INTO kq_active_days (user_id, day) VALUES ($1, ($2::timestamptz AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING", [userId, nowDate]);
  if (newVisit) await client.query('INSERT INTO kq_user_visits (user_id, started_at) VALUES ($1, $2)', [userId, nowDate]);
  if (seconds) await client.query('INSERT INTO kq_study_samples (user_id, seconds, captured_at) VALUES ($1, $2, $3)', [userId, seconds, nowDate]);
}

export async function recordGuestActivity(client: PoolClient, tokenHash: string) {
  await client.query("DELETE FROM kq_guest_activity WHERE last_visit < CURRENT_TIMESTAMP - INTERVAL '1 day'");
  const result = await client.query(`INSERT INTO kq_guest_activity (token_hash) VALUES ($1)
    ON CONFLICT (token_hash) DO UPDATE SET last_visit = CURRENT_TIMESTAMP
    WHERE kq_guest_activity.last_visit < CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    RETURNING token_hash`, [tokenHash]);
  if (result.rowCount) await client.query('INSERT INTO kq_guest_visits DEFAULT VALUES');
  else await client.query('UPDATE kq_guest_activity SET last_visit = CURRENT_TIMESTAMP WHERE token_hash = $1', [tokenHash]);
}
