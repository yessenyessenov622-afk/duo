// Only for the disposable local integration environment; never connects to production.
import assert from "node:assert/strict";
import pg from "pg";

const base = "http://127.0.0.1:3189";
const origin = "https://localhost:3189";
const pool = new pg.Pool({ connectionString: "postgresql://kq_test@127.0.0.1:55439/postgres" });
const jar = new Map();
async function request(path, { method = "GET", body, cookies = true } = {}) {
  const headers = { origin };
  if (cookies && jar.size) headers.cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (cookies) for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(";", 1)[0]; const index = part.indexOf("="); jar.set(part.slice(0, index), part.slice(index + 1)); }
  const data = await response.json();
  return { status: response.status, data };
}
const expectStatus = (response, status) => assert.equal(response.status, status, JSON.stringify(response.data));
try {
  expectStatus(await request("/api/admin/overview", { cookies: false }), 401);
  expectStatus(await request("/api/lessons/verify", { method: "POST", body: { lessonId: "math-1", answers: ["12"] }, cookies: false }), 401);
  expectStatus(await request("/api/auth/sign-in/username", { method: "POST", body: { username: "админ", password: "test-owner-password-123" } }), 200);
  const session = await request("/api/account/session"); expectStatus(session, 200); const userId = session.data.user.id;
  expectStatus(await request("/api/admin/overview"), 200);
  expectStatus(await request("/api/admin/users"), 200);
  expectStatus(await request("/api/activity", { method: "POST", body: { studying: true } }), 200);
  await pool.query("UPDATE kq_user_activity SET last_study_signal = clock_timestamp() - INTERVAL '15 seconds' WHERE user_id = $1", [userId]);
  const heartbeats = await Promise.all([request("/api/activity", { method: "POST", body: { studying: true } }), request("/api/activity", { method: "POST", body: { studying: true } })]);
  heartbeats.forEach(result => expectStatus(result, 200));
  const seconds = await pool.query("SELECT COALESCE(SUM(seconds),0) AS total FROM kq_study_samples WHERE user_id=$1", [userId]);
  assert.ok(Number(seconds.rows[0].total) >= 14 && Number(seconds.rows[0].total) <= 20, "parallel heartbeats counted time more than once");
  expectStatus(await request("/api/lessons/verify", { method: "POST", body: { lessonId: "math-1", answers: ["wrong"] } }), 400);
  const first = await request("/api/lessons/verify", { method: "POST", body: { lessonId: "math-1", answers: ["12"] } });
  expectStatus(first, 200); assert.equal(first.data.awarded, true);
  const duplicate = await request("/api/lessons/verify", { method: "POST", body: { lessonId: "math-1", answers: ["12"] } });
  expectStatus(duplicate, 200); assert.equal(duplicate.data.awarded, false);
  const ranking = await request("/api/rankings?metric=mint&period=all"); expectStatus(ranking, 200); assert.equal(ranking.data.own.score, "25");
  expectStatus(await request("/api/rankings", { method: "POST", body: { hidden: true } }), 200);
  const hidden = await request("/api/rankings?metric=mint&period=all"); assert.equal(hidden.data.total, 0); assert.equal(hidden.data.hidden, true);
  expectStatus(await request("/api/rankings", { method: "POST", body: { hidden: false } }), 200);
  expectStatus(await request("/api/reviews", { method: "POST", body: { rating: 5, body: "Полезный тестовый отзыв." } }), 200);
  const publicReview = await request("/api/reviews", { cookies: false }); expectStatus(publicReview, 200); assert.equal(publicReview.data.total, 1);
  expectStatus(await request("/api/admin/reviews", { method: "POST", body: { userId, action: "hide", reason: "Тест модерации" } }), 200);
  assert.equal((await request("/api/reviews", { cookies: false })).data.total, 0);
  expectStatus(await request("/api/admin/reviews", { method: "POST", body: { userId, action: "restore" } }), 200);
  assert.equal((await request("/api/reviews", { cookies: false })).data.total, 1);
  console.log("PASS local PostgreSQL: auth, admin, activity concurrency, verified lesson, ranking privacy and review moderation");
} finally { await pool.end(); }
