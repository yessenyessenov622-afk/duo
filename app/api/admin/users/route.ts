import { withOwner } from "@/src/server/owner";
import { apiError, PRIVATE_HEADERS } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const sort = url.searchParams.get("sort") === "recent" ? 'a.last_visit DESC NULLS LAST, u.id ASC' : 'u."createdAt" DESC, u.id ASC';
    return await withOwner(request, async client => {
      const users = await client.query(`SELECT u.id, COALESCE(NULLIF(u.username, ''), 'Участник') AS nickname,
        u."createdAt" AS registered_at, a.first_visit, a.last_visit, COALESCE(a.visits, 0) AS visits,
        COALESCE(s.seconds, 0) AS seconds, COALESCE(v.lessons, 0) AS lessons, COALESCE(v.mint, 0) AS mint FROM "user" u
        LEFT JOIN kq_user_activity a ON a.user_id = u.id
        LEFT JOIN LATERAL (SELECT SUM(seconds) AS seconds FROM kq_study_samples WHERE user_id = u.id) s ON true
        LEFT JOIN LATERAL (SELECT COUNT(*) AS lessons, SUM(mint) AS mint FROM kq_verified_lessons WHERE user_id = u.id) v ON true
        WHERE ($1 = '' OR COALESCE(u.username, '') ILIKE '%' || $1 || '%')
        ORDER BY ${sort} LIMIT 10 OFFSET $2`, [query, (page - 1) * 10]);
      return Response.json({ users: users.rows, page }, { headers: PRIVATE_HEADERS });
    });
  } catch (error) { return apiError(error); }
}
