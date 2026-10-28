import "server-only";

import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import type { SessionIdentity } from "./auth";
import { withTransaction } from "./db";
import { ApiError } from "./http";

export const DEVICE_COOKIE = "__Host-kiraquest-device";
export const RECOVERY_COOKIE = "__Host-kiraquest-recovery";
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_BLOCK_MS = 15 * 60_000;
export const PIN_UNLOCK_MS = 15 * 60_000;
const DEVICE_MAX_AGE = 365 * 24 * 60 * 60;
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
// OWASP's 32 MiB profile: N=2^15, r=8, p=3 balances memory on a small EC2.
const SCRYPT_P = 3;
const KEY_LENGTH = 64;

export type PinStatus = {
  enabled: boolean;
  locked: boolean;
  retryAt: number | null;
  unlockExpiresAt: number | null;
  deviceChanged: boolean;
};
type PinRow = {
  user_id: string;
  device_hash: string;
  pin_hash: string | null;
  pin_revision: number;
  failed_attempts: number;
  blocked_until: Date | string | null;
  last_recovery_at: Date | string | null;
  attempt_window_start: Date | string | null;
  attempt_window_count: number;
};
type Binding = {
  session_id: string;
  user_id: string;
  device_hash: string;
  pin_revision: number | null;
  unlocked_until: Date | string | null;
};
type BoundDevice = { device: PinRow; binding: Binding; cookieMatches: boolean };
type Transaction = typeof withTransaction;

export function digestDeviceToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isPin(value: unknown): value is string {
  return typeof value === "string" && /^\d{6}$/.test(value);
}

function peppered(pin: string, pepper: string): string {
  // The server secret makes a six-digit PIN harder to attack from a DB dump.
  return createHmac("sha256", pepper).update(pin).digest("hex");
}

