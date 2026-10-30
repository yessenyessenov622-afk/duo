import { verifyLesson } from "@/src/lib/verified-lesson";
import { XP_PER_LESSON } from "@/src/data/learning-map";
import { requireSession } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await requireSession(request);
    const body = await readJson(request, 65536);
    return await withUnlocked(request, identity, async client => {
      await client.query(`INSERT INTO kq_verified_rate_limit (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [identity.user.id]);
      const limit = await client.query(`UPDATE kq_verified_rate_limit SET
        attempts = CASE WHEN window_start < CURRENT_TIMESTAMP - INTERVAL '1 minute' THEN 1 ELSE attempts + 1 END,
        window_start = CASE WHEN window_start < CURRENT_TIMESTAMP - INTERVAL '1 minute' THEN CURRENT_TIMESTAMP ELSE window_start END
        WHERE user_id = $1 AND (window_start < CURRENT_TIMESTAMP - INTERVAL '1 minute' OR attempts < 60) RETURNING attempts`, [identity.user.id]);
      if (!limit.rowCount) throw new ApiError(429, "rate_limited", "Слишком много попыток, подожди минуту.");
      if (!verifyLesson(body.lessonId, body.answers)) return Response.json({ error: "unverified", message: "Не удалось подтвердить ответы. Проверь задания и попробуй снова." }, { status: 400, headers: PRIVATE_HEADERS });
      const saved = await client.query(`INSERT INTO kq_verified_lessons (user_id, lesson_id, mint) VALUES ($1, $2, $3)
        ON CONFLICT (user_id, lesson_id) DO NOTHING RETURNING lesson_id`, [identity.user.id, body.lessonId, XP_PER_LESSON]);
      return Response.json({ ok: true, awarded: saved.rowCount === 1 }, { headers: PRIVATE_HEADERS });
    });
  } catch (error) { return apiError(error); }
}
