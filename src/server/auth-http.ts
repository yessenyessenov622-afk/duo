import { authConfiguration, getAuth, hasPasswordCredential, hasPasswordResetCredential, requireSession } from "@/src/server/auth";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";
import { getPool } from "@/src/server/db";
import { createHmac } from "node:crypto";

function privateResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function createAuthHttpHandlers(deps: { authConfiguration: typeof authConfiguration; getAuth: typeof getAuth; getPool: typeof getPool; hasPasswordCredential: typeof hasPasswordCredential; requireSession: typeof requireSession; hasPasswordResetCredential?: typeof hasPasswordResetCredential } = { authConfiguration, getAuth, getPool, hasPasswordCredential, requireSession }) {
const { authConfiguration: configForRequest, getAuth: authForRequest, getPool: poolForRequest, hasPasswordCredential: checkCredential, requireSession: authenticate } = deps;
async function GET(request: Request) {
  try {
    const path = new URL(request.url).pathname;
    if (path !== "/api/auth/ok" && path !== "/api/auth/callback/google") {
      throw new ApiError(404, "not_found", "Такого действия нет.");
    }
    return privateResponse(await authForRequest().handler(request));
  } catch (error) { return apiError(error); }
}

async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const path = new URL(request.url).pathname;
    if (path === "/api/auth/sign-out") {
      await readJson(request.clone(), 1024);
      // A stale tab must not sign out another account that replaced its cookie.
      if (request.headers.has("x-kiraquest-account")) await authenticate(request);
      return privateResponse(await authForRequest().handler(request));
    }
    const input = await readJson(request, 4096);
    if (path === "/api/auth/request-password-reset" || path === "/api/auth/reset-password") {
      const config = configForRequest();
      if (!config?.passwordEnabled || !config.mail) throw new ApiError(503, "auth_not_configured", "Восстановление пароля пока не настроено.");
      const requesting = path.endsWith("request-password-reset");
      let body: object;
      if (requesting) {
        const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "invalid_email", "Проверь адрес электронной почты.");
        const digest = createHmac("sha256", config.secret).update(`otp-cooldown:${email}`).digest("hex");
        const claimed = await poolForRequest().query("INSERT INTO kiraquest_otp_send_limits (address_hash, last_sent_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (address_hash) DO UPDATE SET last_sent_at = CURRENT_TIMESTAMP WHERE kiraquest_otp_send_limits.last_sent_at <= CURRENT_TIMESTAMP - INTERVAL '60 seconds' RETURNING address_hash", [digest]);
        if (!claimed.rowCount) throw new ApiError(429, "otp_cooldown", "Подожди минуту перед повторной отправкой.", 60);
        // Avoid creating a credential for OAuth-only users. The response does not reveal account existence.
        if (!await checkCredential(email)) return Response.json({ success: true }, { headers: PRIVATE_HEADERS });
        body = { email };
      } else {
        const token = typeof input.token === "string" ? input.token : "";
        if (!/^[A-Za-z0-9]{24}$/.test(token) || typeof input.newPassword !== "string" || input.newPassword.length < 12 || input.newPassword.length > 128 || !await (deps.hasPasswordResetCredential ?? hasPasswordResetCredential)(token)) throw new ApiError(400, "reset_failed", "Ссылка недействительна или срок её действия истёк. Запроси новую.");
        body = { token, newPassword: input.newPassword };
      }
      const headers = new Headers(request.headers); headers.delete("content-length"); headers.set("content-type", "application/json");
      const response = await authForRequest().handler(new Request(request.url, { method: "POST", headers, body: JSON.stringify(body) }));
      if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 400, "reset_failed", "Не удалось выполнить действие. Запроси новую ссылку и попробуй снова.");
      return Response.json({ success: true }, { headers: PRIVATE_HEADERS });
    }
    if (path === "/api/auth/sign-in/email" || path === "/api/auth/sign-in/username" || path === "/api/auth/sign-up/email") {
      const config = configForRequest();
      if (!config?.passwordEnabled) throw new ApiError(404, "not_found", "Такого действия нет.");
      const signup = path === "/api/auth/sign-up/email";
      const byUsername = path === "/api/auth/sign-in/username";
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const username = typeof input.username === "string" ? input.username.trim() : "";
      const password = input.password;
      if ((!byUsername && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) || ((signup || byUsername) && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) || typeof password !== "string" || password.length < 12 || password.length > 128) throw new ApiError(400, "invalid_credentials", "Проверь данные: ник — от 3 до 30 латинских букв, цифр или _, пароль — от 12 до 128 символов.");
      const digest = createHmac("sha256", config.secret).update(`password-limit:${byUsername ? username.toLowerCase() : email}`).digest("hex");
      const claimed = await poolForRequest().query("INSERT INTO kiraquest_password_limits (address_hash, window_start, attempts) VALUES ($1, CURRENT_TIMESTAMP, 1) ON CONFLICT (address_hash) DO UPDATE SET window_start = CASE WHEN kiraquest_password_limits.window_start <= CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN CURRENT_TIMESTAMP ELSE kiraquest_password_limits.window_start END, attempts = CASE WHEN kiraquest_password_limits.window_start <= CURRENT_TIMESTAMP - INTERVAL '15 minutes' THEN 1 ELSE kiraquest_password_limits.attempts + 1 END WHERE kiraquest_password_limits.window_start <= CURRENT_TIMESTAMP - INTERVAL '15 minutes' OR kiraquest_password_limits.attempts < 10 RETURNING address_hash", [digest]);
      if (!claimed.rowCount) throw new ApiError(429, "sign_in_limited", "Слишком много попыток. Подожди 15 минут и попробуй снова.", 900);
      const headers = new Headers(request.headers); headers.delete("content-length"); headers.set("content-type", "application/json");
      const normalized = new Request(request.url, { method: "POST", headers, body: JSON.stringify(byUsername ? { username, password } : { email, password, ...(signup ? { name: username, username } : {}) }) });
      const response = await authForRequest().handler(normalized);
      if (!response.ok) {
        const detail = signup ? await response.clone().json().catch(() => ({})) : {};
        if (signup && detail.code === "USERNAME_IS_ALREADY_TAKEN") throw new ApiError(400, "nickname_taken", "Этот ник уже занят. Выбери другой.");
        throw new ApiError(response.status === 429 ? 429 : 400, "invalid_credentials", "Не удалось выполнить вход или регистрацию. Проверь данные и попробуй снова.");
      }
      const responseHeaders = new Headers(response.headers); for (const [name, value] of Object.entries(PRIVATE_HEADERS)) responseHeaders.set(name, value);
      responseHeaders.set("content-type", "application/json"); responseHeaders.delete("content-length");
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: responseHeaders });
    }
    if (["/api/auth/send-password-verification", "/api/auth/email-otp/verify-email", "/api/auth/email-otp/request-password-reset", "/api/auth/email-otp/reset-password"].includes(path)) {
      const config = configForRequest();
      if (!config?.passwordEnabled || !config.mail) throw new ApiError(503, "auth_not_configured", "Вход по паролю пока не настроен.");
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "invalid_email", "Проверь адрес электронной почты.");
      const sending = path === "/api/auth/send-password-verification" || path === "/api/auth/email-otp/request-password-reset";
      if (!sending && (typeof input.otp !== "string" || !/^\d{6}$/.test(input.otp))) throw new ApiError(400, "invalid_code", "Введи шестизначный код.");
      if (path === "/api/auth/email-otp/reset-password" && (typeof input.password !== "string" || input.password.length < 12 || input.password.length > 128)) throw new ApiError(400, "invalid_password", "Пароль должен содержать от 12 до 128 символов.");
      if (sending) {
        const digest = createHmac("sha256", config.secret).update(`otp-cooldown:${email}`).digest("hex");
        const claimed = await poolForRequest().query("INSERT INTO kiraquest_otp_send_limits (address_hash, last_sent_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (address_hash) DO UPDATE SET last_sent_at = CURRENT_TIMESTAMP WHERE kiraquest_otp_send_limits.last_sent_at <= CURRENT_TIMESTAMP - INTERVAL '60 seconds' RETURNING address_hash", [digest]);
        if (!claimed.rowCount) throw new ApiError(429, "otp_cooldown", "Подожди минуту перед повторной отправкой.", 60);
      }
      if (path === "/api/auth/email-otp/reset-password") {
        // A mailbox code must never create a password for a Google-only account.
        if (!await checkCredential(email)) throw new ApiError(400, "otp_failed", "Не удалось восстановить пароль. Проверь код и попробуй снова.");
      }
      const headers = new Headers(request.headers); headers.delete("content-length"); headers.set("content-type", "application/json");
      const targetPath = path === "/api/auth/send-password-verification" ? "/api/auth/email-otp/send-verification-otp" : path;
      const target = new URL(request.url); target.pathname = targetPath;
      const body = path === "/api/auth/send-password-verification" ? { email, type: "email-verification" } : sending ? { email } : path === "/api/auth/email-otp/reset-password" ? { email, otp: input.otp, password: input.password } : { email, otp: input.otp };
      const response = await authForRequest().handler(new Request(target, { method: "POST", headers, body: JSON.stringify(body) }));
      if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 400, "otp_failed", "Не удалось выполнить действие. Проверь код и попробуй снова.");
      const responseHeaders = new Headers(response.headers); for (const [name, value] of Object.entries(PRIVATE_HEADERS)) responseHeaders.set(name, value);
      responseHeaders.set("content-type", "application/json"); responseHeaders.delete("content-length");
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: responseHeaders });
    }
    if (path === "/api/auth/email-otp/send-verification-otp" || path === "/api/auth/sign-in/email-otp") {
      const config = configForRequest();
      if (!config?.mail) throw new ApiError(503, "auth_not_configured", "Вход по почте пока не настроен.");
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "invalid_email", "Проверь адрес электронной почты.");
      const sending = path.endsWith("send-verification-otp");
      if (!sending && (typeof input.otp !== "string" || !/^\d{6}$/.test(input.otp))) throw new ApiError(400, "invalid_code", "Введи шестизначный код.");
      if (sending) {
        const digest = createHmac("sha256", config.secret).update(`otp-cooldown:${email}`).digest("hex");
        const claimed = await poolForRequest().query("INSERT INTO kiraquest_otp_send_limits (address_hash, last_sent_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (address_hash) DO UPDATE SET last_sent_at = CURRENT_TIMESTAMP WHERE kiraquest_otp_send_limits.last_sent_at <= CURRENT_TIMESTAMP - INTERVAL '60 seconds' RETURNING address_hash", [digest]);
        if (!claimed.rowCount) throw new ApiError(429, "otp_cooldown", "Подожди минуту перед повторной отправкой.", 60);
      } else {
        // A Google-only identity must not be silently linked to a new login method.
        const linked = await poolForRequest().query('SELECT 1 FROM "user" u JOIN "account" a ON a."userId" = u.id WHERE lower(u.email) = $1 AND a."providerId" = $2 LIMIT 1', [email, "google"]);
        if (linked.rowCount) throw new ApiError(400, "otp_failed", "Код неверен, истёк или уже использован. Запроси новый код и повтори.");
      }
      const headers = new Headers(request.headers);
      headers.delete("content-length"); headers.set("content-type", "application/json");
      const normalized = new Request(request.url, { method: "POST", headers, body: JSON.stringify(sending ? { email, type: "sign-in" } : { email, otp: input.otp, name: "Ученик" }) });
      const response = await authForRequest().handler(normalized);
      if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 400, "otp_failed", sending ? "Не удалось отправить код. Попробуй позже." : "Код неверен, истёк или уже использован. Запроси новый код и повтори.");
      // Better Auth's response also contains the session token. Only cookies leave this boundary.
      const responseHeaders = new Headers(response.headers);
      for (const [name, value] of Object.entries(PRIVATE_HEADERS)) responseHeaders.set(name, value);
      responseHeaders.set("content-type", "application/json"); responseHeaders.delete("content-length");
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: responseHeaders });
    }
    if (path !== "/api/auth/sign-in/social") throw new ApiError(404, "not_found", "Такого действия нет.");
    if (input.provider !== "google" || input.idToken !== undefined || input.scopes !== undefined || input.additionalParams !== undefined) {
      throw new ApiError(400, "invalid_sign_in", "Используй кнопку «Продолжить с Google».");
    }
    // Redirects are deliberately fixed. Callers cannot enlarge scopes, submit ID
    // tokens directly, link accounts, fetch provider tokens or redirect off-site.
    const callbackURL = input.callbackURL === "/api/account/recovery/complete" ? "/api/account/recovery/complete" : "/profile";
    const body = { provider: "google", callbackURL, errorCallbackURL: "/sign-in?error=oauth", disableRedirect: true };
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    const normalized = new Request(request.url, { method: "POST", headers, body: JSON.stringify(body) });
    return privateResponse(await authForRequest().handler(normalized));
  } catch (error) { return apiError(error); }
}

return { GET, POST };
}
