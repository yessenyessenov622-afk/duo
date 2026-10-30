import { withOwner } from "@/src/server/owner";
import { apiError, PRIVATE_HEADERS } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return await withOwner(request, async client => {
      const result = await client.query(`SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS day,
        COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS week,
        COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS month
        FROM "user"`);
      const row = result.rows[0];
      const activity = await client.query(`WITH periods AS (
        SELECT 'day' AS name, date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS start
        UNION ALL SELECT 'week', date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        UNION ALL SELECT 'month', date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
      ) SELECT p.name,
        (SELECT COUNT(*) FROM kq_user_visits v WHERE v.started_at >= p.start) AS visits,
        (SELECT COUNT(DISTINCT user_id) FROM kq_active_days a WHERE a.day >= (p.start AT TIME ZONE 'UTC')::date) AS active,
        (SELECT COUNT(*) FROM kq_guest_visits g WHERE g.started_at >= p.start) AS guests,
        (SELECT COALESCE(SUM(seconds), 0) FROM kq_study_samples s WHERE s.captured_at >= p.start) AS seconds,
        (SELECT COUNT(*) FROM kq_verified_lessons v WHERE v.completed_at >= p.start) AS lessons,
        (SELECT COALESCE(SUM(mint), 0) FROM kq_verified_lessons v WHERE v.completed_at >= p.start) AS mint
        FROM periods p`);
      const start = await client.query('SELECT started_at FROM kq_activity_start WHERE singleton = true');
      const recentlyActive = await client.query("SELECT COUNT(*) AS total FROM kq_user_activity WHERE last_visit >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'");
      const periods = Object.fromEntries(activity.rows.map(item => [item.name, { visits: Number(item.visits), active: Number(item.active), guests: Number(item.guests), seconds: Number(item.seconds), lessons: Number(item.lessons), mint: Number(item.mint) }]));
      return Response.json({ total: Number(row.total), day: Number(row.day), week: Number(row.week), month: Number(row.month), periods, startedAt: start.rows[0]?.started_at ?? null, recentlyActive: Number(recentlyActive.rows[0].total) }, { headers: PRIVATE_HEADERS });
    });
  } catch (error) { return apiError(error); }
}
