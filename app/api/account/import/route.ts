import { createAccountDataHandlers } from "@/src/server/account-data-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createAccountDataHandlers().IMPORT;
