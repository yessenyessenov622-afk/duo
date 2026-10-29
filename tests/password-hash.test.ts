import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword as legacyHashPassword } from "better-auth/crypto";
import { hashAccountPassword, verifyAccountPassword } from "../src/server/password-hash";

test("Argon2id uses random salt and preserves legacy scrypt verification", async () => {
  const password = "a long separate password";
  const hash = await hashAccountPassword(password);
  const other = await hashAccountPassword(password);
  assert.match(hash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert.notEqual(hash, other);
  assert.equal(await verifyAccountPassword({ hash, password }), true);
  assert.equal(await verifyAccountPassword({ hash, password: "wrong password" }), false);
  assert.equal(await verifyAccountPassword({ hash: hash.replace("m=19456", "m=99999999"), password }), false);
  const oldHash = await legacyHashPassword(password);
  assert.equal(await verifyAccountPassword({ hash: oldHash, password }), true);
  assert.equal(await verifyAccountPassword({ hash: oldHash, password: "wrong password" }), false);
});
