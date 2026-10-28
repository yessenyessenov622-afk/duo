import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { newDb } from "pg-mem";
import type { PoolClient } from "pg";
import { ApiError } from "../src/server/http";
import type { SessionIdentity } from "../src/server/auth";
import { digestDeviceToken, hashPin, isPin, PIN_BLOCK_MS, PIN_MAX_ATTEMPTS, PIN_UNLOCK_MS, PinService, verifyPinHash } from "../src/server/pin";

const pepper = "test-only-pin-pepper-with-at-least-32-bytes";
const deviceA = "a".repeat(43);
const deviceB = "b".repeat(43);

async function fixture() {
  const memory = newDb();
  memory.public.none('CREATE TABLE "user" (id text PRIMARY KEY); CREATE TABLE "session" (id text PRIMARY KEY, "userId" text NOT NULL REFERENCES "user"(id));');
  memory.public.none(await readFile(new URL("../src/server/migrations/002-pin.sql", import.meta.url), "utf8"));
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  let now = Date.UTC(2026, 9, 28, 12);
  const service = new PinService(async (work) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const value = await work(client as unknown as PoolClient);
      await client.query("COMMIT");
      return value;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }, () => now);
  async function identity(userId: string, sessionId: string, createdAt = now): Promise<SessionIdentity> {
    await pool.query('INSERT INTO "user" (id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
    await pool.query('INSERT INTO "session" (id, "userId") VALUES ($1, $2)', [sessionId, userId]);
    return {
      user: { id: userId, name: userId, email: `${userId}@example.test` },
      session: { id: sessionId, token: `test-${sessionId}`, createdAt: new Date(createdAt), expiresAt: new Date(now + 7 * 24 * 60 * 60_000) },
    };
  }
  return { service, pool, identity, advance: (ms: number) => { now += ms; }, get now() { return now; } };
}

function code(expected: string, status?: number) {
  return (error: unknown) => error instanceof ApiError && error.code === expected && (status === undefined || status === error.status);
}

test("PIN accepts six ASCII digits and stores independently salted scrypt hashes", async () => {
  for (const value of [123456, "12345", "1234567", "１２３４５６", "123 56", "abcdef"]) assert.equal(isPin(value), false);
  assert.equal(isPin("000000"), true);
  const first = await hashPin("123456", pepper);
  const second = await hashPin("123456", pepper);
  assert.notEqual(first, second);
  assert.equal(first.includes("123456"), false);
  assert.equal(await verifyPinHash("123456", first, pepper), true);
  assert.equal(await verifyPinHash("654321", first, pepper), false);
  assert.equal(await verifyPinHash("123456", first, "different-pepper-with-at-least-32-bytes"), false);
  assert.equal(await verifyPinHash("123456", first.replace("32768", "1073741824"), pepper), false);
});

test("setup needs repeated PIN, unlock binds to session, expiry and manual lock deny data", async () => {
  const f = await fixture();
  const identity = await f.identity("alice", "session-a");
  assert.equal((await f.service.status(identity, deviceA)).enabled, false);
  await assert.rejects(f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "999999" }, pepper), code("pin_mismatch", 400));
  const setup = await f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  assert.equal(setup.enabled, true);
  assert.equal(setup.locked, false);
  assert.equal(setup.unlockExpiresAt, f.now + PIN_UNLOCK_MS);
  const freshSession = await f.identity("alice", "session-a-2");
  assert.equal((await f.service.status(freshSession, deviceA)).locked, true);
  await f.service.action(freshSession, deviceA, { action: "unlock", pin: "123456" }, pepper);
  assert.equal((await f.service.status(freshSession, deviceA)).locked, false);
  f.advance(PIN_UNLOCK_MS + 1);
  assert.equal((await f.service.status(identity, deviceA)).locked, true);
  await f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper);
  await f.service.action(identity, deviceA, { action: "lock" }, pepper);
  assert.equal((await f.service.status(identity, deviceA)).locked, true);
  await f.pool.end();
});

