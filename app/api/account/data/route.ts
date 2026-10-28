import { createAccountDataHandlers } from "@/src/server/account-data-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createAccountDataHandlers();
export const GET = handlers.GET;
export const PUT = handlers.PUT;
