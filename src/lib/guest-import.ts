import type { AccountData } from "@/src/types/account";

type GuestSnapshot = Pick<AccountData, "progress" | "settings" | "preferences">;
type GuestStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const IMPORT_KEY = "kiraquest.guest-import-id.v1";
const IMPORTED_GUEST_KEY = "kiraquest.guest-imported-snapshot.v1";

function snapshot(data: GuestSnapshot): string {
  return JSON.stringify({ progress: data.progress, settings: data.settings, preferences: data.preferences });
}

function readMarker(storage: GuestStorage, key: string): { id?: string; userId?: string; snapshot?: string } | null {
  try { return JSON.parse(storage.getItem(key) ?? "null"); } catch { return null; }
}

export function guestAlreadyImported(storage: GuestStorage, userId: string, data: GuestSnapshot): boolean {
  const imported = readMarker(storage, IMPORTED_GUEST_KEY);
  return imported?.userId === userId && imported.snapshot === snapshot(data);
}

export function guestImportId(storage: GuestStorage, data: GuestSnapshot, newId: () => string): string {
  const current = snapshot(data);
  const previous = readMarker(storage, IMPORT_KEY);
  if (previous?.snapshot === current && typeof previous.id === "string") return previous.id;
  const id = newId();
  storage.setItem(IMPORT_KEY, JSON.stringify({ id, snapshot: current }));
  return id;
}

export function markGuestImported(storage: GuestStorage, userId: string, data: GuestSnapshot, importId: string): void {
  storage.setItem(IMPORTED_GUEST_KEY, JSON.stringify({ userId, snapshot: snapshot(data) }));
  if (readMarker(storage, IMPORT_KEY)?.id === importId) storage.removeItem(IMPORT_KEY);
}
