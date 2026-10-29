import assert from "node:assert/strict";
import test from "node:test";
import { getAuthTables } from "better-auth/db";
import { hashPassword as legacyHashPassword } from "better-auth/crypto";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { createAuth, requireSession } from "../src/server/auth";

test("password registration uses a hash, keeps email unverified and supports sign-out and repeat login", async () => {
  const memory = newDb();
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  const origin = "https://localhost:3000";
  const auth = createAuth({ databaseURL: "postgres://test", baseURL: origin, secret: "test-only-secret-at-least-thirty-two-characters", clientId: "", clientSecret: "", passwordEnabled: true }, pool);
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
  const post = (path: string, body: object, cookie = "") => auth.handler(new Request(`${origin}/api/auth/${path}`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": "192.0.2.42", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
  const email = "student@example.org"; const password = "test-password-12345";
  try {
    const signup = await post("sign-up/email", { email, password, name: "Student", username: "Student_1" });
    assert.equal(signup.status, 200, await signup.clone().text());
    const cookies = signup.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
    const identity = await requireSession(new Request(`${origin}/private`, { headers: { cookie: cookies } }), auth);
    assert.equal(identity.user.emailVerified, false);
    const stored = await pool.query('SELECT password FROM "account"');
    assert.match(stored.rows[0].password, /^\$argon2id\$/); assert.notEqual(stored.rows[0].password, password);
    assert.equal((await post("sign-out", {}, cookies)).status, 200);
    await assert.rejects(requireSession(new Request(`${origin}/private`, { headers: { cookie: cookies } }), auth));
    assert.notEqual((await post("sign-in/email", { email, password: "incorrect-password" })).status, 200);
    assert.equal((await post("sign-in/email", { email, password })).status, 200);
    assert.equal((await post("sign-in/username", { username: "student_1", password })).status, 200);
    assert.notEqual((await post("sign-in/username", { username: "student_1", password: "incorrect-password" })).status, 200);
    await pool.query('UPDATE "account" SET password = $1', [await legacyHashPassword(password)]);
    assert.equal((await post("sign-in/email", { email, password })).status, 200);
    assert.notEqual((await post("sign-up/email", { email: "other@example.org", password, name: "Other", username: "STUDENT_1" })).status, 200);
    assert.notEqual((await post("sign-up/email", { email, password, name: "Other" })).status, 200);
    assert.equal((await pool.query('SELECT id FROM "user"')).rows.length, 1);
  } finally { await pool.end(); }
});
