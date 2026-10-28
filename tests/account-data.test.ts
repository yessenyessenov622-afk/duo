import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DataType, newDb } from "pg-mem";
import type { Pool, PoolClient } from "pg";
import { createInitialLearningProgress } from "../src/lib/learning-progress";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/lib/customization";
import { AccountDataValidationError, mergeAccountProgress, normalizeAccountProgress, parseAccountUpdate, parseGuestImport } from "../src/lib/account-data";
import { AccountRevisionConflict, createAccountDataRepository, MAX_WALLPAPER_BYTES, wallpaperMime } from "../src/server/account-data";

function progress(completedLessons: string[], overrides: Record<string, unknown> = {}) {
  return { ...createInitialLearningProgress(), startedCourses: ["english-start"], completedLessons, xp: completedLessons.length * 25, tokens: completedLessons.length * 5, ...overrides };
}

async function fixture() {
  const memory = newDb();
  memory.public.registerFunction({ name: "octet_length", args: [DataType.bytea], returns: DataType.integer, implementation: (value: Buffer) => value.length });
  memory.public.none('CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" (id) VALUES (\'alice\'), (\'bob\');');
  memory.public.none(await readFile(new URL("../src/server/migrations/003-account-data.sql", import.meta.url), "utf8"));
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  // pg-mem does not emulate transaction isolation. These tests verify SQL scope,
  // revisions and idempotency; real PostgreSQL concurrency is a separate check.
  const transaction = async <T>(work: (client: PoolClient) => Promise<T>) => {
    const client = await pool.connect();
    try { return await work(client); } finally { client.release(); }
  };
  return { pool, repository: createAccountDataRepository(pool, transaction), transaction };
}

test("normalization preserves completed legacy IDs after gaps, strips unknown private fields", () => {
  const normalized = normalizeAccountProgress(progress(["hello-2", "words-2", "hello-2"], {
    nickname: "Саша", selectedMascotId: "kumo", lessonSession: { lessonId: "words-1", step: 1 },
    userId: "bob", accessToken: "must-not-persist", settings: { theme: "dark" },
  }));
  assert.deepEqual(normalized.completedLessons, ["hello-2", "words-2"]);
  assert.equal(normalized.nickname, "Саша");
  assert.deepEqual(normalized.lessonSession, { lessonId: "words-1", step: 1 });
  assert.equal("accessToken" in normalized, false);
  assert.equal("userId" in normalized, false);
  assert.equal("settings" in normalized, false);
});

test("overlapping guest progress and repeated merges never award the same lesson twice", () => {
  const account = progress(["hello-1", "hello-2"], { totalAnswers: 4, correctAnswers: 3 });
  const guest = progress(["hello-2", "words-1"], { totalAnswers: 7, correctAnswers: 5 });
  const merged = mergeAccountProgress(account, guest);
  assert.deepEqual(merged.completedLessons, ["hello-1", "hello-2", "words-1"]);
  assert.equal(merged.xp, 75);
  assert.equal(merged.tokens, 15);
  assert.equal(merged.totalAnswers, 7);
  assert.equal(merged.correctAnswers, 5);
  assert.deepEqual(mergeAccountProgress(merged, guest), merged);
  assert.ok(merged.completedModules.includes("english-start:hello"));
});

test("legacy surplus XP is kept conservatively rather than summed twice", () => {
  const merged = mergeAccountProgress(progress(["hello-1"], { xp: 80 }), progress(["hello-1", "hello-2"], { xp: 100 }));
  assert.equal(merged.xp, 105); // Two unique lessons plus the largest historical surplus (55).
  assert.equal(mergeAccountProgress(merged, merged).xp, 105);
});

test("server validates shapes, bounds and explicit reset; legacy themes migrate", () => {
  assert.throws(() => parseAccountUpdate({ progress: progress([]) }), AccountDataValidationError);
  assert.throws(() => parseAccountUpdate({ revision: 0, progress: progress([], { xp: -1 }) }), AccountDataValidationError);
  assert.throws(() => parseAccountUpdate({ revision: 0, resetProgress: true, progress: progress([]) }), AccountDataValidationError);
  assert.throws(() => parseGuestImport({ importId: "short", progress: progress([]), settings: DEFAULT_SETTINGS, useGuestSettings: true }), AccountDataValidationError);
  const update = parseAccountUpdate({ revision: 0, settings: { version: 3, theme: "dark", mascot: { id: "kumo", accessory: "scarf" } }, injectedUserId: "bob" });
  assert.equal(update.settings?.themeMode, "dark");
  assert.equal(update.settings?.mascot.id, "kumo");
  assert.equal(update.settings?.mascot.looks.kumo.accessory, "scarf");
  assert.equal("injectedUserId" in update, false);
});

