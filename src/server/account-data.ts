import "server-only";

import type { PoolClient, Pool } from "pg";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/src/lib/customization";
import { createInitialLearningProgress } from "@/src/lib/learning-progress";
import { defaultAccountPreferences, mergeAccountProgress, normalizeAccountPreferences, normalizeAccountProgress, normalizeAccountSettings } from "@/src/lib/account-data";
import type { AccountData, AccountDataUpdate, GuestDataImport } from "@/src/types/account";
import { getPool, withTransaction } from "@/src/server/db";

type AccountRow = { progress: unknown; settings: unknown; preferences: unknown; revision: string | number };
type Database = Pick<Pool | PoolClient, "query">;
type Transaction = <T>(work: (client: PoolClient) => Promise<T>) => Promise<T>;

export class AccountRevisionConflict extends Error {
  constructor(public readonly data: AccountData) { super("Прогресс изменился на другом устройстве. Обнови данные и повтори сохранение."); }
}

function fromRow(row: AccountRow): AccountData {
  return { progress: normalizeAccountProgress(row.progress), settings: normalizeAccountSettings(row.settings), preferences: normalizeAccountPreferences(row.preferences ?? defaultAccountPreferences()), revision: Number(row.revision) };
}

async function ensureAccount(db: Database, userId: string) {
  await db.query(
    "INSERT INTO kq_account_data (user_id, progress, settings) VALUES ($1, $2::jsonb, $3::jsonb) ON CONFLICT (user_id) DO NOTHING",
    [userId, JSON.stringify(createInitialLearningProgress()), JSON.stringify(normalizeSettings(DEFAULT_SETTINGS))],
  );
}

/** Injection is used by integration tests; HTTP routes always use the server pool. */
export function createAccountDataRepository(pool: Database, transaction: Transaction) {
async function read(userId: string): Promise<AccountData> {
  await ensureAccount(pool, userId);
  const { rows } = await pool.query<AccountRow>("SELECT progress, settings, preferences, revision FROM kq_account_data WHERE user_id = $1", [userId]);
  return fromRow(rows[0]);
}

async function update(userId: string, update: AccountDataUpdate): Promise<AccountData> {
  return transaction(async (client) => {
    await ensureAccount(client, userId);
    const { rows } = await client.query<AccountRow>("SELECT progress, settings, preferences, revision FROM kq_account_data WHERE user_id = $1 FOR UPDATE", [userId]);
    const current = fromRow(rows[0]);
    if (current.revision !== update.revision) throw new AccountRevisionConflict(current);
    const progress = update.resetProgress
      ? createInitialLearningProgress()
      : update.progress ? mergeAccountProgress(current.progress, update.progress) : current.progress;
    const settings = update.settings ?? current.settings;
    const preferences = update.preferences ?? current.preferences;
    const result = await client.query<AccountRow>(
      "UPDATE kq_account_data SET progress = $2::jsonb, settings = $3::jsonb, preferences = $4::jsonb, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING progress, settings, preferences, revision",
      [userId, JSON.stringify(progress), JSON.stringify(settings), JSON.stringify(preferences)],
    );
    return fromRow(result.rows[0]);
  });
}

async function importGuest(userId: string, guest: GuestDataImport): Promise<AccountData> {
  return transaction(async (client) => {
    await ensureAccount(client, userId);
    const { rows } = await client.query<AccountRow>("SELECT progress, settings, preferences, revision FROM kq_account_data WHERE user_id = $1 FOR UPDATE", [userId]);
    const current = fromRow(rows[0]);
    // The locked account row serializes imports for this user. Read explicitly
    // before inserting so a replay also cannot replace settings or bump revision.
    const alreadyImported = await client.query("SELECT import_id FROM kq_guest_import WHERE user_id = $1 AND import_id = $2", [userId, guest.importId]);
    if (alreadyImported.rows.length) return current;
    await client.query(
      "INSERT INTO kq_guest_import (user_id, import_id) VALUES ($1, $2)",
      [userId, guest.importId],
    );
    const progress = mergeAccountProgress(current.progress, guest.progress);
    const result = await client.query<AccountRow>(
      "UPDATE kq_account_data SET progress = $2::jsonb, settings = $3::jsonb, preferences = $4::jsonb, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING progress, settings, preferences, revision",
      [userId, JSON.stringify(progress), JSON.stringify(guest.useGuestSettings ? guest.settings : current.settings), JSON.stringify(guest.useGuestSettings && guest.preferences ? guest.preferences : current.preferences)],
    );
    return fromRow(result.rows[0]);
  });
}
return { read, update, importGuest };
}

function repository(client?: PoolClient) {
  return createAccountDataRepository(client ?? getPool(), client ? async (work) => work(client) : withTransaction);
}

export async function readAccountData(userId: string, client?: PoolClient) {
  return repository(client).read(userId);
}

export async function updateAccountData(userId: string, update: AccountDataUpdate, client?: PoolClient) {
  return repository(client).update(userId, update);
}

export async function importGuestData(userId: string, guest: GuestDataImport, client?: PoolClient) {
  return repository(client).importGuest(userId, guest);
}

export const MAX_WALLPAPER_BYTES = 2 * 1024 * 1024;

/** Trust the file signature, never a client-controlled MIME or extension. */
export function wallpaperMime(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length < 12 || bytes.length > MAX_WALLPAPER_BYTES) return null;
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([82, 73, 70, 70].every((byte, i) => bytes[i] === byte) && [87, 69, 66, 80].every((byte, i) => bytes[i + 8] === byte)) return "image/webp";
  return null;
}

export async function saveAccountWallpaper(userId: string, bytes: Uint8Array, mime: string, client?: PoolClient): Promise<void> {
  await (client ?? getPool()).query(
    "INSERT INTO kq_account_wallpaper (user_id, mime_type, image_bytes) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET mime_type = EXCLUDED.mime_type, image_bytes = EXCLUDED.image_bytes, updated_at = CURRENT_TIMESTAMP",
    [userId, mime, Buffer.from(bytes)],
  );
}

export async function readAccountWallpaper(userId: string, client?: PoolClient): Promise<{ mime_type: string; image_bytes: Buffer } | null> {
  const { rows } = await (client ?? getPool()).query<{ mime_type: string; image_bytes: Buffer }>("SELECT mime_type, image_bytes FROM kq_account_wallpaper WHERE user_id = $1", [userId]);
  return rows[0] ?? null;
}
