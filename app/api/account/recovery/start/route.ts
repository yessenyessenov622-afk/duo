import { authConfiguration, getAuth, requireSession } from "@/src/server/auth";
import { ApiError, PRIVATE_HEADERS, apiError, assertSameOrigin } from "@/src/server/http";
import { beginPinRecovery, RECOVERY_COOKIE } from "@/src/server/pin";
import { NextResponse } from "next/server";
import { recoveryOAuthResponse } from "@/src/server/pin-recovery-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const config = authConfiguration();
    const google = new URL(request.url).searchParams.get("method") === "google";
    if (google ? !(config?.clientId && config?.clientSecret) : !config?.mail) throw new ApiError(503, "auth_not_configured", "Этот способ восстановления пока не настроен.");
    const identity = await requireSession(request);
    const token = await beginPinRecovery(request, identity);
    if (google) {
      const oauth = await getAuth().api.signInSocial({ body: { provider: "google", callbackURL: "/api/account/recovery/complete", errorCallbackURL: "/sign-in?error=recovery_cancelled", disableRedirect: true }, headers: request.headers, asResponse: true });
      return recoveryOAuthResponse(oauth, token);
    }
    const response = NextResponse.json({ success: true, email: identity.user.email }, { headers: PRIVATE_HEADERS });
    response.cookies.set(RECOVERY_COOKIE, token, { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) { return apiError(error); }
}
