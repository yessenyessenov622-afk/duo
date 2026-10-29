import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { getAuthTables } from "better-auth/db";
import { getCookies } from "better-auth/cookies";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { authConfiguration, createAuth, requireSession } from "../src/server/auth";
import { ApiError, apiError, assertSameOrigin, readJson } from "../src/server/http";
import { GET, POST } from "../app/api/auth/[...all]/route";

const origin = "https://learn.example.test";
const env = {
  DATABASE_URL: "postgresql://test-only@localhost/kiraquest",
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: "isolated-test-secret-with-more-than-32-characters",
  GOOGLE_CLIENT_ID: "test-only-google-client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "test-only-google-client-secret",
  NODE_ENV: "production",
};
const config = authConfiguration(env)!;

function request(path: string, body: unknown = {}, headers: Record<string, string> = {}) {
  return new Request(`${origin}${path}`, {
    method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body),
  });
}

function apiCode(code: string, status: number) {
  return (error: unknown) => error instanceof ApiError && error.code === code && error.status === status;
}

async function fixture() {
  const memory = newDb();
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  const auth = createAuth(config, pool);
  // pg-mem cannot perform Kysely's pg_catalog schema introspection. Disable it
  // only in this synthetic fixture; the production factory keeps validation on.
  Object.assign(auth.options.advanced, { database: { validateSchema: false } });
  // The schema is derived from the installed library. pg-mem checks adapter
  // queries/session behavior; this does not verify production migrations or
  // PostgreSQL concurrency, and no Google token/identity is mocked as verified.
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  for (const table of Object.values(getAuthTables(auth.options))) {
    const columns = ['"id" text PRIMARY KEY'];
    for (const [key, field] of Object.entries(table.fields)) {
      const type = field.type === "date" ? "timestamptz" : field.type === "boolean" ? "boolean" : field.type === "number" ? (field.bigint ? "bigint" : "integer") : "text";
      columns.push(`${quote(field.fieldName ?? key)} ${type}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`);
    }
    memory.public.none(`CREATE TABLE ${quote(table.modelName)} (${columns.join(",")})`);
  }
  async function session(userId: string, name: string, expiresAt = new Date(Date.now() + 86_400_000)) {
    const createdAt = new Date();
    await pool.query('INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,true,$4,$4) ON CONFLICT DO NOTHING', [userId, name, `${userId}@example.test`, createdAt]);
    const ctx = await auth.$context;
    const row = await ctx.internalAdapter.createSession(userId, false, { expiresAt }, true);
    const signature = createHmac("sha256", config.secret).update(row.token).digest("base64");
    const nameCookie = getCookies(auth.options).sessionToken.name;
    return { row, cookie: `${nameCookie}=${encodeURIComponent(`${row.token}.${signature}`)}` };
  }
  return { auth, pool, session };
}

