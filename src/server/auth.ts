import "server-only";

import { isIP } from "node:net";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, username } from "better-auth/plugins";
import { createHmac } from "node:crypto";
import { deliverOtpMail, deliverPasswordResetLink, otpMailConfiguration, type OtpMailConfig } from "./otp-mail";
import { hashAccountPassword, verifyAccountPassword } from "./password-hash";
import type { Pool } from "pg";
import { getPool } from "./db";
import { ApiError } from "./http";

export type SessionIdentity = {
  user: { id: string; name: string; email: string; image?: string | null; emailVerified?: boolean };
  session: { id: string; createdAt: Date; expiresAt: Date; token: string };
};

export type AuthConfiguration = { databaseURL: string; baseURL: string; secret: string; clientId: string; clientSecret: string; mail?: OtpMailConfig | null; passwordEnabled?: boolean };

export function authConfiguration(env: Record<string, string | undefined> = process.env): AuthConfiguration | null {
  const { DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env;
  const mail = otpMailConfiguration(env);
  const passwordEnabled = env.KIRAQUEST_PASSWORD_AUTH === "enabled" && !!mail;
  if (!DATABASE_URL || !BETTER_AUTH_URL || !BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32 || (!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) && !mail && !passwordEnabled)) return null;
  try {
    const url = new URL(BETTER_AUTH_URL);
    // Secure cookies are never weakened for the current HTTP-only EC2 address.
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (env.NODE_ENV === "production" && (isIP(url.hostname) || url.hostname === "localhost" || !url.hostname.includes("."))) return null;
    return { databaseURL: DATABASE_URL, baseURL: url.origin, secret: BETTER_AUTH_SECRET, clientId: GOOGLE_CLIENT_ID ?? "", clientSecret: GOOGLE_CLIENT_SECRET ?? "", mail, passwordEnabled };
  } catch { return null; }
}

export function isAuthConfigured(): boolean { return authConfiguration() !== null; }

/** Resetting a password must not attach a credential to an OAuth-only account. */
export async function hasPasswordCredential(email: string, database: Pick<Pool, "query"> = getPool()): Promise<boolean> {
  const result = await database.query('SELECT 1 FROM "user" u JOIN "account" a ON a."userId" = u.id WHERE lower(u.email) = $1 AND a."providerId" = $2 AND a.password IS NOT NULL LIMIT 1', [email.toLowerCase(), "credential"]);
  return !!result.rowCount;
}

export async function hasPasswordResetCredential(token: string, database: Pick<Pool, "query"> = getPool()): Promise<boolean> {
  if (!/^[A-Za-z0-9]{24}$/.test(token)) return false;
  // Better Auth validates expiration and atomically consumes the token when resetting.
  const result = await database.query('SELECT 1 FROM "verification" v JOIN "account" a ON a."userId" = v.value WHERE v.identifier = $1 AND a."providerId" = $2 AND a.password IS NOT NULL LIMIT 1', [`reset-password:${token}`, "credential"]);
  return !!result.rowCount;
}

/** The factory also permits testing the real adapter against an isolated DB. */
export function createAuth(config: AuthConfiguration, database: Pool, sendOtp = deliverOtpMail, sendResetLink = deliverPasswordResetLink) {
  return betterAuth({
    appName: "KiraQuest",
    baseURL: config.baseURL,
    basePath: "/api/auth",
    secret: config.secret,
    database,
    emailAndPassword: {
      enabled: config.passwordEnabled === true, minPasswordLength: 12, maxPasswordLength: 128,
      requireEmailVerification: !!config.mail, revokeSessionsOnPasswordReset: true,
      password: { hash: hashAccountPassword, verify: verifyAccountPassword },
      resetPasswordTokenExpiresIn: 30 * 60,
      ...(config.mail ? { sendResetPassword: async ({ user, token }: { user: { email: string }; token: string }) => {
        await sendResetLink(config.mail!, user.email, `${config.baseURL}/reset-password#token=${token}`);
      } } : {}),
    },
    emailVerification: { sendOnSignUp: !!config.mail && config.passwordEnabled === true, autoSignInAfterVerification: false },
    socialProviders: config.clientId && config.clientSecret ? {
      google: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scope: ["openid", "email", "profile"],
        disableDefaultScope: true,
        includeGrantedScopes: false,
        accessType: "online",
        prompt: "select_account",
      },
    } : {},
    account: {
      accountLinking: { enabled: false, disableImplicitLinking: true },
      encryptOAuthTokens: true,
      storeStateStrategy: "database",
      storeAccountCookie: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: true,
      cookiePrefix: "kiraquest",
      defaultCookieAttributes: { secure: true, httpOnly: true, sameSite: "lax", path: "/" },
      // Nginx must overwrite X-Real-IP with $remote_addr, not a client header.
      ipAddress: { ipAddressHeaders: ["x-real-ip"] },
    },
    trustedOrigins: [config.baseURL],
    onAPIError: { errorURL: `${config.baseURL}/sign-in` },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: { "/sign-in/social": { window: 60, max: 10 }, "/sign-in/email": { window: 60, max: 5 }, "/sign-in/username": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 5 }, "/change-password": { window: 60, max: 5 } },
    },
    telemetry: { enabled: false },
    logger: { disabled: true },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 30, displayUsername: false, immutableUsername: true, usernameValidator: (value) => /^[a-zA-Z0-9_]+$/.test(value) }),
      ...(config.mail ? [emailOTP({
        otpLength: 6, expiresIn: 300, allowedAttempts: 5,
        overrideDefaultEmailVerification: config.passwordEnabled === true,
        storeOTP: { hash: async (otp) => createHmac("sha256", config.secret).update(`kiraquest-email-otp:${otp}`).digest("hex") },
        rateLimit: { window: 60, max: 5 },
        sendVerificationOTP: async ({ email, otp, type }) => sendOtp(config.mail!, email, otp, undefined, type),
      })] : []),
      nextCookies(),
    ],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth(): ReturnType<typeof createAuth> {
  const config = authConfiguration();
  if (!config) throw new ApiError(503, "auth_not_configured", "Вход пока не настроен владельцем KiraQuest.");
  return auth ??= createAuth(config, getPool());
}

/** Every private API calls this; a cookie's presence alone grants no access. */
export async function requireSession(request: Request, authInstance = getAuth()): Promise<SessionIdentity> {
  const identity = await authInstance.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
  if (!identity || identity.session.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(401, "session_expired", "Войди, чтобы продолжить. Сессия закончилась или ты вышел из аккаунта.");
  }
  const expected = request.headers.get("x-kiraquest-account");
  if (expected && expected !== identity.user.id) {
    throw new ApiError(409, "account_changed", "Аккаунт изменился в другой вкладке. Обнови страницу перед сохранением.");
  }
  // This header detects stale tabs; only the verified server session identifies
  // the owner. It is never accepted as an authentication credential.
  return {
    user: { id: identity.user.id, name: identity.user.name, email: identity.user.email, image: identity.user.image, emailVerified: identity.user.emailVerified },
    session: { id: identity.session.id, createdAt: identity.session.createdAt, expiresAt: identity.session.expiresAt, token: identity.session.token },
  };
}
