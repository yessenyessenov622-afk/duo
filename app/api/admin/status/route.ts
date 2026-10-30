import { withOwner } from "@/src/server/owner";
import { ApiError, apiError, PRIVATE_HEADERS } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return await withOwner(request, async () => Response.json({ owner: true }, { headers: PRIVATE_HEADERS })); }
  catch (error) {
    if (error instanceof ApiError && [401, 403, 423, 503].includes(error.status)) return Response.json({ owner: false }, { headers: PRIVATE_HEADERS });
    return apiError(error);
  }
}
