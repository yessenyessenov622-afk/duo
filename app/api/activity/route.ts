import { createHash, randomBytes } from "node:crypto";
import { requireSession } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { withTransaction } from "@/src/server/db";
import { recordGuestActivity, recordUserActivity } from "@/src/server/activity";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "__Host-kq-visit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request, 256);
    if (typeof body.studying !== "boolean") throw new ApiError(400, "invalid_activity", "Не удалось учесть активность.");
    let identity;
    try { identity = await requireSession(request); }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
    if (identity) {
      await withUnlocked(request, identity, client => recordUserActivity(client, identity.user.id, body.studying as boolean));
      return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
    }
    // Do not issue a tracking cookie on insecure origins.
    if (new URL(request.url).protocol !== "https:" && !process.env.BETTER_AUTH_URL?.startsWith("https://")) return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
    const current = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const token = current && /^[a-f0-9]{64}$/.test(current) ? current : randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    await withTransaction(client => recordGuestActivity(client, hash));
    const headers = new Headers(PRIVATE_HEADERS);
    headers.append("Set-Cookie", `${COOKIE}=${token}; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax`);
    return Response.json({ ok: true }, { headers });
  } catch (error) { return apiError(error); }
}
