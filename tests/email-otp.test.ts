import assert from "node:assert/strict";
import test from "node:test";
import { getAuthTables } from "better-auth/db";
import { newDb } from "pg-mem";
import type { Pool } from "pg";
import { createAuth, requireSession } from "../src/server/auth";

test("email OTP creates and restores a session, rejects bad, reused and expired codes", async () => {
  const memory = newDb();
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  let code = "";
  const origin = "https://localhost:3000";
  const auth = createAuth({ databaseURL: "postgres://test", baseURL: origin, secret: "a-very-long-only-for-test-secret-123456789", clientId: "", clientSecret: "", mail: { mode: "development" } }, pool, async (_config, _email, otp) => { code = otp; });
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
  const post = (path: string, body: object, cookie = "") => auth.handler(new Request(`${origin}/api/auth/${path}`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": "192.0.2.9", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
  const send = () => post("email-otp/send-verification-otp", { email: "student@example.org", type: "sign-in" });
  const verify = (otp: string) => post("sign-in/email-otp", { email: "student@example.org", otp });
  try {
    assert.equal((await send()).status, 200);
    assert.match(code, /^\d{6}$/);
    const stored = await pool.query('SELECT value FROM "verification"');
    assert.equal(JSON.stringify(stored.rows).includes(code), false);
    assert.notEqual((await verify(code === "000000" ? "000001" : "000000")).status, 200);
    const first = await verify(code);
    assert.equal(first.status, 200, await first.clone().text());
    const cookie = first.headers.getSetCookie().map((item) => item.split(";", 1)[0]).join("; ");
    const identity = await requireSession(new Request(`${origin}/private`, { headers: { cookie } }), auth);
    assert.equal(identity.user.email, "student@example.org");
    assert.notEqual((await verify(code)).status, 200);
    assert.equal((await post("sign-out", {}, cookie)).status, 200);
    await assert.rejects(requireSession(new Request(`${origin}/private`, { headers: { cookie } }), auth));
    assert.equal((await send()).status, 200);
    const again = await verify(code);
    assert.equal(again.status, 200);
    assert.equal((await pool.query('SELECT id FROM "user"')).rows.length, 1);
    assert.equal((await send()).status, 200);
    await pool.query('UPDATE "verification" SET "expiresAt" = $1', [new Date(Date.now() - 60_000)]);
    assert.notEqual((await verify(code)).status, 200);
  } finally { await pool.end(); }
});
