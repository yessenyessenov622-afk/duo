import test from "node:test";
import assert from "node:assert/strict";
import type { Pool, PoolClient } from "pg";
import { DataType, newDb } from "pg-mem";
import { createOwnerAccess, hasOwnerRole } from "../src/server/owner";
import { ApiError } from "../src/server/http";
import { isOwnerAlias, isReservedUsername } from "../src/lib/owner-login";
import { createOwnerRecord } from "../src/server/owner-creation";
import { verifyAccountPassword } from "../src/server/password-hash";
import { createAuth, requireSession } from "../src/server/auth";
import { createAuthHttpHandlers } from "../src/server/auth-http";
import { getAuthTables } from "better-auth/db";

test("owner aliases are reserved without implying permissions", () => {
  assert.equal(isOwnerAlias(" АДМИН "), true);
  assert.equal(isReservedUsername("ＡＤＭＩＮ"), true);
  assert.equal(isReservedUsername("kq_owner"), true);
  assert.equal(isReservedUsername("learner"), false);
});

test("owner access uses server identity, role and unlocked session", async () => {
  let allowedId = "";
  let executed = false;
  const client = {} as PoolClient;
  const identity = { user: { id: "user-1", name: "админ", email: "private@example.org" }, session: { id: "session", createdAt: new Date(), expiresAt: new Date(Date.now()+1000), token: "secret" } };
  const request = new Request("https://example.org/admin");
  const access = createOwnerAccess({
    authenticate: async () => identity,
    unlocked: async (_request, _identity, work) => work(client),
    owner: async id => id === allowedId,
  });
  await assert.rejects(access(request, async () => { executed = true; }), (error: unknown) => error instanceof ApiError && error.status === 403);
  assert.equal(executed, false);
  allowedId = "user-1";
  assert.equal(await access(request, async () => "permitted"), "permitted");
  const locked = createOwnerAccess({ authenticate: async () => identity, unlocked: async () => { throw new ApiError(423, "locked", "locked"); }, owner: async () => true });
  await assert.rejects(locked(request, async () => { executed = true; }), (error: unknown) => error instanceof ApiError && error.status === 423);
  assert.equal(executed, false);
  const guest = createOwnerAccess({ authenticate: async () => { throw new ApiError(401, "unauthorized", "guest"); }, unlocked: async (_r,_i,work) => work(client), owner: async () => true });
  await assert.rejects(guest(request, async () => "unexpected"), (error: unknown) => error instanceof ApiError && error.status === 401);
});

test("missing owner role table never grants privileges", async () => {
  const db = { query: async () => { throw Object.assign(new Error("missing table"), { code: "42P01" }); } };
  assert.equal(await hasOwnerRole("user-1", db as never), false);
});

test("owner creation never elevates a conflicting account and creates one hashed credential", async () => {
  const memory = newDb();
  memory.public.registerFunction({ name: "pg_advisory_xact_lock", args: [DataType.integer], returns: DataType.integer, implementation: () => 0 });
  memory.public.none(`CREATE TABLE "user" (id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, "emailVerified" boolean NOT NULL, username text UNIQUE, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL);
    CREATE TABLE "account" (id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"(id), password text, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL);
    CREATE TABLE kq_owner_role (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), user_id text UNIQUE NOT NULL REFERENCES "user"(id));
    INSERT INTO "user" VALUES ('old','Existing','old@example.org',true,'admin',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  // Emulation tests identity and collisions; PostgreSQL is needed for real lock semantics.
  const transaction = async <T>(work: (client: PoolClient) => Promise<T>) => { const client=await pool.connect(); try { return await work(client); } finally { client.release(); } };
  try {
    await assert.rejects(createOwnerRecord(transaction, "owner@example.org", "strong-test-password"), /уже занят/);
    assert.equal((await pool.query("SELECT * FROM kq_owner_role")).rows.length, 0);
    await pool.query('UPDATE "user" SET username=$1 WHERE id=$2', ["learner", "old"]);
    await createOwnerRecord(transaction, "owner@example.org", "strong-test-password");
    const owner = await pool.query('SELECT u.id, u.username, a.password FROM "user" u JOIN "account" a ON a."userId"=u.id JOIN kq_owner_role r ON r.user_id=u.id');
    assert.equal(owner.rows.length, 1);
    assert.equal(owner.rows[0].username, "kq_owner");
    assert.ok(owner.rows[0].password.startsWith("$argon2id$"));
    assert.equal(await verifyAccountPassword({ hash: owner.rows[0].password, password: "strong-test-password" }), true);
    await assert.rejects(createOwnerRecord(transaction, "another@example.org", "strong-test-password"), /уже создан/);
  } finally { await pool.end(); }
});

test("owner can log in with the Cyrillic alias through the existing auth handler", async () => {
  const memory = newDb();
  memory.public.registerFunction({ name: "pg_advisory_xact_lock", args: [DataType.integer], returns: DataType.integer, implementation: () => 0 });
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  const origin = "https://example.org";
  const config = { databaseURL: "postgres://test", baseURL: origin, secret: "test-secret-with-at-least-thirty-two-characters", clientId: "", clientSecret: "", passwordEnabled: true };
  const auth = createAuth(config, pool);
  Object.assign(auth.options.advanced, { database: { validateSchema: false } });
  const quote = (name: string) => `"${name.replaceAll('"','""')}"`;
  for (const table of Object.values(getAuthTables(auth.options))) {
    const fields = ['"id" text PRIMARY KEY'];
    for (const [key, field] of Object.entries(table.fields)) {
      const type = field.type === "date" ? "timestamptz" : field.type === "boolean" ? "boolean" : field.type === "number" ? "integer" : "text";
      fields.push(`${quote(field.fieldName ?? key)} ${type}${field.required ? " NOT NULL" : ""}${field.unique ? " UNIQUE" : ""}`);
    }
    memory.public.none(`CREATE TABLE ${quote(table.modelName)} (${fields.join(",")})`);
  }
  memory.public.none('CREATE TABLE kq_owner_role (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), user_id text UNIQUE NOT NULL REFERENCES "user"(id));');
  const transaction = async <T>(work: (client: PoolClient) => Promise<T>) => { const client=await pool.connect(); try { return await work(client); } finally { client.release(); } };
  const previous = process.env.BETTER_AUTH_URL; process.env.BETTER_AUTH_URL = origin;
  try {
    await createOwnerRecord(transaction, "owner@example.org", "strong-test-password");
    const limiter = { query: async () => ({ rowCount: 1, rows: [] }) } as unknown as Pool;
    const handler = createAuthHttpHandlers({ authConfiguration: () => config, getAuth: () => auth, getPool: () => limiter, hasPasswordCredential: async () => false, requireSession: request => requireSession(request, auth) });
    const post = (body: object) => handler.POST(new Request(`${origin}/api/auth/sign-in/username`, {method:"POST",headers:{origin,"content-type":"application/json","x-real-ip":"192.0.2.42"},body:JSON.stringify(body)}));
    const login = await post({ username: "админ", password: "strong-test-password" });
    assert.equal(login.status, 200, await login.clone().text());
    const cookie = login.headers.getSetCookie().map(item => item.split(";", 1)[0]).join("; ");
    const identity = await requireSession(new Request(`${origin}/private`, {headers:{cookie}}), auth);
    assert.equal(await hasOwnerRole(identity.user.id, pool), true);
    assert.equal((await post({ username: "админ", password: "wrong-password-123" })).status, 400);
  } finally { if (previous === undefined) delete process.env.BETTER_AUTH_URL; else process.env.BETTER_AUTH_URL = previous; await pool.end(); }
});