test("five failed attempts commit, lock out even correct PIN, and permit retry after timeout", async () => {
  const f = await fixture();
  const identity = await f.identity("alice", "session-a");
  await f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  await f.service.action(identity, deviceA, { action: "lock" }, pepper);
  for (let attempt = 1; attempt <= PIN_MAX_ATTEMPTS; attempt++) {
    await assert.rejects(f.service.action(identity, deviceA, { action: "unlock", pin: "000000" }, pepper), code(attempt === PIN_MAX_ATTEMPTS ? "pin_rate_limited" : "incorrect_pin"));
    const row = (await f.pool.query("SELECT failed_attempts FROM kiraquest_pin_devices WHERE user_id = $1", ["alice"])).rows[0];
    assert.equal(row.failed_attempts, attempt);
  }
  assert.equal((await f.service.status(identity, deviceA)).retryAt, f.now + PIN_BLOCK_MS);
  await assert.rejects(f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper), code("pin_rate_limited", 429));
  f.advance(PIN_BLOCK_MS + 1);
  await assert.rejects(f.service.action(identity, deviceA, { action: "unlock", pin: "000000" }, pepper), code("incorrect_pin"));
  assert.equal((await f.pool.query("SELECT failed_attempts FROM kiraquest_pin_devices")).rows[0].failed_attempts, 1);
  assert.equal((await f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper)).locked, false);
  await f.pool.end();
});

test("change and disable need current PIN; changing invalidates other sessions", async () => {
  const f = await fixture();
  const identity = await f.identity("alice", "session-a");
  await f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  const second = await f.identity("alice", "session-a-2");
  await f.service.action(second, deviceA, { action: "unlock", pin: "123456" }, pepper);
  await assert.rejects(f.service.action(identity, deviceA, { action: "change", currentPin: "000000", pin: "654321", confirmation: "654321" }, pepper), code("incorrect_pin"));
  await f.service.action(identity, deviceA, { action: "change", currentPin: "123456", pin: "654321", confirmation: "654321" }, pepper);
  assert.equal((await f.service.status(second, deviceA)).locked, true);
  await assert.rejects(f.service.action(identity, deviceA, { action: "disable", currentPin: "123456" }, pepper), code("incorrect_pin"));
  const disabled = await f.service.action(identity, deviceA, { action: "disable", currentPin: "654321" }, pepper);
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.locked, false);
  await f.pool.end();
});

