import { createAuthHttpHandlers } from "@/src/server/auth-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const { GET, POST } = createAuthHttpHandlers();