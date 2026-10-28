import "server-only";

import type { PoolClient } from "pg";
import { requireSession, type SessionIdentity } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { AccountRevisionConflict, importGuestData, readAccountData, updateAccountData } from "@/src/server/account-data";
import { AccountDataValidationError, parseAccountUpdate, parseGuestImport } from "@/src/lib/account-data";
import { ApiError, apiError, assertSameOrigin, PRIVATE_HEADERS, readJson } from "@/src/server/http";

type AccountAccess = {
  authenticate: (request: Request) => Promise<SessionIdentity>;
  unlocked: <T>(request: Request, identity: SessionIdentity, work: (client: PoolClient) => Promise<T>) => Promise<T>;
};

/** The production routes and isolated integration tests execute these same handlers. */
export function createAccountDataHandlers(access: AccountAccess = { authenticate: requireSession, unlocked: withUnlocked }) {
  async function GET(request: Request) {
    try {
      const identity = await access.authenticate(request);
      const data = await access.unlocked(request, identity, (client) => readAccountData(identity.user.id, client));
      return Response.json(data, { headers: PRIVATE_HEADERS });
    } catch (error) { return apiError(error); }
  }

  async function PUT(request: Request) {
    try {
      assertSameOrigin(request);
      const identity = await access.authenticate(request);
      const update = parseAccountUpdate(await readJson(request, 131_072));
      const data = await access.unlocked(request, identity, (client) => updateAccountData(identity.user.id, update, client));
      return Response.json(data, { headers: PRIVATE_HEADERS });
    } catch (error) {
      if (error instanceof AccountRevisionConflict) return Response.json({ error: "REVISION_CONFLICT", message: error.message, data: error.data }, { status: 409, headers: PRIVATE_HEADERS });
      return apiError(error instanceof AccountDataValidationError ? new ApiError(400, "invalid_data", error.message) : error);
    }
  }

  async function IMPORT(request: Request) {
    try {
      assertSameOrigin(request);
      const identity = await access.authenticate(request);
      const guest = parseGuestImport(await readJson(request, 131_072));
      const data = await access.unlocked(request, identity, (client) => importGuestData(identity.user.id, guest, client));
      return Response.json(data, { headers: PRIVATE_HEADERS });
    } catch (error) {
      return apiError(error instanceof AccountDataValidationError ? new ApiError(400, "invalid_data", error.message) : error);
    }
  }
  return { GET, PUT, IMPORT };
}
