import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DataType, newDb } from "pg-mem";
import type { Pool, PoolClient } from "pg";
import { validateReview } from "../src/lib/review-validation";
import { deleteReview, ownReview, saveReview } from "../src/server/reviews";
import { createReviewHandlers } from "../src/server/reviews-http";
import { ApiError } from "../src/server/http";

test("review input validates score, length and control characters while preserving text", () => {
  assert.throws(() => validateReview({ rating: 0, body: "Достаточно длинный отзыв" }));
  assert.throws(() => validateReview({ rating: 5, body: "short" }));
  assert.throws(() => validateReview({ rating: 4, body: "текст с управляющим \u0000 знаком" }));
  assert.equal(validateReview({ rating: 3, body: "  <script>alert(1)</script>  " }).body, "<script>alert(1)</script>");
});

test("guests can read but cannot write reviews, and cross-origin requests fail", async () => {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = "https://example.org";
  let writes = 0;
  const handlers = createReviewHandlers({
    authenticate: async () => { throw new ApiError(401, "session_expired", "Войдите в аккаунт."); },
    unlocked: async () => { writes++; throw new Error("unexpected write"); },
    list: async () => ({ reviews: [], total: 0, average: null, filtered: 0, page: 1, pageSize: 10 }),
  });
  const request = (method: string, origin = "https://example.org") => new Request("https://example.org/api/reviews", {
    method, headers: { origin, "content-type": "application/json" }, ...(method === "GET" ? {} : { body: JSON.stringify({ rating: 5, body: "Отличное приложение." }) }),
  });
  try {
    assert.equal((await handlers.GET(request("GET"))).status, 200);
    assert.equal((await handlers.POST(request("POST"))).status, 401);
    assert.equal((await handlers.DELETE(request("DELETE"))).status, 401);
    assert.equal((await handlers.POST(request("POST", "https://attacker.example"))).status, 403);
    assert.equal(writes, 0);
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_URL; else process.env.BETTER_AUTH_URL = previous;
  }
});

test("one review per account, ownership, rate limit and hidden status survive edits", async () => {
  const memory = newDb();
  memory.public.registerFunction({ name: "char_length", args: [DataType.text], returns: DataType.integer, implementation: (value: string) => Array.from(value).length });
  memory.public.none('CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" (id) VALUES (\'alice\'), (\'bob\');');
  // pg-mem cannot compare CURRENT_TIMESTAMP - INTERVAL to timestamptz.
  memory.public.none((await readFile(new URL("../src/server/migrations/006-reviews.sql", import.meta.url), "utf8")).replaceAll("timestamptz", "timestamp"));
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const pool = new MemoryPool() as unknown as Pool;
  const client = await pool.connect() as PoolClient;
  try {
    await saveReview(client, "alice", validateReview({ rating: 5, body: "Отличный учебный материал." }));
    await assert.rejects(saveReview(client, "alice", validateReview({ rating: 1, body: "Ещё один текст отзыва." })), /30 секунд/);
    await saveReview(client, "bob", validateReview({ rating: 4, body: "Тоже полезное приложение." }));
    await client.query("UPDATE kq_reviews SET hidden_at = CURRENT_TIMESTAMP, hidden_reason = 'причина' WHERE user_id = $1", ["alice"]);
    await client.query("UPDATE kq_review_write_limits SET last_action_at = CURRENT_TIMESTAMP - INTERVAL '31 seconds' WHERE user_id = $1", ["alice"]);
    const changed = await saveReview(client, "alice", validateReview({ rating: 3, body: "Изменённый текст отзыва." }));
    assert.equal(changed.rating, 3);
    assert.equal(changed.hidden_reason, "причина");
    assert.ok(changed.hidden_at);
    assert.equal(changed.edited, true);
    await client.query("UPDATE kq_review_write_limits SET last_action_at = CURRENT_TIMESTAMP - INTERVAL '31 seconds' WHERE user_id = $1", ["alice"]);
    await deleteReview(client, "alice");
    assert.equal(await ownReview(client, "alice"), null);
    assert.equal((await ownReview(client, "bob")).rating, 4);
  } finally { client.release(); await pool.end(); }
});
