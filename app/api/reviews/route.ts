import { createReviewHandlers } from "@/src/server/reviews-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST, DELETE } = createReviewHandlers();
