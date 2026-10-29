import assert from "node:assert/strict";
import test from "node:test";
import { getAuthTables } from "better-auth/db";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { authConfiguration, createAuth, hasPasswordCredential, hasPasswordResetCredential, requireSession } from "../src/server/auth";
import { createAuthHttpHandlers } from "../src/server/auth-http";

test("password registration requires mail configuration", () => {
  const env = { NODE_ENV: "production", DATABASE_URL: "postgres://test", BETTER_AUTH_URL: "https://example.org", BETTER_AUTH_SECRET: "x".repeat(40), KIRAQUEST_PASSWORD_AUTH: "enabled" };
  assert.equal(authConfiguration(env), null);
  assert.equal(authConfiguration({ ...env, KIRAQUEST_MAIL_MODE: "resend", RESEND_API_KEY: "key", KIRAQUEST_MAIL_FROM: "KiraQuest <auth@example.org>" })?.passwordEnabled, true);
});

test("password registration verifies email and reset requires a fresh one-time code", async () => {
  const memory = newDb();
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  let code = "";
  let resetLink = "";
  const origin = "https://localhost:3000";
  const config = { databaseURL: "postgres://test", baseURL: origin, secret: "test-only-secret-at-least-thirty-two-characters", clientId: "", clientSecret: "", passwordEnabled: true, mail: { mode: "development" } as const };
  const auth = createAuth(config, pool, async (_config, _email, otp) => { code = otp; }, async (_config, _email, url) => { resetLink = url; });
  Object.assign(auth.options.advanced, { database: { validateSchema: false } });
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  for (const table of Object.values(getAuthTables(auth.options))) {
    const columns = ['"id" text PRIMARY KEY'];
    for (const [key, field] of Object.entries(table.fields)) {
      const type = field.type === "date" ? "timestamptz" : field.type === "boolean" ? "boolean" : field.type === "number" ? "integer" : "text";
      columns.push(`${quote(field.fieldName ?? key)} ${type}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`);
    }
    memory.public.none(`CREATE TABLE ${quote(table.modelName)} (${columns.join(",")})`);
  }
  const oldOrigin = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = origin;
  // The real handler is used; only the rate-limit database query is stubbed,
  // because pg-mem does not implement PostgreSQL interval arithmetic.
  const rateLimitPool = { query: async () => ({ rowCount: 1, rows: [] }) } as unknown as Pool;
  const { POST } = createAuthHttpHandlers({ authConfiguration: () => config, getAuth: () => auth, getPool: () => rateLimitPool, hasPasswordCredential: (address) => hasPasswordCredential(address, pool), hasPasswordResetCredential: (token) => hasPasswordResetCredential(token, pool), requireSession: (request) => requireSession(request, auth) });
  const post = (path: string, body: object, cookie = "") => POST(new Request(`${origin}/api/auth/${path}`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": "192.0.2.42", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
  const email = "student@example.org"; const password = "test-password-12345"; const replacement = "new-password-12345";
  try {
    const signup = await post("sign-up/email", { email, password, name: "Student", username: "Student_1" });
    assert.equal(signup.status, 200, await signup.clone().text());
    const signupCode = code;
    assert.equal(await hasPasswordCredential(email, pool), true);
    assert.equal(await hasPasswordCredential("unknown@example.org", pool), false);
    assert.equal((await post("email-otp/request-password-reset", { email })).status, 200);
    await pool.query('UPDATE "account" SET "providerId" = $1 WHERE "providerId" = $2', ["google", "credential"]);
    assert.equal(await hasPasswordCredential(email, pool), false);
    assert.equal((await post("email-otp/reset-password", { email, otp: code, password: replacement })).status, 400);
    await pool.query('UPDATE "account" SET "providerId" = $1 WHERE "providerId" = $2', ["credential", "google"]);
    assert.match(signupCode, /^\d{6}$/);
    assert.notEqual((await post("sign-in/email", { email, password })).status, 200);
    assert.notEqual((await post("sign-in/username", { username: "Student_1", password })).status, 200);
    assert.notEqual((await post("email-otp/verify-email", { email, otp: signupCode === "000000" ? "000001" : "000000" })).status, 200);
    assert.equal((await post("email-otp/verify-email", { email, otp: signupCode })).status, 200);
    assert.notEqual((await post("email-otp/verify-email", { email, otp: signupCode })).status, 200);
    const login = await post("sign-in/email", { email, password });
    assert.equal(login.status, 200, await login.clone().text());
    const cookie = login.headers.getSetCookie().map((item) => item.split(";", 1)[0]).join("; ");
    assert.equal((await post("email-otp/request-password-reset", { email })).status, 200);
    const resetCode = code;
    assert.equal((await post("email-otp/reset-password", { email, otp: resetCode, password: replacement })).status, 200);
    assert.notEqual((await post("email-otp/reset-password", { email, otp: resetCode, password })).status, 200);
    await assert.rejects(requireSession(new Request(`${origin}/private`, { headers: { cookie } }), auth));
    assert.notEqual((await post("sign-in/email", { email, password })).status, 200);
    assert.equal((await post("sign-in/email", { email, password: replacement })).status, 200);
    // A recovery link is sent only for a password credential, expires and is one-use.
    assert.equal((await post("request-password-reset", { email: "unknown@example.org" })).status, 200);
    assert.equal(resetLink, "");
    assert.equal((await post("request-password-reset", { email })).status, 200);
    const parsed = new URL(resetLink);
    assert.equal(parsed.origin, origin);
    assert.equal(parsed.pathname, "/reset-password");
    assert.equal(parsed.search, "");
    const resetToken = new URLSearchParams(parsed.hash.slice(1)).get("token")!;
    assert.match(resetToken, /^[A-Za-z0-9]{24}$/);
    const verification = await pool.query('SELECT "expiresAt" FROM "verification" WHERE identifier = $1', [`reset-password:${resetToken}`]);
    const remaining = new Date(verification.rows[0].expiresAt).getTime() - Date.now();
    assert.ok(remaining > 29 * 60_000 && remaining <= 30 * 60_000);
    await pool.query('UPDATE "account" SET "providerId" = $1 WHERE "providerId" = $2', ["google", "credential"]);
    assert.equal(await hasPasswordResetCredential(resetToken, pool), false);
    assert.equal((await post("reset-password", { token: resetToken, newPassword: password })).status, 400);
    await pool.query('UPDATE "account" SET "providerId" = $1 WHERE "providerId" = $2', ["credential", "google"]);
    assert.equal((await post("reset-password", { token: resetToken, newPassword: password })).status, 200);
    assert.equal((await post("reset-password", { token: resetToken, newPassword: replacement })).status, 400);
    assert.equal((await post("sign-in/email", { email, password })).status, 200);
    assert.equal((await post("request-password-reset", { email })).status, 200);
    const expiredToken = new URLSearchParams(new URL(resetLink).hash.slice(1)).get("token")!;
    await pool.query('UPDATE "verification" SET "expiresAt" = $1 WHERE identifier = $2', [new Date(0), `reset-password:${expiredToken}`]);
    assert.equal((await post("reset-password", { token: expiredToken, newPassword: replacement })).status, 400);
  } finally { if (oldOrigin === undefined) delete process.env.BETTER_AUTH_URL; else process.env.BETTER_AUTH_URL = oldOrigin; await pool.end(); }
});
