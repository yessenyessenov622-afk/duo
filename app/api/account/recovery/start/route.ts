import { getAuth, requireSession } from "@/src/server/auth";
import { apiError, assertSameOrigin } from "@/src/server/http";
import { beginPinRecovery } from "@/src/server/pin";
import { recoveryOAuthResponse } from "@/src/server/pin-recovery-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await requireSession(request);
    const token = await beginPinRecovery(request, identity);
    // The supported library produces and validates OAuth state/PKCE. Preserve
    // its Set-Cookie headers, including the OAuth state cookie, in the response.
    const oauth = await getAuth().api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/api/account/recovery/complete",
        errorCallbackURL: "/sign-in?error=recovery_cancelled",
        disableRedirect: true,
      },
      headers: request.headers,
      asResponse: true,
    });
    return recoveryOAuthResponse(oauth, token);
  } catch (error) { return apiError(error); }
}
