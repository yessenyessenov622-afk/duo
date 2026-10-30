import "server-only";
import type { PoolClient } from "pg";
import { requireSession, type SessionIdentity } from "@/src/server/auth";
import { withUnlocked } from "@/src/server/pin";
import { getPool } from "@/src/server/db";
import { ApiError } from "@/src/server/http";

type Query = Pick<PoolClient, "query">;
export async function hasOwnerRole(userId: string, db: Query = getPool()): Promise<boolean> {
  try { return (await db.query("SELECT 1 FROM kq_owner_role WHERE singleton = true AND user_id = $1", [userId])).rowCount === 1; }
  catch (error) {
    // A not-yet-migrated installation must not break ordinary account access.
    if (error && typeof error === "object" && "code" in error && error.code === "42P01") return false;
    throw error;
  }
}

type Access = {
  authenticate: (request: Request) => Promise<SessionIdentity>;
  unlocked: <T>(request: Request, identity: SessionIdentity, work: (client: PoolClient) => Promise<T>) => Promise<T>;
  owner: (userId: string, db: Query) => Promise<boolean>;
};
export function createOwnerAccess(access: Access = { authenticate: requireSession, unlocked: withUnlocked, owner: hasOwnerRole }) {
  return async function withOwner<T>(request: Request, work: (client: PoolClient, identity: SessionIdentity) => Promise<T>): Promise<T> {
    const identity = await access.authenticate(request);
    return access.unlocked(request, identity, async client => {
      if (!await access.owner(identity.user.id, client)) throw new ApiError(403, "owner_required", "Эта страница доступна только владельцу.");
      return work(client, identity);
    });
  };
}
export const withOwner = createOwnerAccess();
