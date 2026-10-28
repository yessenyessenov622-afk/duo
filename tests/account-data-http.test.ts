import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getAuthTables } from "better-auth/db";
import { getCookies } from "better-auth/cookies";
import { DataType, newDb } from "pg-mem";
import type { Pool, PoolClient } from "pg";
import { authConfiguration, createAuth, requireSession } from "../src/server/auth";
import { createAccountDataHandlers } from "../src/server/account-data-http";
import { DEVICE_COOKIE, PinService } from "../src/server/pin";
import { createInitialLearningProgress } from "../src/lib/learning-progress";
import { DEFAULT_SETTINGS } from "../src/lib/customization";
import type { AccountData } from "../src/types/account";

const origin = "https://account-api.example.test";
const pepper = "test-only-pepper-for-account-http-more-than-32-chars";
const config = authConfiguration({
  NODE_ENV: "production", BETTER_AUTH_URL: origin,
  DATABASE_URL: "postgresql://test-only@localhost/kiraquest",
  BETTER_AUTH_SECRET: "test-only-auth-secret-for-http-32-characters-long",
  GOOGLE_CLIENT_ID: "test-only.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "test-only-client-secret",
})!;

async function fixture() {
  const db = newDb();
  const { Pool: MemoryPool } = db.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  const auth = createAuth(config, pool);
  // The adapter emulation lacks PostgreSQL catalog introspection; production
  // leaves this library check enabled. These tests never call Google's APIs.
  Object.assign(auth.options.advanced, { database: { validateSchema: false } });
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  for (const table of Object.values(getAuthTables(auth.options))) {
    const columns = ['"id" text PRIMARY KEY'];
    for (const [key, field] of Object.entries(table.fields)) {
      const type = field.type === "date" ? "timestamptz" : field.type === "boolean" ? "boolean" : field.type === "number" ? (field.bigint ? "bigint" : "integer") : "text";
      columns.push(`${quote(field.fieldName ?? key)} ${type}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`);
    }
    db.public.none(`CREATE TABLE ${quote(table.modelName)} (${columns.join(",")})`);
  }
  db.public.registerFunction({ name: "octet_length", args: [DataType.bytea], returns: DataType.integer, implementation: (bytes: Buffer) => bytes.length });
  for (const migration of ["002-pin.sql", "003-account-data.sql"]) {
    db.public.none(await readFile(new URL(`../src/server/migrations/${migration}`, import.meta.url), "utf8"));
  }
  const transaction = async <T>(work: (client: PoolClient) => Promise<T>) => {
    const client = await pool.connect();
    try { return await work(client); } finally { client.release(); }
  };
  const pins = new PinService(transaction);
  const handlers = createAccountDataHandlers({
    authenticate: (request) => requireSession(request, auth),
    unlocked: (request, identity, work) => {
      const raw = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${DEVICE_COOKIE}=`))?.slice(DEVICE_COOKIE.length + 1) ?? null;
      return pins.withUnlocked(identity, raw, work);
    },
  });
  async function session(userId: string, device = randomBytes(32).toString("base64url"), expiresAt = new Date(Date.now() + 3_600_000)) {
    const at = new Date();
    await pool.query('INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,$2,$3,true,$4,$4) ON CONFLICT DO NOTHING', [userId, userId, `${userId}@example.test`, at]);
    const row = await (await auth.$context).internalAdapter.createSession(userId, false, { expiresAt }, true);
    const signature = createHmac("sha256", config.secret).update(row.token).digest("base64");
    const sessionName = getCookies(auth.options).sessionToken.name;
    const cookie = `${sessionName}=${encodeURIComponent(`${row.token}.${signature}`)}; ${DEVICE_COOKIE}=${device}`;
    return { row, cookie, device };
  }
  return { pool, auth, pins, handlers, session };
}

function request(method: string, cookie: string, body?: unknown, expected?: string) {
  return new Request(`${origin}/api/account/data`, {
    method,
    headers: { cookie, origin, "content-type": "application/json", ...(expected ? { "x-kiraquest-account": expected } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

test("account HTTP handlers enforce real DB sessions, PIN lock and restore across devices", async () => {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = origin;
  const f = await fixture();
  try {
    const unauthenticated = await f.handlers.GET(request("GET", ""));
    assert.equal(unauthenticated.status, 401);
    assert.equal((await unauthenticated.json()).error, "session_expired");
    const alice = await f.session("alice");
    const aliceIdentity = await requireSession(request("GET", alice.cookie), f.auth);
    const initial = await f.handlers.GET(request("GET", alice.cookie, undefined, "alice"));
    assert.equal(initial.status, 200);
    assert.equal(initial.headers.get("cache-control"), "private, no-store");
    const data = await initial.json() as AccountData;
    const progress = { ...createInitialLearningProgress(), startedCourses: ["english-start"], completedLessons: ["hello-2"], xp: 25, tokens: 5 };
    const save = await f.handlers.PUT(request("PUT", alice.cookie, { revision: data.revision, progress, settings: { ...DEFAULT_SETTINGS, themeMode: "dark", mascot: { id: "penguin" } }, userId: "bob" }, "alice"));
    assert.equal(save.status, 200, await save.clone().text());
    const saved = await save.json() as AccountData;
    assert.deepEqual(saved.progress.completedLessons, ["hello-2"]);
    assert.equal(saved.settings.mascot.id, "penguin");
    const bob = await f.session("bob");
    assert.equal((await f.handlers.GET(request("GET", bob.cookie, undefined, "alice"))).status, 409);
    const bobData = await (await f.handlers.GET(request("GET", bob.cookie, undefined, "bob"))).json() as AccountData;
    assert.deepEqual(bobData.progress.completedLessons, []);
    assert.equal(bobData.progress.xp, 0);
    assert.equal(bobData.settings.themeMode, "light");

    await f.pins.action(aliceIdentity, alice.device, { action: "setup", pin: "024680", confirmation: "024680" }, pepper);
    await f.pins.action(aliceIdentity, alice.device, { action: "lock" }, pepper);
    for (const response of [
      await f.handlers.GET(request("GET", alice.cookie)),
      await f.handlers.PUT(request("PUT", alice.cookie, { revision: saved.revision, progress: createInitialLearningProgress() })),
      await f.handlers.IMPORT(request("POST", alice.cookie, { progress, settings: DEFAULT_SETTINGS, useGuestSettings: true, importId: "guest-route-boundary-12345" })),
    ]) {
      assert.equal(response.status, 423);
      const payload = await response.json();
      assert.equal(payload.error, "app_locked");
      assert.equal("progress" in payload, false);
      assert.equal("data" in payload, false);
    }
    const untouched = await f.pool.query("SELECT progress,revision FROM kq_account_data WHERE user_id='alice'");
    assert.deepEqual(untouched.rows[0].progress.completedLessons, ["hello-2"]);
    assert.equal(Number(untouched.rows[0].revision), saved.revision);
    assert.equal((await f.pool.query("SELECT * FROM kq_guest_import WHERE user_id='alice'")).rows.length, 0);
    await f.pins.action(aliceIdentity, alice.device, { action: "unlock", pin: "024680" }, pepper);
    const unlocked = await (await f.handlers.GET(request("GET", alice.cookie))).json() as AccountData;
    assert.deepEqual(unlocked, saved);

    // A new device needs a real server session. After that Google sign-in
    // prerequisite, its own optional PIN starts disabled and account data loads.
    const deviceTwo = await f.session("alice");
    const restored = await f.handlers.GET(request("GET", deviceTwo.cookie, undefined, "alice"));
    assert.equal(restored.status, 200);
    assert.deepEqual(await restored.json(), saved);
    // A fresh session on the original device must still unlock its device PIN.
    const originalDeviceAgain = await f.session("alice", alice.device);
    assert.equal((await f.handlers.GET(request("GET", originalDeviceAgain.cookie))).status, 423);
    const expired = await f.session("alice", alice.device, new Date(Date.now() - 1_000));
    assert.equal((await f.handlers.GET(request("GET", expired.cookie))).status, 401);
  } finally {
    await f.pool.end();
    if (previous === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previous;
  }
});
