/** The public nickname is an alias only; authority always comes from kq_owner_role. */
export const OWNER_USERNAME = "kq_owner";
export function normalizeLogin(value: string): string { return value.normalize("NFKC").trim().toLowerCase(); }
export function isOwnerAlias(value: string): boolean { return normalizeLogin(value) === "админ"; }
export function isReservedUsername(value: string): boolean { return ["админ", "admin", OWNER_USERNAME].includes(normalizeLogin(value)); }
