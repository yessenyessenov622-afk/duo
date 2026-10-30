import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { hashAccountPassword } from "@/src/server/password-hash";
import { OWNER_USERNAME } from "@/src/lib/owner-login";

type Transaction = <T>(work: (client: PoolClient) => Promise<T>) => Promise<T>;
export async function createOwnerRecord(transaction: Transaction, email: string, password: string): Promise<void> {
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 12 || password.length > 128) throw new Error("Проверьте email и пароль: пароль должен содержать от 12 до 128 символов.");
  const normalizedEmail = email.trim().toLowerCase();
  const hash = await hashAccountPassword(password);
  await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(714472519)");
    const existingOwner = await client.query("SELECT 1 FROM kq_owner_role LIMIT 1");
    if (existingOwner.rowCount) throw new Error("Аккаунт владельца уже создан; автоматическое назначение отменено.");
    const collision = await client.query('SELECT 1 FROM "user" WHERE lower(username) IN ($1, $2, $3) OR lower(email) = $4 LIMIT 1', [OWNER_USERNAME, "admin", "админ", normalizedEmail]);
    if (collision.rowCount) throw new Error("Логин владельца или этот email уже занят. Права существующему аккаунту не назначены.");
    const userId = randomUUID();
    await client.query('INSERT INTO "user" (id, name, email, "emailVerified", username, "createdAt", "updatedAt") VALUES ($1, $2, $3, true, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [userId, "админ", normalizedEmail, OWNER_USERNAME]);
    await client.query('INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $2, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [randomUUID(), userId, "credential", hash]);
    await client.query("INSERT INTO kq_owner_role (user_id) VALUES ($1)", [userId]);
  });
}