test("configuration requires complete server secrets, HTTPS and a production hostname", () => {
  assert.ok(authConfiguration(env));
  for (const name of ["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
    assert.equal(authConfiguration({ ...env, [name]: undefined }), null, name);
  }
  assert.equal(authConfiguration({ ...env, BETTER_AUTH_SECRET: "short" }), null);
  for (const url of ["http://learn.example.test", "https://18.192.104.63", "https://localhost:3000", "https://internal", "https://learn.example.test/path", "https://learn.example.test?x=y", "https://user:pass@learn.example.test", "not-a-url"]) {
    assert.equal(authConfiguration({ ...env, BETTER_AUTH_URL: url }), null, url);
  }
  assert.ok(authConfiguration({ ...env, NODE_ENV: "development", BETTER_AUTH_URL: "https://localhost:3000" }));
  assert.equal(authConfiguration({ ...env, NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:3000" }), null);
});

test("JSON reader bounds actual streamed bytes, rejects malformed and non-object bodies", async () => {
  const absentLength = new Request(`${origin}/api`, { method: "POST", body: '{"text":"' + "я".repeat(50) + '"}' });
  await assert.rejects(readJson(absentLength, 60), apiCode("body_too_large", 413));
  const dishonestLength = request("/api", { text: "x".repeat(200) }, { "content-length": "2" });
  await assert.rejects(readJson(dishonestLength, 60), apiCode("body_too_large", 413));
  await assert.rejects(readJson(request("/api", {}, { "content-length": "999" }), 60), apiCode("body_too_large", 413));
  for (const body of ["[]", "null", '"value"', "{oops"]) {
    await assert.rejects(readJson(new Request(`${origin}/api`, { method: "POST", body })), apiCode("invalid_json", 400));
  }
  assert.deepEqual(await readJson(request("/api", { ok: true })), { ok: true });
});

test("auth HTTP boundary rejects CSRF, enlarged scopes, direct ID tokens and token APIs", async (t) => {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = origin;
  try {
    assert.doesNotThrow(() => assertSameOrigin(request("/api")));
    const invalidHeaders: Record<string, string>[] = [{ origin: "" }, { origin: "https://attacker.test" }, { "sec-fetch-site": "cross-site" }];
    for (const headers of invalidHeaders) {
      assert.throws(() => assertSameOrigin(request("/api", {}, headers)), apiCode("invalid_origin", 403));
    }
    assert.throws(() => assertSameOrigin(request("/api", {}, { "content-type": "text/plain" })), apiCode("invalid_content_type", 415));
    for (const input of [
      { provider: "github" }, { provider: "google", idToken: { token: "untrusted-token" } },
      { provider: "google", scopes: ["https://www.googleapis.com/auth/drive"] },
      { provider: "google", additionalParams: { include_granted_scopes: true } },
    ]) {
      await t.test(`rejected OAuth input: ${Object.keys(input).join(",")}`, async () => {
        const response = await POST(request("/api/auth/sign-in/social", input));
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, "invalid_sign_in");
      });
    }
    for (const path of ["/api/auth/get-access-token", "/api/auth/get-session", "/api/auth/list-accounts", "/api/auth/link-social", "/api/auth/update-user", "/api/auth/sign-up/email"]) {
      assert.equal((await GET(new Request(`${origin}${path}`))).status, 404);
      assert.equal((await POST(request(path))).status, 404);
    }
    const rejected = await POST(request("/api/auth/sign-in/social", { provider: "google" }, { origin: "https://attacker.test" }));
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get("cache-control"), "private, no-store");
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previous;
  }
});

test("unconfigured auth fails closed with 503; unexpected exception details stay private", async () => {
  const previous = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_SECRET;
  try {
    const response = await GET(new Request(`${origin}/api/auth/ok`));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "auth_not_configured");
  } finally {
    if (previous !== undefined) process.env.GOOGLE_CLIENT_SECRET = previous;
  }
  const response = apiError(new Error("postgresql://private-secret@host; PIN=123456; oauth-token=secret"));
  assert.equal(response.status, 503);
  const text = await response.text();
  for (const value of ["123456", "oauth-token", "postgresql", "private-secret"]) assert.equal(text.includes(value), false);
});

test("real Better Auth initiation builds Google-only identity scope with PKCE and DB-backed state", async () => {
  const f = await fixture();
  try {
    const response = await f.auth.handler(request("/api/auth/sign-in/social", { provider: "google", callbackURL: "/profile", errorCallbackURL: "/sign-in?error=oauth", disableRedirect: true }, { "x-real-ip": "192.0.2.15" }));
    assert.equal(response.status, 200, await response.clone().text());
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ["redirect", "url"]);
    const url = new URL(body.url);
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.pathname, "/o/oauth2/v2/auth");
    assert.deepEqual(new Set(url.searchParams.get("scope")!.split(" ")), new Set(["openid", "email", "profile"]));
    assert.equal(url.searchParams.get("redirect_uri"), `${origin}/api/auth/callback/google`);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.ok(url.searchParams.get("code_challenge"));
    assert.ok(url.searchParams.get("state"));
    assert.equal(url.searchParams.get("access_type"), "online");
    assert.notEqual(url.searchParams.get("include_granted_scopes"), "true");
    const cookies = response.headers.getSetCookie();
    assert.ok(cookies.length > 0);
    for (const cookie of cookies) {
      assert.match(cookie, /Secure/i); assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=Lax/i);
    }
    const state = await f.pool.query('SELECT * FROM "verification"');
    assert.equal(state.rows.length, 1);
    assert.equal(JSON.stringify(state.rows).includes("codeVerifier"), true);
    assert.equal(JSON.stringify(body).includes("codeVerifier"), false);
    const invalidState = await f.auth.handler(new Request(`${origin}/api/auth/callback/google?state=attacker-state&code=not-a-real-code`));
    assert.equal(invalidState.status, 302);
    assert.ok(invalidState.headers.get("location")?.startsWith(`${origin}/sign-in`));
    assert.equal((await f.pool.query('SELECT * FROM "user"')).rows.length, 0);
  } finally { await f.pool.end(); }
});

