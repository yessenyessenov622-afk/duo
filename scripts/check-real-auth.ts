// Synthetic accounts and captured mail only; never connects to production.
import assert from "node:assert/strict";
import { Pool } from "pg";
import { createAuth, hasPasswordCredential, hasPasswordResetCredential, requireSession } from "../src/server/auth";
import { createAuthHttpHandlers } from "../src/server/auth-http";

const pool = new Pool({ connectionString: "postgresql://kq_test@127.0.0.1:55439/postgres" });
const origin = "https://localhost:3189";
const config = { databaseURL: "postgresql://kq_test@127.0.0.1:55439/postgres", baseURL: origin, secret: "test-only-secret-that-is-not-a-real-credential-12345", clientId: "", clientSecret: "", passwordEnabled: true, mail: { mode: "development" } as const };
let code = "";
const auth = createAuth(config, pool, async (_config, _email, otp) => { code = otp; }, async () => {});
const handlers = createAuthHttpHandlers({ authConfiguration: () => config, getAuth: () => auth, getPool: () => pool, hasPasswordCredential: address => hasPasswordCredential(address, pool), hasPasswordResetCredential: token => hasPasswordResetCredential(token, pool), requireSession: request => requireSession(request, auth) });
const post = (path: string, body: object, cookie = "") => handlers.POST(new Request(`${origin}/api/auth/${path}`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": "192.0.2.99", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
process.env.BETTER_AUTH_URL = origin;
const email = "registration@example.test", password = "example-test-password-123", replacement = "example-new-password-123";
try {
  assert.equal((await post("sign-up/email", { email, username: "realtestuser", password })).status, 200);
  assert.match(code, /^\d{6}$/);
  assert.notEqual((await post("sign-in/email", { email, password })).status, 200);
  assert.equal((await post("email-otp/verify-email", { email, otp: code })).status, 200);
  const login = await post("sign-in/email", { email, password }); assert.equal(login.status, 200);
  const cookie = login.headers.getSetCookie().map(item => item.split(";", 1)[0]).join("; ");
  assert.ok((await requireSession(new Request(`${origin}/private`, { headers: { cookie } }), auth)).user.id);
  assert.equal((await post("email-otp/request-password-reset", { email })).status, 200);
  const reset = code;
  assert.equal((await post("email-otp/reset-password", { email, otp: reset, password: replacement })).status, 200);
  assert.notEqual((await post("email-otp/reset-password", { email, otp: reset, password: replacement })).status, 200);
  await assert.rejects(requireSession(new Request(`${origin}/private`, { headers: { cookie } }), auth));
  assert.equal((await post("sign-in/email", { email, password: replacement })).status, 200);
  console.log("PASS local PostgreSQL: registration, email verification, sign-in and single-use password reset using captured test mail");
} finally { await pool.end(); }
