// Isolated local PostgreSQL and synthetic users only.
import assert from "node:assert/strict";
import pg from "pg";
const pool = new pg.Pool({ connectionString: "postgresql://kq_test@127.0.0.1:55439/postgres" });
const base = "http://127.0.0.1:3189", origin = "https://localhost:3189";
function client() {
  const jar = new Map();
  return async (path, method = "GET", body) => {
    const headers = { origin, ...(jar.size ? { cookie: [...jar].map(([k,v]) => `${k}=${v}`).join("; ") } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) };
    const response = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(";", 1)[0], i = part.indexOf("="); jar.set(part.slice(0,i), part.slice(i+1)); }
    const data = await response.json();
    return { status: response.status, data };
  };
}
const check = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.data));
try {
  await pool.query(`INSERT INTO "user" (id, name, email, "emailVerified", username, "createdAt", "updatedAt")
    VALUES ('test-student', 'student', 'student@example.test', true, 'student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await pool.query(`INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    SELECT 'test-student-credential', 'test-student', 'credential', 'test-student', password, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "account" WHERE "providerId"='credential' AND "userId"=(SELECT user_id FROM kq_owner_role)`);
  const first = client();
  check(await first("/api/auth/sign-in/email", "POST", { email: "student@example.test", password: "test-owner-password-123" }), 200);
  check(await first("/api/account/session"), 200);
  check(await first("/api/admin/overview"), 403);
  check(await first("/api/admin/users"), 403);
  check(await first("/api/admin/reviews"), 403);
  const original = await first("/api/account/data"); check(original, 200);
  const progress = { ...original.data.progress, completedLessons: ["math-1"], xp: 25 };
  const saved = await first("/api/account/data", "PUT", { revision: original.data.revision, progress }); check(saved, 200);
  const second = client();
  check(await second("/api/auth/sign-in/email", "POST", { email: "student@example.test", password: "test-owner-password-123" }), 200);
  check(await second("/api/account/session"), 200);
  const loaded = await second("/api/account/data"); check(loaded, 200); assert.ok(loaded.data.progress.completedLessons.includes("math-1")); assert.equal(loaded.data.progress.xp, 25);
  const publicRanking = await second("/api/rankings?period=all&metric=mint"); check(publicRanking, 200); assert.equal(publicRanking.data.own, null, "client-supplied progress must not enter ranking");
  check(await first("/api/auth/sign-out", "POST", {}), 200);
  const signedOut = await first("/api/account/data"); assert.equal(signedOut.status, 401);
  const owner = client();
  check(await owner("/api/auth/sign-in/username", "POST", { username: "админ", password: "test-owner-password-123" }), 200);
  check(await owner("/api/account/session"), 200);
  check(await owner("/api/admin/password", "POST", { currentPassword: "incorrect-password-123", newPassword: "new-test-password-123" }), 400);
  check(await owner("/api/admin/password", "POST", { currentPassword: "test-owner-password-123", newPassword: "new-test-password-123" }), 200);
  check(await owner("/api/auth/sign-out", "POST", {}), 200);
  const loginAgain = client(); check(await loginAgain("/api/auth/sign-in/username", "POST", { username: "админ", password: "new-test-password-123" }), 200);
  console.log("PASS local PostgreSQL: ordinary-user access denied, progress restored on second device, sign-out and owner password change");
} finally { await pool.end(); }
