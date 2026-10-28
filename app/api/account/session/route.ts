import { isAuthConfigured, requireSession } from "@/src/server/auth";
import { getPinStatus } from "@/src/server/pin";
import { ApiError, PRIVATE_HEADERS, apiError } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthConfigured()) return Response.json({ configured: false, user: null, pin: { enabled: false, locked: false, retryAt: null } }, { headers: PRIVATE_HEADERS });
  try {
    const identity = await requireSession(request);
    const pin = await getPinStatus(request, identity);
    // Never return the opaque session token or any Google tokens to JavaScript.
    return Response.json({ configured: true, user: identity.user, pin }, { headers: PRIVATE_HEADERS });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return Response.json({ configured: true, user: null, pin: { enabled: false, locked: false, retryAt: null } }, { headers: PRIVATE_HEADERS });
    return apiError(e);
  }
}