function derive(pin: string, salt: Buffer, pepper: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(peppered(pin, pepper), salt, KEY_LENGTH, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 * 1024 * 1024,
    }, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPin(pin: string, pepper: string): Promise<string> {
  if (!isPin(pin) || pepper.length < 32) throw new Error("Invalid PIN hashing input");
  const salt = randomBytes(16);
  const key = await derive(pin, salt, pepper);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPinHash(pin: string, stored: string, pepper: string): Promise<boolean> {
  if (!isPin(pin) || pepper.length < 32) return false;
  const parts = stored.split("$");
  // Reject unexpected work factors; DB contents cannot request unbounded work.
  if (parts.length !== 6 || parts[0] !== "scrypt" || parts[1] !== String(SCRYPT_N) || parts[2] !== String(SCRYPT_R) || parts[3] !== String(SCRYPT_P)
    || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  const actual = await derive(pin, Buffer.from(parts[4], "hex"), pepper);
  return timingSafeEqual(actual, Buffer.from(parts[5], "hex"));
}

function timestamp(value: Date | string | null): number | null {
  if (!value) return null;
  return new Date(value).getTime();
}

export function statusForDevice(bound: BoundDevice, now = Date.now()): PinStatus {
  const { device, binding, cookieMatches } = bound;
  const enabled = device.pin_hash !== null;
  const blocked = timestamp(device.blocked_until);
  const retryAt = blocked && blocked > now ? blocked : null;
  const expires = timestamp(binding.unlocked_until);
  const unlocked = cookieMatches && !retryAt && binding.pin_revision === device.pin_revision && expires !== null && expires > now;
  return {
    enabled,
    locked: !cookieMatches || (enabled && !unlocked),
    retryAt,
    unlockExpiresAt: enabled && unlocked ? expires : null,
    deviceChanged: !cookieMatches,
  };
}

function getDeviceCookie(request: Request): string | null {
  const entry = request.headers.get("cookie")?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${DEVICE_COOKIE}=`));
  const raw = entry?.slice(DEVICE_COOKIE.length + 1) ?? "";
  return /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null;
}

export function getRecoveryCookie(request: Request): string | null {
  const entry = request.headers.get("cookie")?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${RECOVERY_COOKIE}=`));
  const raw = entry?.slice(RECOVERY_COOKIE.length + 1) ?? "";
  return /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null;
}

/**
 * A database transaction serializes checks and attempt increments on the device
 * row. Failed verification returns an error value so its counter is committed.
 */
export class PinService {
  constructor(private readonly transaction: Transaction = withTransaction, private readonly now: () => number = Date.now) {}

  private async bind(client: PoolClient, identity: SessionIdentity, rawDevice: string | null): Promise<BoundDevice> {
    let binding = (await client.query<Binding>(
      "SELECT * FROM kiraquest_pin_sessions WHERE session_id = $1 AND user_id = $2",
      [identity.session.id, identity.user.id],
    )).rows[0];
    if (!binding) {
      if (!rawDevice) throw new ApiError(423, "device_missing", "Повтори вход по почте: устройство не распознано.");
      const deviceHash = digestDeviceToken(rawDevice);
      await client.query("INSERT INTO kiraquest_pin_devices (user_id, device_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING", [identity.user.id, deviceHash]);
      await client.query(
        "INSERT INTO kiraquest_pin_sessions (session_id, user_id, device_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [identity.session.id, identity.user.id, deviceHash],
      );
      binding = (await client.query<Binding>("SELECT * FROM kiraquest_pin_sessions WHERE session_id = $1 AND user_id = $2", [identity.session.id, identity.user.id])).rows[0];
    }
    if (!binding) throw new ApiError(401, "session_expired", "Сессия закончилась. Войди по почте снова.");
    const device = (await client.query<PinRow>(
      "SELECT * FROM kiraquest_pin_devices WHERE user_id = $1 AND device_hash = $2 FOR UPDATE",
      [identity.user.id, binding.device_hash],
    )).rows[0];
    if (!device) throw new ApiError(423, "device_missing", "Устройство не распознано. Повтори вход по почте.");
    // The device lock may have waited for a manual lock, PIN change or reset.
    // Read its session binding again after that lock, otherwise an old unlocked
    // snapshot could survive an operation that has just invalidated it.
    binding = (await client.query<Binding>("SELECT * FROM kiraquest_pin_sessions WHERE session_id = $1 AND user_id = $2", [identity.session.id, identity.user.id])).rows[0];
    if (!binding) throw new ApiError(401, "session_expired", "Сессия закончилась. Войди по почте снова.");
    return { device, binding, cookieMatches: rawDevice !== null && digestDeviceToken(rawDevice) === binding.device_hash };
  }

  async status(identity: SessionIdentity, rawDevice: string | null): Promise<PinStatus> {
    return this.transaction(async (client) => statusForDevice(await this.bind(client, identity, rawDevice), this.now()));
  }

  async withUnlocked<T>(identity: SessionIdentity, rawDevice: string | null, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.transaction(async (client) => {
      const state = statusForDevice(await this.bind(client, identity, rawDevice), this.now());
      assertUnlocked(state);
      // Keep the device row lock until the protected read/write finishes. A
      // concurrent manual lock cannot finish ahead of an authorized operation.
      return work(client);
    });
  }

  async action(identity: SessionIdentity, rawDevice: string | null, body: Record<string, unknown>, pepper: string): Promise<PinStatus> {
    const action = body.action;
    if (typeof action !== "string" || !["setup", "unlock", "change", "disable", "lock"].includes(action)) throw new ApiError(400, "invalid_action", "Неизвестное действие с PIN.");
    if ((action === "setup" || action === "change") && (!isPin(body.pin) || body.pin !== body.confirmation)) {
      throw new ApiError(400, "pin_mismatch", "Введи одинаковый PIN из 6 цифр в обоих полях.");
    }
    if (action === "unlock" && !isPin(body.pin)) throw new ApiError(400, "invalid_pin", "PIN должен состоять из 6 цифр.");
    if ((action === "change" || action === "disable") && !isPin(body.currentPin)) throw new ApiError(400, "invalid_pin", "Введи текущий PIN из 6 цифр.");

    const result = await this.transaction(async (client): Promise<{ status?: PinStatus; error?: ApiError }> => {
      const bound = await this.bind(client, identity, rawDevice);
      const { device, binding } = bound;
      const now = this.now();
      const state = statusForDevice(bound, now);
      if (!bound.cookieMatches) throw new ApiError(423, "device_changed", "Это устройство не совпадает с текущей сессией. Повтори вход по почте.");
      if (action === "lock") {
        await client.query("UPDATE kiraquest_pin_sessions SET unlocked_until = NULL WHERE user_id = $1 AND device_hash = $2", [identity.user.id, device.device_hash]);
        binding.unlocked_until = null;
        return { status: statusForDevice(bound, now) };
      }
      if (state.retryAt) throw new ApiError(429, "pin_rate_limited", "Слишком много попыток. Подожди 15 минут или восстанови доступ по почте.", (state.retryAt - now) / 1000);
      if (action === "setup" && device.pin_hash) throw new ApiError(409, "pin_already_enabled", "PIN уже включён. Для изменения подтверди текущий PIN.");
      if (action !== "setup" && !device.pin_hash) throw new ApiError(409, "pin_not_enabled", "На этом устройстве PIN не включён.");

      // Also cap correct requests. Otherwise an authenticated client knowing
      // its own PIN could repeatedly request expensive scrypt operations.
      const windowStart = timestamp(device.attempt_window_start);
      const inWindow = windowStart !== null && now - windowStart < 60_000;
      const windowCount = inWindow ? device.attempt_window_count : 0;
      if (windowCount >= 10) throw new ApiError(429, "pin_busy", "Подожди минуту перед следующим действием с PIN.", (60_000 - (now - windowStart!)) / 1000);
      await client.query("UPDATE kiraquest_pin_devices SET attempt_window_start = $3, attempt_window_count = $4 WHERE user_id = $1 AND device_hash = $2", [identity.user.id, device.device_hash, new Date(inWindow ? windowStart! : now), windowCount + 1]);

      if (action !== "setup") {
        const candidate = action === "unlock" ? body.pin : body.currentPin;
        if (!await verifyPinHash(candidate as string, device.pin_hash!, pepper)) {
          // Expired lockouts start a new group of attempts. This is one atomic
          // update under FOR UPDATE; concurrent requests cannot lose increments.
          const attempts = state.retryAt === null && device.blocked_until ? 1 : device.failed_attempts + 1;
          const blockedUntil = attempts >= PIN_MAX_ATTEMPTS ? new Date(now + PIN_BLOCK_MS) : null;
          await client.query("UPDATE kiraquest_pin_devices SET failed_attempts = $3, blocked_until = $4 WHERE user_id = $1 AND device_hash = $2", [identity.user.id, device.device_hash, attempts, blockedUntil]);
          if (blockedUntil) {
            await client.query("UPDATE kiraquest_pin_sessions SET unlocked_until = NULL WHERE user_id = $1 AND device_hash = $2", [identity.user.id, device.device_hash]);
            return { error: new ApiError(429, "pin_rate_limited", "Слишком много попыток. Подожди 15 минут или восстанови доступ по почте.", PIN_BLOCK_MS / 1000) };
          }
          return { error: new ApiError(403, "incorrect_pin", `Неверный PIN. Осталось попыток: ${PIN_MAX_ATTEMPTS - attempts}.`) };
        }
      }

      if (action === "setup" || action === "change") {
        device.pin_hash = await hashPin(body.pin as string, pepper);
        device.pin_revision += 1;
      } else if (action === "disable") {
        device.pin_hash = null;
        device.pin_revision += 1;
      }
      device.blocked_until = null;
      device.failed_attempts = 0;
      binding.pin_revision = device.pin_revision;
      binding.unlocked_until = new Date(now + PIN_UNLOCK_MS);
      await client.query("UPDATE kiraquest_pin_devices SET pin_hash = $3, pin_revision = $4, failed_attempts = 0, blocked_until = NULL WHERE user_id = $1 AND device_hash = $2", [identity.user.id, device.device_hash, device.pin_hash, device.pin_revision]);
      await client.query("UPDATE kiraquest_pin_sessions SET pin_revision = $2, unlocked_until = $3 WHERE session_id = $1", [identity.session.id, device.pin_revision, binding.unlocked_until]);
      return { status: statusForDevice(bound, now) };
    });
    if (result.error) throw result.error;
    return result.status!;
  }

  async createRecovery(identity: SessionIdentity, rawDevice: string | null): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.transaction(async (client) => {
      const { device } = await this.bind(client, identity, rawDevice);
      const now = this.now();
      const previous = timestamp(device.last_recovery_at);
      if (previous !== null && now - previous < 60_000) {
        throw new ApiError(429, "recovery_rate_limited", "Подожди минуту перед повторной попыткой восстановления по почте.", (60_000 - (now - previous)) / 1000);
      }
      // Internal Better Auth API calls bypass its HTTP rate limiter, so the
      // device row also serializes a server-side recovery cooldown.
      await client.query("UPDATE kiraquest_pin_devices SET last_recovery_at = $3 WHERE user_id = $1 AND device_hash = $2", [identity.user.id, device.device_hash, new Date(now)]);
      // One pending reset per account/device. Old challenges and expired rows
      // are removed without storing raw cookies or credentials.
      await client.query("DELETE FROM kiraquest_pin_recoveries WHERE (user_id = $1 AND device_hash = $2) OR expires_at < $3", [identity.user.id, device.device_hash, new Date(now)]);
      await client.query("INSERT INTO kiraquest_pin_recoveries (token_hash, user_id, device_hash, old_session_id, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)", [digestDeviceToken(token), identity.user.id, device.device_hash, identity.session.id, new Date(now), new Date(now + 10 * 60_000)]);
    });
    return token;
  }

  async completeRecovery(identity: SessionIdentity, rawRecovery: string): Promise<void> {
    await this.transaction(async (client) => {
      type RecoveryRow = { user_id: string; device_hash: string; old_session_id: string; created_at: Date; expires_at: Date };
      const tokenHash = digestDeviceToken(rawRecovery);
      const candidate = (await client.query<RecoveryRow>("SELECT * FROM kiraquest_pin_recoveries WHERE token_hash = $1", [tokenHash])).rows[0];
      const now = this.now();
      if (!candidate || candidate.user_id !== identity.user.id) throw new ApiError(403, "recovery_invalid", "Восстановление не подтверждено. Выбери ту же почту и повтори попытку.");
      // Use the same device -> recovery lock order as createRecovery. The
      // challenge is re-read only after acquiring the device row lock.
      await client.query("SELECT user_id FROM kiraquest_pin_devices WHERE user_id = $1 AND device_hash = $2 FOR UPDATE", [identity.user.id, candidate.device_hash]);
      const challenge = (await client.query<RecoveryRow>("SELECT * FROM kiraquest_pin_recoveries WHERE token_hash = $1 FOR UPDATE", [tokenHash])).rows[0];
      if (!challenge || new Date(challenge.expires_at).getTime() <= now || challenge.user_id !== identity.user.id
        || challenge.old_session_id === identity.session.id || identity.session.createdAt.getTime() < new Date(challenge.created_at).getTime()) {
        throw new ApiError(403, "recovery_invalid", "Восстановление не подтверждено. Выбери ту же почту и повтори попытку.");
      }
      // Consume first; the entire reset and session revocation commit together.
      await client.query("DELETE FROM kiraquest_pin_recoveries WHERE token_hash = $1", [digestDeviceToken(rawRecovery)]);
      await client.query("UPDATE kiraquest_pin_devices SET pin_hash = NULL, pin_revision = pin_revision + 1, failed_attempts = 0, blocked_until = NULL WHERE user_id = $1 AND device_hash = $2", [identity.user.id, challenge.device_hash]);
      await client.query("UPDATE kiraquest_pin_sessions SET pin_revision = NULL, unlocked_until = NULL WHERE user_id = $1 AND device_hash = $2", [identity.user.id, challenge.device_hash]);
      await client.query('DELETE FROM "session" WHERE id = $1 AND "userId" = $2', [challenge.old_session_id, identity.user.id]);
    });
  }
}

