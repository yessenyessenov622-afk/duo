import "server-only";
import type { PoolClient } from "pg";
import { requireSession, type SessionIdentity } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";
import { deleteReview, listReviews, ownReview, saveReview } from "@/src/server/reviews";
import { validateReview } from "@/src/lib/review-validation";

type Access = {
  authenticate: (request: Request) => Promise<SessionIdentity>;
  unlocked: <T>(request: Request, identity: SessionIdentity, work: (client: PoolClient) => Promise<T>) => Promise<T>;
  list: typeof listReviews;
};
export function createReviewHandlers(access: Access = { authenticate: requireSession, unlocked: withUnlocked, list: listReviews }) {

async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawPage = url.searchParams.get("page") ?? "1";
    const rawStars = url.searchParams.get("stars");
    const sort = url.searchParams.get("sort") ?? "newest";
    if (!/^[1-9]\d{0,3}$/.test(rawPage) || (rawStars !== null && !/^[1-5]$/.test(rawStars)) || !["newest", "rating"].includes(sort)) throw new ApiError(400, "invalid_filter", "Проверьте параметры списка отзывов.");
    let user = null;
    let own = null;
    try {
      const identity = await access.authenticate(request);
      own = await access.unlocked(request, identity, (client) => ownReview(client, identity.user.id));
      user = identity.user.id;
    } catch (error) {
      if (!(error instanceof ApiError) || ![401, 423, 503].includes(error.status)) throw error;
    }
    const list = await access.list(Number(rawPage), rawStars ? Number(rawStars) : null, sort as "newest" | "rating", user);
    return Response.json({ ...list, own }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}

async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await access.authenticate(request);
    let review;
    try { review = validateReview(await readJson(request, 16_384)); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(400, "invalid_review", error instanceof Error ? error.message : "Проверьте отзыв."); }
    const own = await access.unlocked(request, identity, (client) => saveReview(client, identity.user.id, review));
    return Response.json({ own }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}

async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const identity = await access.authenticate(request);
    await readJson(request, 1024);
    await access.unlocked(request, identity, (client) => deleteReview(client, identity.user.id));
    return Response.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
return { GET, POST, DELETE };
}