test("database isolates two users, persists settings, rejects stale device revision and preserves lesson IDs", async () => {
  const { pool, repository, transaction } = await fixture();
  try {
    const first = await repository.read("alice");
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, visualStyle: "retro-desktop", themeMode: "dark", mascot: { id: "kumo" } });
    const saved = await repository.update("alice", { revision: first.revision, progress: progress(["hello-2"]), settings });
    assert.equal(saved.revision, 1);
    assert.equal(saved.settings.visualStyle, "retro-desktop");
    const otherDevice = createAccountDataRepository(pool, transaction);
    assert.deepEqual(await otherDevice.read("alice"), saved);
    const bob = await otherDevice.read("bob");
    assert.deepEqual(bob.progress.completedLessons, []);
    assert.equal(bob.progress.xp, 0);
    assert.notEqual(bob.settings.visualStyle, "retro-desktop");
    await assert.rejects(repository.update("alice", { revision: 0, progress: progress(["words-1"]) }), (error: unknown) => error instanceof AccountRevisionConflict && error.data.revision === 1);
    const resaved = await repository.update("alice", { revision: 1, progress: progress(["hello-1"]) });
    assert.deepEqual(resaved.progress.completedLessons, ["hello-2", "hello-1"]);
    assert.equal(resaved.progress.xp, 50);
  } finally { await pool.end(); }
});

test("guest import is idempotent per account and uses explicit consent for settings", async () => {
  const { pool, repository } = await fixture();
  try {
    const alice = await repository.read("alice");
    await repository.update("alice", { revision: alice.revision, progress: progress(["hello-1"]) });
    const guest = parseGuestImport({
      importId: "guest-0123456789abcdef", progress: progress(["hello-1", "hello-2"]),
      settings: { ...DEFAULT_SETTINGS, themeMode: "dark" }, useGuestSettings: false,
    });
    const first = await repository.importGuest("alice", guest);
    assert.equal(first.progress.xp, 50);
    assert.equal(first.settings.themeMode, "light");
    assert.deepEqual(await repository.importGuest("alice", { ...guest, useGuestSettings: true }), first);
    assert.deepEqual(await repository.importGuest("alice", { ...guest, importId: "guest-another-source-12345" }), { ...first, revision: first.revision + 1 });
    const bob = await repository.importGuest("bob", { ...guest, useGuestSettings: true });
    assert.equal(bob.settings.themeMode, "dark");
    assert.equal(bob.progress.xp, 50);
    assert.equal((await repository.read("alice")).settings.themeMode, "light");
  } finally { await pool.end(); }
});

test("reset is a deliberate versioned action; stale empty snapshots do not erase completed work", async () => {
  const { pool, repository } = await fixture();
  try {
    await repository.read("alice");
    const saved = await repository.update("alice", { revision: 0, progress: progress(["hello-1"]) });
    const empty = await repository.update("alice", { revision: saved.revision, progress: createInitialLearningProgress() });
    assert.deepEqual(empty.progress.completedLessons, ["hello-1"]);
    const reset = await repository.update("alice", { revision: empty.revision, resetProgress: true });
    assert.deepEqual(reset.progress.completedLessons, []);
    assert.equal(reset.progress.xp, 0);
    assert.equal(reset.revision, 3);
  } finally { await pool.end(); }
});

test("wallpaper rejects SVG and oversized bytes even if extension or MIME claims PNG", () => {
  assert.equal(wallpaperMime(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(wallpaperMime(new Uint8Array(MAX_WALLPAPER_BYTES + 1)), null);
  assert.equal(wallpaperMime(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])), "image/png");
  assert.equal(wallpaperMime(new Uint8Array([255,216,255,0,0,0,0,0,0,0,0,0])), "image/jpeg");
  assert.equal(wallpaperMime(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80])), "image/webp");
});
