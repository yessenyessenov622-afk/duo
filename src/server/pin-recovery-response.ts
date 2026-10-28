import "server-only";

import { NextResponse } from "next/server";
import { ApiError, PRIVATE_HEADERS, apiError } from "./http";
import { RECOVERY_COOKIE } from "./pin";

/** Preserve every OAuth Set-Cookie header when adding our one-use challenge. */
export function recoveryOAuthResponse(oauth: Response, token: string): Response {
  if (!oauth.ok) return apiError(new ApiError(503, "recovery_unavailable", "Не удалось начать восстановление через Google. Попробуй ещё раз через минуту."));
  const response = new NextResponse(oauth.body, { status: oauth.status, headers: oauth.headers });
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(key, value);
  response.cookies.set(RECOVERY_COOKIE, token, { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}

/** Destination is selected here so a caller cannot introduce an open redirect. */
export function recoveryCompletionResponse(baseURL: string, succeeded: boolean): Response {
  const destination = succeeded ? "/profile?pin=recovered" : "/sign-in?error=recovery_failed";
  const response = NextResponse.redirect(new URL(destination, baseURL), 303);
  for (const [key, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(key, value);
  response.cookies.set(RECOVERY_COOKIE, "", { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
