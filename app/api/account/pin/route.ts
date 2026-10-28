import { requireSession } from "@/src/server/auth";
import { apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";
import { getPinStatus, performPinAction } from "@/src/server/pin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const identity = await requireSession(request);
    return Response.json(await getPinStatus(request, identity), { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await requireSession(request);
    const body = await readJson(request, 1024);
    return Response.json(await performPinAction(request, identity, body), { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
