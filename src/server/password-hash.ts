import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import { verifyPassword as verifyLegacyPassword } from "better-auth/crypto";

// OWASP's minimum Argon2id profile, with a fresh 128-bit salt per password.
const parameters = { m: 19456, t: 2, p: 1, dkLen: 32 };
const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64").replace(/=+$/, "");

export async function hashAccountPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await argon2idAsync(password.normalize("NFKC"), salt, parameters);
  return `$argon2id$v=19$m=${parameters.m},t=${parameters.t},p=${parameters.p}$${base64(salt)}$${base64(hash)}`;
}

export async function verifyAccountPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  // Existing Better Auth accounts use scrypt; preserve their ability to sign in.
  if (!hash.startsWith("$argon2id$")) {
    if (!/^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(hash)) return false;
    try { return await verifyLegacyPassword({ hash, password }); } catch { return false; }
  }
  // Restrict encoded parameters before allocating memory from a DB-supplied hash.
  const match = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/.exec(hash);
  if (!match) return false;
  try {
    const salt = Buffer.from(match[1], "base64");
    const expected = Buffer.from(match[2], "base64");
    if (salt.length !== 16 || expected.length !== 32) return false;
    const actual = await argon2idAsync(password.normalize("NFKC"), salt, parameters);
    return timingSafeEqual(Buffer.from(actual), expected);
  } catch { return false; }
}
