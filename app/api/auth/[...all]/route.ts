import { getAuth, requireSession } from "@/src/server/auth";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function GET(request: Request) {
  try {
    const path = new URL(request.url).pathname;
    if (path !== "/api/auth/ok" && path !== "/api/auth/callback/google") {
      throw new ApiError(404, "not_found", "Такого действия нет.");
    }
    return privateResponse(await getAuth().handler(request));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const path = new URL(request.url).pathname;
    if (path === "/api/auth/sign-out") {
      await readJson(request.clone(), 1024);
      // A stale tab must not sign out another account that replaced its cookie.
      if (request.headers.has("x-kiraquest-account")) await requireSession(request);
      return privateResponse(await getAuth().handler(request));
    }
    if (path !== "/api/auth/sign-in/social") throw new ApiError(404, "not_found", "Такого действия нет.");
    const input = await readJson(request, 4096);
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
    return privateResponse(await getAuth().handler(normalized));
  } catch (error) { return apiError(error); }
}
