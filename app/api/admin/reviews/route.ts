import { withOwner } from "@/src/server/owner";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return await withOwner(request, async client => {
      const url = new URL(request.url);
      const page = url.searchParams.get("page") ?? "1";
      const status = url.searchParams.get("status") ?? "all";
      const search = (url.searchParams.get("q") ?? "").trim();
      if (!/^[1-9]\d{0,3}$/.test(page) || !["all", "visible", "hidden"].includes(status) || search.length > 100) throw new ApiError(400, "invalid_filter", "Проверьте фильтр отзывов.");
      const result = await client.query(`SELECT r.user_id, r.rating, r.body, r.created_at, r.updated_at, r.hidden_at, r.hidden_reason, COALESCE(NULLIF(u.username, ''), 'Участник') AS author
        FROM kq_reviews r JOIN "user" u ON u.id = r.user_id
        WHERE ($1 = 'all' OR ($1 = 'hidden' AND r.hidden_at IS NOT NULL) OR ($1 = 'visible' AND r.hidden_at IS NULL))
          AND ($2 = '' OR u.username ILIKE '%' || $2 || '%' OR r.body ILIKE '%' || $2 || '%')
        ORDER BY r.created_at DESC, r.user_id ASC LIMIT 10 OFFSET $3`, [status, search, (Number(page)-1)*10]);
      const log = await client.query(`SELECT l.action, l.reason, l.created_at, COALESCE(NULLIF(u.username, ''), 'Участник') AS author FROM kq_review_moderation_log l
        JOIN "user" u ON u.id = l.author_id ORDER BY l.created_at DESC, l.id DESC LIMIT 30`);
      return Response.json({ reviews: result.rows, log: log.rows }, { headers: PRIVATE_HEADERS });
    });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    return await withOwner(request, async (client, identity) => {
      const input = await readJson(request, 4096);
      const userId = typeof input.userId === "string" ? input.userId : "";
      const action = input.action;
      const reason = typeof input.reason === "string" ? input.reason.trim() : "";
      if (!userId || userId.length > 128 || typeof action !== "string" || !["hide", "restore"].includes(action) || (action === "hide" && (!reason || reason.length > 500))) throw new ApiError(400, "invalid_moderation", "Укажите действие и причину скрытия.");
      const found = await client.query("SELECT hidden_at FROM kq_reviews WHERE user_id = $1 FOR UPDATE", [userId]);
      if (!found.rowCount) throw new ApiError(404, "review_not_found", "Отзыв не найден.");
      if ((action === "hide") === !!found.rows[0].hidden_at) throw new ApiError(409, "unchanged", "Статус отзыва уже изменён.");
      if (action === "hide") await client.query("UPDATE kq_reviews SET hidden_at = CURRENT_TIMESTAMP, hidden_reason = $2 WHERE user_id = $1", [userId, reason]);
      else await client.query("UPDATE kq_reviews SET hidden_at = NULL, hidden_reason = NULL WHERE user_id = $1", [userId]);
      await client.query("INSERT INTO kq_review_moderation_log (actor_id, author_id, action, reason) VALUES ($1, $2, $3, $4)", [identity.user.id, userId, action, action === "hide" ? reason : null]);
      return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
    });
  } catch (error) { return apiError(error); }
}
