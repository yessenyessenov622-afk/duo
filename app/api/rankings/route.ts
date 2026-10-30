import { getPool } from "@/src/server/db";
import { requireSession } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const metric = url.searchParams.get("metric") ?? "mint";
    const period = url.searchParams.get("period") ?? "week";
    if (!["mint", "lessons", "time"].includes(metric) || !["week", "month", "all"].includes(period)) throw new ApiError(400, "invalid_ranking", "Выбери рейтинг и период.");
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
    let viewer: string | null = null;
    try { viewer = (await requireSession(request)).user.id; }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
    const start = period === "week" ? "date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'" : period === "month" ? "date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'" : "'-infinity'::timestamptz";
    const source = metric === "time" ? `SELECT user_id, SUM(seconds)::bigint AS score FROM kq_study_samples WHERE captured_at >= ${start} GROUP BY user_id` : `SELECT user_id, ${metric === "mint" ? "SUM(mint)" : "COUNT(*)"}::bigint AS score FROM kq_verified_lessons WHERE completed_at >= ${start} GROUP BY user_id`;
    const base = `WITH scores AS (${source}), ranked AS (
      SELECT s.user_id, s.score, ROW_NUMBER() OVER (ORDER BY s.score DESC, s.user_id ASC) AS place,
        COALESCE(NULLIF(u.username, ''), 'Участник') AS nickname,
        COALESCE(d.settings->'mascot'->>'id', 'neo') AS mascot
      FROM scores s JOIN "user" u ON u.id = s.user_id
      LEFT JOIN kq_ranking_privacy p ON p.user_id = s.user_id
      LEFT JOIN kq_account_data d ON d.user_id = s.user_id
      WHERE COALESCE(p.hidden, false) = false AND s.score > 0
    )`;
    const pool = getPool();
    const [top, rows, own, total, privacy] = await Promise.all([
      pool.query(`${base} SELECT place, nickname, mascot, score FROM ranked ORDER BY place LIMIT 3`),
      pool.query(`${base} SELECT place, nickname, mascot, score, (user_id = $2) AS mine FROM ranked ORDER BY place LIMIT 10 OFFSET $1`, [(page - 1) * 10, viewer]),
      viewer ? pool.query(`${base} SELECT place, nickname, mascot, score FROM ranked WHERE user_id = $1`, [viewer]) : Promise.resolve({rows: []}),
      pool.query(`${base} SELECT COUNT(*) AS count FROM ranked`),
      viewer ? pool.query('SELECT hidden FROM kq_ranking_privacy WHERE user_id = $1', [viewer]) : Promise.resolve({rows: []}),
    ]);
    return Response.json({ top: top.rows, entries: rows.rows, own: own.rows[0] ?? null, hidden: Boolean(privacy.rows[0]?.hidden), signedIn: Boolean(viewer), total: Number(total.rows[0].count), page, metric, period }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await requireSession(request);
    const body = await readJson(request, 512);
    if (typeof body.hidden !== "boolean") throw new ApiError(400, "invalid_privacy", "Выбери настройку видимости.");
    return await withUnlocked(request, identity, async client => {
      await client.query('INSERT INTO kq_ranking_privacy (user_id, hidden) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET hidden = EXCLUDED.hidden', [identity.user.id, body.hidden]);
      return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
    });
  } catch (error) { return apiError(error); }
}