const pinService = new PinService();

async function ensureDevice(request: Request, identity: SessionIdentity): Promise<string | null> {
  const existing = getDeviceCookie(request);
  if (existing) return existing;
  // Only a session that has not been bound may create a device identity. Once
  // bound, deleting the cookie locks access instead of bypassing an enabled PIN.
  const bound = await withTransaction(async (client) => (await client.query("SELECT session_id FROM kiraquest_pin_sessions WHERE session_id = $1 AND user_id = $2", [identity.session.id, identity.user.id])).rows.length > 0);
  if (bound) return null;
  const token = randomBytes(32).toString("base64url");
  (await cookies()).set(DEVICE_COOKIE, token, { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: DEVICE_MAX_AGE });
  return token;
}

export async function getPinStatus(request: Request, identity: SessionIdentity): Promise<PinStatus> {
  return pinService.status(identity, await ensureDevice(request, identity));
}

export async function requireUnlocked(request: Request, identity: SessionIdentity): Promise<void> {
  const state = await getPinStatus(request, identity);
  assertUnlocked(state);
}

function assertUnlocked(state: PinStatus): void {
  if (state.locked) throw new ApiError(423, state.deviceChanged ? "device_changed" : "app_locked", state.deviceChanged
    ? "Устройство не распознано. Повтори вход по почте."
    : "Разблокируй KiraQuest с помощью PIN или восстанови доступ по почте.");
}

export async function withUnlocked<T>(request: Request, identity: SessionIdentity, work: (client: PoolClient) => Promise<T>): Promise<T> {
  return pinService.withUnlocked(identity, await ensureDevice(request, identity), work);
}

export async function performPinAction(request: Request, identity: SessionIdentity, body: Record<string, unknown>): Promise<PinStatus> {
  const pepper = process.env.KIRAQUEST_PIN_PEPPER || process.env.BETTER_AUTH_SECRET || "";
  if (pepper.length < 32) throw new ApiError(503, "pin_not_configured", "Защита PIN пока не настроена владельцем KiraQuest.");
  return pinService.action(identity, await ensureDevice(request, identity), body, pepper);
}

export async function beginPinRecovery(request: Request, identity: SessionIdentity): Promise<string> {
  return pinService.createRecovery(identity, await ensureDevice(request, identity));
}

export async function finishPinRecovery(identity: SessionIdentity, token: string): Promise<void> {
  await pinService.completeRecovery(identity, token);
}