test("real DB session checks isolate accounts, reject forged/expired cookies, and revoke on signout", async () => {
  const f = await fixture();
  try {
    const a = await f.session("alice", "Alice");
    const b = await f.session("bob", "Bob");
    const accountRequest = (cookie: string, expected?: string) => new Request(`${origin}/api/account/data`, { headers: { cookie, ...(expected ? { "x-kiraquest-account": expected } : {}) } });
    const identity = await requireSession(accountRequest(a.cookie, "alice"), f.auth);
    assert.deepEqual(Object.keys(identity.user).sort(), ["email", "emailVerified", "id", "image", "name"]);
    assert.equal(identity.user.id, "alice");
    assert.equal((await requireSession(accountRequest(b.cookie, "bob"), f.auth)).user.id, "bob");
    await assert.rejects(requireSession(accountRequest(b.cookie, "alice"), f.auth), apiCode("account_changed", 409));
    await assert.rejects(requireSession(accountRequest("", "alice"), f.auth), apiCode("session_expired", 401));
    await assert.rejects(requireSession(accountRequest(a.cookie.replace(/.$/, "x")), f.auth), apiCode("session_expired", 401));
    const expired = await f.session("alice", "Alice", new Date(Date.now() - 1_000));
    await assert.rejects(requireSession(accountRequest(expired.cookie, "alice"), f.auth), apiCode("session_expired", 401));
    const out = await f.auth.handler(request("/api/auth/sign-out", {}, { cookie: a.cookie, "x-real-ip": "192.0.2.16" }));
    assert.equal(out.status, 200);
    assert.match(out.headers.get("set-cookie") ?? "", /Max-Age=0/i);
    await assert.rejects(requireSession(accountRequest(a.cookie, "alice"), f.auth), apiCode("session_expired", 401));
    assert.equal((await requireSession(accountRequest(b.cookie, "bob"), f.auth)).user.id, "bob");
  } finally { await f.pool.end(); }
});

test("recovery's real server OAuth initiation sends state cookies; cancellation keeps the old session and state cannot replay", async () => {
  const f = await fixture();
  try {
    const original = await f.session("alice", "Alice");
    const response = await f.auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/api/account/recovery/complete", errorCallbackURL: "/sign-in?error=recovery_cancelled", disableRedirect: true },
      headers: new Headers({ origin, cookie: original.cookie, "x-real-ip": "192.0.2.17" }),
      asResponse: true,
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    const state = new URL(body.url).searchParams.get("state")!;
    const cookies = [original.cookie, ...response.headers.getSetCookie().map((value) => value.split(";", 1)[0])].join("; ");
    const callback = () => new Request(`${origin}/api/auth/callback/google?state=${encodeURIComponent(state)}&error=access_denied`, { headers: { cookie: cookies, "x-real-ip": "192.0.2.17" } });
    const cancel = await f.auth.handler(callback());
    assert.equal(cancel.status, 302);
    const location = new URL(cancel.headers.get("location")!, origin);
    assert.equal(location.pathname, "/sign-in");
    assert.ok(location.searchParams.getAll("error").some((value) => value === "access_denied" || value === "recovery_cancelled"));
    assert.equal((await requireSession(new Request(`${origin}/api/account/data`, { headers: { cookie: original.cookie } }), f.auth)).user.id, "alice");
    assert.equal((await f.pool.query('SELECT * FROM "session"')).rows.length, 1);
    const replay = await f.auth.handler(callback());
    assert.equal(replay.status, 302);
    assert.equal(new URL(replay.headers.get("location")!, origin).pathname, "/sign-in");
    assert.equal((await f.pool.query('SELECT * FROM "session"')).rows.length, 1);
  } finally { await f.pool.end(); }
});