test("device cookie deletion/replacement cannot bypass current session PIN; users/devices isolate", async () => {
  const f = await fixture();
  const alice = await f.identity("alice", "session-a");
  await f.service.action(alice, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  const missing = await f.service.status(alice, null);
  assert.equal(missing.locked, true);
  assert.equal(missing.deviceChanged, true);
  assert.equal((await f.service.status(alice, deviceB)).locked, true);
  await assert.rejects(f.service.action(alice, deviceB, { action: "unlock", pin: "123456" }, pepper), code("device_changed", 423));
  const bob = await f.identity("bob", "session-b");
  assert.equal((await f.service.status(bob, deviceA)).enabled, false);
  const anotherDevice = await f.identity("alice", "session-a-device-b");
  assert.equal((await f.service.status(anotherDevice, deviceB)).enabled, false);
  assert.equal((await f.pool.query("SELECT device_hash FROM kiraquest_pin_devices WHERE user_id = $1", ["alice"])).rows.some((row: { device_hash: string }) => row.device_hash === deviceA), false);
  assert.equal((await f.pool.query("SELECT device_hash FROM kiraquest_pin_devices WHERE user_id = $1", ["alice"])).rows.some((row: { device_hash: string }) => row.device_hash === digestDeviceToken(deviceA)), true);
  await f.pool.end();
});

test("Google recovery needs fresh same-user session, consumes challenge, revokes old session", async () => {
  const f = await fixture();
  const original = await f.identity("alice", "session-a");
  await f.service.action(original, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  const token = await f.service.createRecovery(original, deviceA);
  await assert.rejects(f.service.createRecovery(original, deviceA), code("recovery_rate_limited", 429));
  await assert.rejects(f.service.completeRecovery(original, token), code("recovery_invalid", 403));
  const bob = await f.identity("bob", "session-b");
  await assert.rejects(f.service.completeRecovery(bob, token), code("recovery_invalid", 403));
  const stale = await f.identity("alice", "session-old", f.now - 60_000);
  await assert.rejects(f.service.completeRecovery(stale, token), code("recovery_invalid", 403));
  f.advance(1000);
  const reauthenticated = await f.identity("alice", "session-reauth");
  await f.service.completeRecovery(reauthenticated, token);
  assert.equal((await f.service.status(reauthenticated, deviceA)).enabled, false);
  assert.equal((await f.pool.query('SELECT id FROM "session" WHERE id = $1', [original.session.id])).rows.length, 0);
  await assert.rejects(f.service.completeRecovery(reauthenticated, token), code("recovery_invalid", 403));
  await f.pool.end();
});

test("expired Google recovery does not disable PIN", async () => {
  const f = await fixture();
  const original = await f.identity("alice", "session-a");
  await f.service.action(original, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  const token = await f.service.createRecovery(original, deviceA);
  f.advance(10 * 60_000 + 1);
  const fresh = await f.identity("alice", "session-fresh");
  await assert.rejects(f.service.completeRecovery(fresh, token), code("recovery_invalid", 403));
  assert.equal((await f.service.status(fresh, deviceA)).enabled, true);
  await f.pool.end();
});

test("protected callback runs in the PIN transaction and is denied after lock/expiry", async () => {
  const f = await fixture();
  const identity = await f.identity("alice", "session-a");
  await f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  let transactionActive = false;
  let transactionClient: PoolClient | null = null;
  const guarded = new PinService(async (work) => {
    const client = await f.pool.connect();
    transactionClient = client as unknown as PoolClient;
    transactionActive = true;
    try { return await work(transactionClient); }
    finally { transactionActive = false; client.release(); }
  }, () => f.now);
  const result = await guarded.withUnlocked(identity, deviceA, async (client) => {
    assert.equal(transactionActive, true);
    assert.equal(client, transactionClient);
    return "protected data";
  });
  assert.equal(result, "protected data");
  assert.equal(transactionActive, false);
  await f.service.action(identity, deviceA, { action: "lock" }, pepper);
  let called = false;
  await assert.rejects(guarded.withUnlocked(identity, deviceA, async () => { called = true; }), code("app_locked", 423));
  assert.equal(called, false);
  await f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper);
  f.advance(PIN_UNLOCK_MS + 1);
  await assert.rejects(guarded.withUnlocked(identity, deviceA, async () => { called = true; }), code("app_locked", 423));
  assert.equal(called, false);
  await f.pool.end();
});

test("session binding is re-read after waiting for the device lock", async () => {
  const f = await fixture();
  const identity = await f.identity("alice", "session-a");
  await f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  let injected = false;
  const racing = new PinService(async (work) => {
    const client = await f.pool.connect();
    const originalQuery = client.query.bind(client);
    client.query = (async (sql: string, values?: unknown[]) => {
      if (!injected && sql.startsWith("SELECT * FROM kiraquest_pin_devices")) {
        // Deterministically model a completed manual lock between the first
        // binding read and acquisition of the device row lock.
        injected = true;
        await originalQuery("UPDATE kiraquest_pin_sessions SET unlocked_until = NULL WHERE session_id = $1", [identity.session.id]);
      }
      return originalQuery(sql, values);
    }) as typeof client.query;
    try { return await work(client as unknown as PoolClient); }
    finally { client.query = originalQuery; client.release(); }
  }, () => f.now);
  let called = false;
  await assert.rejects(racing.withUnlocked(identity, deviceA, async () => { called = true; }), code("app_locked", 423));
  assert.equal(injected, true);
  assert.equal(called, false);
  await f.pool.end();
});

test("correct PIN requests are throttled and malformed actions never consume an attempt", async () => {
  const f = await fixture();
  const identity = await f.identity("alice", "session-a");
  await f.service.action(identity, deviceA, { action: "setup", pin: "123456", confirmation: "123456" }, pepper);
  await assert.rejects(f.service.action(identity, deviceA, { action: ["unlock"], pin: "123456" }, pepper), code("invalid_action", 400));
  for (let count = 1; count < 10; count++) await f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper);
  await assert.rejects(f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper), code("pin_busy", 429));
  const row = (await f.pool.query("SELECT failed_attempts, attempt_window_count FROM kiraquest_pin_devices")).rows[0];
  assert.equal(row.failed_attempts, 0);
  assert.equal(row.attempt_window_count, 10);
  f.advance(60_000);
  assert.equal((await f.service.action(identity, deviceA, { action: "unlock", pin: "123456" }, pepper)).locked, false);
  await f.pool.end();
});
