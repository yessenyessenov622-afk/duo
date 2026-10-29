"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, SETTINGS_KEY, normalizeSettings, readSettings, writeSettings } from "@/src/lib/customization";
import { createInitialLearningProgress, readLearningProgress, writeLearningProgress } from "@/src/lib/learning-progress";
import { loadWallpaper } from "@/src/lib/wallpaper-storage";
import type { CustomizationSettings } from "@/src/types/customization";
import type { LearningProgress } from "@/src/types/learning";
import type { AccountData, AccountPreferences, GuestDataImport } from "@/src/types/account";
import { defaultAccountPreferences } from "@/src/lib/account-data";
import { guestAlreadyImported, guestImportId, markGuestImported } from "@/src/lib/guest-import";

type User = { id: string; name: string; email: string; image?: string | null; emailVerified?: boolean };
export type PinStatus = { enabled: boolean; locked: boolean; retryAt: number | null; unlockExpiresAt?: number | null; deviceChanged?: boolean };
type Status = "loading" | "guest" | "ready" | "locked" | "error";
type SyncStatus = "idle" | "pending" | "saved" | "error";
type Guest = { progress: LearningProgress; settings: CustomizationSettings; importId: string; preferences: AccountPreferences };
type Patch = { progress?: LearningProgress; settings?: CustomizationSettings; preferences?: AccountData["preferences"]; resetProgress?: boolean };
type AccountContextValue = {
  status: Status; configured: boolean; googleConfigured: boolean; passwordConfigured: boolean; user: User | null; pin: PinStatus;
  data: AccountData; error: string; syncStatus: SyncStatus; guest: Guest | null;
  ready: boolean; update: (patch: Patch) => boolean; refresh: () => Promise<void>;
  retrySync: () => void; signOut: (discardUnsaved?: boolean) => Promise<void>; importGuest: (useGuestSettings: boolean, source?: GuestDataImport) => Promise<void>;
  dismissGuest: () => void; pinAction: (action: string, fields?: Record<string, string>) => Promise<void>;
};
const AccountContext = createContext<AccountContextValue | null>(null);
const PREFERENCES_KEY = "kiraquest.guest-preferences.v1";
const emptyPin: PinStatus = { enabled: false, locked: false, retryAt: null };
const emptyData = (): AccountData => ({ progress: createInitialLearningProgress(), settings: normalizeSettings(DEFAULT_SETTINGS), revision: 0, preferences: defaultAccountPreferences() });

class RequestError extends Error {
  constructor(public status: number, message: string, public payload: Record<string, unknown> = {}) { super(message); }
}

export async function accountRequest<T>(url: string, init: RequestInit = {}, expectedAccount?: string): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...(expectedAccount ? { "X-Kiraquest-Account": expectedAccount } : {}), ...init.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(response.status, payload.message ?? "Не удалось выполнить действие. Повтори попытку.", payload);
  return payload as T;
}

function guestData(): { data: AccountData; warning: string } {
  const progress = readLearningProgress();
  const settings = readSettings();
  const data = { ...emptyData(), progress: progress.progress, settings: settings.settings };
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "null");
    if (prefs && typeof prefs === "object") data.preferences = {
      favoriteLooks: Array.isArray(prefs.favoriteLooks) ? prefs.favoriteLooks.slice(0, 5).filter((x: { name?: unknown }) => x && typeof x.name === "string").map((x: { name: string; settings: unknown }) => ({ name: x.name.slice(0, 80), settings: normalizeSettings(x.settings) })) : [],
      mapFilter: typeof prefs.mapFilter === "string" ? prefs.mapFilter.slice(0, 80) : "all",
      distractionFree: prefs.distractionFree === true,
    };
    else {
      const favorites = JSON.parse(localStorage.getItem("kiraquest.appearance-favorites.v1") ?? "[]");
      if (Array.isArray(favorites)) data.preferences.favoriteLooks = favorites.filter((x) => x && typeof x.name === "string" && x.settings).slice(0, 5).map((x) => ({ name: x.name.slice(0, 80), settings: normalizeSettings(x.settings) }));
      const mapFilter = localStorage.getItem("kiraquest.map.course-filter.v1");
      if (mapFilter) data.preferences.mapFilter = mapFilter;
      const focus = JSON.parse(localStorage.getItem("kiraquest.focus-interval.v1") ?? "null");
      data.preferences.distractionFree = focus?.distractionFree === true;
    }
  } catch { /* Invalid auxiliary guest preferences do not erase progress. */ }
  return { data, warning: [progress.warning, settings.warning].filter(Boolean).join(" ") };
}

function findGuest(userId: string): Guest | null {
  const { data } = guestData();
  try {
    if (!data.progress.completedLessons.length && !data.progress.startedCourses.length && !localStorage.getItem(SETTINGS_KEY)) return null;
    if (guestAlreadyImported(localStorage, userId, data)) return null;
    const importId = guestImportId(localStorage, data, () => crypto.randomUUID());
    return { progress: data.progress, settings: data.settings, preferences: data.preferences, importId };
  } catch { return null; }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [configured, setConfigured] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pin, setPin] = useState<PinStatus>(emptyPin);
  const [data, setData] = useState<AccountData>(emptyData);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [guest, setGuest] = useState<Guest | null>(null);
  const state = useRef({ status, user, data });
  state.current = { status, user, data };
  const pending = useRef<Patch>({});
  const busy = useRef(false);
  const importing = useRef(false);
  const resetting = useRef(false);
  const transitioning = useRef(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sync = useRef<() => Promise<void>>(async () => {});
  const channel = useRef<BroadcastChannel | null>(null);
  const checkedAt = useRef(0);
  const refreshSequence = useRef(0);
  const guestDismissed = useRef(false);
  const editSequence = useRef(0);

  const clearPrivate = useCallback(() => {
    generation.current++;
    editSequence.current++;
    busy.current = false;
    importing.current = false;
    resetting.current = false;
    pending.current = {};
    if (timer.current) clearTimeout(timer.current);
    const clean = emptyData();
    state.current = { ...state.current, data: clean };
    setData(clean);
    setGuest(null);
    setSyncStatus("idle");
  }, []);

  const refresh = useCallback(async () => {
    if (transitioning.current) return;
    const requestId = ++refreshSequence.current;
    try {
      const session = await accountRequest<{ configured: boolean; googleConfigured?: boolean; passwordConfigured?: boolean; user: User | null; pin: PinStatus }>("/api/account/session");
      if (requestId !== refreshSequence.current) return;
      checkedAt.current = Date.now();
      setConfigured(session.configured);
      setGoogleConfigured(session.googleConfigured === true);
      setPasswordConfigured(session.passwordConfigured === true);
      const oldUser = state.current.user;
      if (oldUser?.id !== session.user?.id) {
        clearPrivate(); guestDismissed.current = false;
        setStatus("loading"); state.current.status = "loading";
      }
      setUser(session.user);
      state.current.user = session.user;
      setPin(session.pin ?? emptyPin);
      if (!session.user) {
        const stored = guestData();
        setData(stored.data); state.current.data = stored.data;
        setError(oldUser ? "Сессия закончилась. Войди снова." : stored.warning);
        setStatus("guest"); state.current.status = "guest";
        return;
      }
      if (session.pin.locked) {
        clearPrivate(); setStatus("locked"); state.current.status = "locked";
        setError(""); return;
      }
      // Revalidation must not overwrite changes still being sent by this tab.
      if (!busy.current && !Object.keys(pending.current).length) {
        const editsBeforeRead = editSequence.current;
        const loaded = await accountRequest<AccountData>("/api/account/data", {}, session.user.id);
        if (requestId !== refreshSequence.current || state.current.user?.id !== session.user.id) return;
        if (editsBeforeRead === editSequence.current && !busy.current && !Object.keys(pending.current).length) { setData(loaded); state.current.data = loaded; }
      }
      setStatus("ready"); state.current.status = "ready";
      setError("");
      if (!guestDismissed.current) setGuest((current) => current ?? findGuest(session.user!.id));
    } catch (e) {
      if (requestId !== refreshSequence.current) return;
      if (e instanceof RequestError && e.status === 423) {
        clearPrivate(); setPin((p) => ({ ...p, locked: true }));
        setStatus("locked"); state.current.status = "locked";
        setError(e.message); return;
      }
      if (e instanceof RequestError && e.status === 401) {
        clearPrivate(); setUser(null); state.current.user = null;
        setStatus("guest"); state.current.status = "guest";
        const stored = guestData(); setData(stored.data); state.current.data = stored.data;
        setError(e.message); return;
      }
      // A temporary network error pauses access and saving. Keep unsent changes
      // in memory until the same server identity has been confirmed again.
      setStatus("error"); state.current.status = "error";
      setError(e instanceof Error ? e.message : "Не удалось проверить сессию.");
    }
  }, [clearPrivate]);

  const handleDenied = useCallback((e: unknown) => {
    if (e instanceof RequestError && (e.status === 401 || e.status === 423 || e.payload.error === "account_changed")) {
      clearPrivate();
      if (e.status === 423) { setStatus("locked"); state.current.status = "locked"; setPin((p) => ({ ...p, enabled: true, locked: true })); }
      else { setUser(null); state.current.user = null; setStatus("loading"); state.current.status = "loading"; void refresh(); }
    }
    setError(e instanceof Error ? e.message : "Не удалось сохранить изменения.");
  }, [clearPrivate, refresh]);

  sync.current = async () => {
    if (busy.current || state.current.status !== "ready" || !Object.keys(pending.current).length) return;
    busy.current = true;
    const stamp = generation.current;
    const owner = state.current.user?.id;
    const patch = pending.current;
    resetting.current = patch.resetProgress === true;
    let succeeded = false;
    pending.current = {};
    try {
      if (patch.settings?.background === "image") {
        const blob = await loadWallpaper(patch.settings.customWallpaperId);
        if (stamp !== generation.current) return;
        if (blob) await accountRequest("/api/account/wallpaper", { method: "PUT", body: blob, headers: { "Content-Type": blob.type } }, owner);
      }
      let revision = state.current.data.revision;
      let saved: AccountData | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
          if (stamp !== generation.current) return;
          try { saved = await accountRequest<AccountData>("/api/account/data", { method: "PUT", body: JSON.stringify({ ...patch, ...(patch.resetProgress ? { progress: undefined } : {}), revision }) }, owner); break; }
        catch (e) {
          if (!(e instanceof RequestError) || e.status !== 409 || e.payload.error !== "REVISION_CONFLICT" || attempt === 2) throw e;
          const current = e.payload.data as AccountData | undefined;
          revision = current ? current.revision : (await accountRequest<AccountData>("/api/account/data", {}, owner)).revision;
        }
      }
      if (stamp !== generation.current || !saved) return;
      const next = { ...saved, ...pending.current };
      setData(next); state.current.data = next;
      succeeded = true;
      setSyncStatus(Object.keys(pending.current).length ? "pending" : "saved"); setError("");
    } catch (e) {
      if (stamp !== generation.current) return;
      pending.current = { ...patch, ...pending.current };
      setSyncStatus("error"); handleDenied(e);
    } finally {
      if (stamp === generation.current) { busy.current = false; resetting.current = false; }
      if (succeeded && stamp === generation.current && state.current.status === "ready" && Object.keys(pending.current).length) {
        timer.current = setTimeout(() => void sync.current(), 0);
      }
    }
  };

  // Schedule the next batch only after a successful save; errors remain visible.
  useEffect(() => {
    if (syncStatus === "pending" && status === "ready") {
      timer.current = setTimeout(() => void sync.current(), 250);
      return () => { if (timer.current) clearTimeout(timer.current); };
    }
  }, [data, status, syncStatus]);

  const update = useCallback((patch: Patch) => {
    if (state.current.status !== "ready" && state.current.status !== "guest") return false;
    if (transitioning.current) return false;
    if (pending.current.resetProgress || resetting.current || importing.current) { setError("Дождись завершения переноса или сброса перед новыми изменениями."); return false; }
    if (patch.resetProgress && (busy.current || Object.keys(pending.current).length)) { setError("Дождись сохранения текущих изменений перед сбросом."); return false; }
    const next = { ...state.current.data, ...patch };
    if (patch.resetProgress) next.progress = createInitialLearningProgress();
    if (patch.settings) next.settings = normalizeSettings(patch.settings);
    if (state.current.status === "guest") {
      if ((patch.progress && !writeLearningProgress(patch.progress)) || (patch.settings && !writeSettings(next.settings))) {
        setError("Браузер не разрешил сохранить гостевые данные."); return false;
      }
      if (patch.preferences) { try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(patch.preferences)); } catch { setError("Не удалось сохранить настройки в браузере."); return false; } }
    } else {
      pending.current = { ...pending.current, ...patch, ...(patch.settings ? { settings: next.settings } : {}) };
      setSyncStatus("pending");
    }
    editSequence.current++;
    setData(next); state.current.data = next; setError(""); return true;
  }, []);

  const pinAction = useCallback(async (action: string, fields: Record<string, string> = {}) => {
    if (transitioning.current) throw new Error("Дождись завершения предыдущего действия.");
    if (action === "lock" && (busy.current || Object.keys(pending.current).length)) throw new Error("Дождись сохранения изменений перед блокировкой.");
    const priorStatus = state.current.status;
    if (action === "lock") { transitioning.current = true; refreshSequence.current++; setStatus("loading"); state.current.status = "loading"; }
    try {
      const stamp = generation.current;
      const next = await accountRequest<PinStatus>("/api/account/pin", { method: "POST", body: JSON.stringify({ action, ...fields }) }, state.current.user?.id);
      if (stamp !== generation.current) return;
      setPin(next);
      if (action === "lock") { clearPrivate(); setStatus("locked"); state.current.status = "locked"; channel.current?.postMessage("lock"); }
      else await refresh();
    } catch (e) {
      if (action === "lock") { setStatus(priorStatus); state.current.status = priorStatus; setError(e instanceof Error ? e.message : "Не удалось заблокировать приложение."); }
      if (e instanceof RequestError && e.payload.retryAfter) setPin((p) => ({ ...p, retryAt: Date.now() + Number(e.payload.retryAfter) * 1000 }));
      if (e instanceof RequestError && e.payload.error === "pin_rate_limited") {
        clearPrivate(); setStatus("locked"); state.current.status = "locked";
        setPin((p) => ({ ...p, locked: true })); channel.current?.postMessage("lock");
      } else if (e instanceof RequestError && [401, 423].includes(e.status)) handleDenied(e);
      throw e;
    } finally { if (action === "lock") transitioning.current = false; }
  }, [clearPrivate, refresh, handleDenied]);

  const signOut = useCallback(async (discardUnsaved = false) => {
    if (transitioning.current) throw new Error("Дождись завершения предыдущего действия.");
    if (!discardUnsaved && (busy.current || Object.keys(pending.current).length)) throw new Error("Изменения ещё не сохранены. Повтори сохранение или выбери выход без несохранённых изменений.");
    const priorStatus = state.current.status;
    transitioning.current = true; refreshSequence.current++;
    setStatus("loading"); state.current.status = "loading";
    try {
      await accountRequest("/api/auth/sign-out", { method: "POST", body: "{}" }, state.current.user?.id);
    } catch (e) {
      transitioning.current = false;
      setStatus(priorStatus); state.current.status = priorStatus;
      setError(e instanceof Error ? e.message : "Не удалось завершить сессию.");
      handleDenied(e); throw e;
    }
    transitioning.current = false;
    clearPrivate(); setUser(null); state.current.user = null;
    setPin(emptyPin); setStatus("loading"); state.current.status = "loading";
    channel.current?.postMessage("sign-out");
    await refresh();
  }, [clearPrivate, refresh, handleDenied]);

  const importGuest = useCallback(async (useGuestSettings: boolean, source?: GuestDataImport) => {
    const sourceGuest = source ?? guest;
    if (!sourceGuest || state.current.status !== "ready") throw new Error("Войди в аккаунт, чтобы перенести гостевой прогресс.");
    if (busy.current || Object.keys(pending.current).length) throw new Error("Дождись сохранения текущих изменений и повтори перенос.");
    const stamp = generation.current;
    const owner = state.current.user?.id;
    busy.current = true; importing.current = true;
    try {
    if (useGuestSettings && sourceGuest.settings.background === "image") {
      const blob = await loadWallpaper(sourceGuest.settings.customWallpaperId);
      if (stamp !== generation.current) throw new Error("Аккаунт изменился во время переноса. Исходные данные не удалены.");
      if (blob) await accountRequest("/api/account/wallpaper", { method: "PUT", body: blob, headers: { "Content-Type": blob.type } }, owner);
    }
    if (stamp !== generation.current) throw new Error("Аккаунт изменился во время переноса. Исходные данные не удалены.");
    const imported = await accountRequest<AccountData>("/api/account/import", { method: "POST", body: JSON.stringify({ ...sourceGuest, useGuestSettings }) }, owner);
    if (stamp !== generation.current) throw new Error("Аккаунт изменился во время переноса. Исходные данные не удалены.");
    setData(imported); state.current.data = imported;
    if (!source && guest) {
      // Keep the original guest data: another tab may have changed it while
      // the request was in flight. Suppress the prompt only for the exact
      // snapshot imported by this account; changed data can be imported later.
      try {
        if (owner) markGuestImported(localStorage, owner, guest, guest.importId);
      } catch { /* The server's import ID still makes retries idempotent. */ }
      setGuest(null); guestDismissed.current = true;
    }
    setSyncStatus("saved");
    } finally { if (stamp === generation.current) { busy.current = false; importing.current = false; } }
  }, [guest]);

  useEffect(() => {
    void refresh();
    const revalidate = () => { if (!document.hidden && Date.now() - checkedAt.current > 10_000) void refresh(); };
    window.addEventListener("focus", revalidate); document.addEventListener("visibilitychange", revalidate);
    const interval = setInterval(revalidate, 30_000);
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel("kiraquest-account");
      channel.current.onmessage = () => { clearPrivate(); setStatus("loading"); state.current.status = "loading"; void refresh(); };
    }
    return () => { window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", revalidate); clearInterval(interval); channel.current?.close(); generation.current++; };
  }, [refresh, clearPrivate]);

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => { if (state.current.user && (busy.current || Object.keys(pending.current).length)) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warnUnsaved);
    return () => window.removeEventListener("beforeunload", warnUnsaved);
  }, []);

  useEffect(() => {
    if (status !== "ready" || !pin.enabled || !pin.unlockExpiresAt) return;
    const id = setTimeout(() => { clearPrivate(); setStatus("locked"); state.current.status = "locked"; void refresh(); }, Math.max(0, pin.unlockExpiresAt - Date.now()));
    return () => clearTimeout(id);
  }, [status, pin.enabled, pin.unlockExpiresAt, clearPrivate, refresh]);

  return <AccountContext.Provider value={{ status, configured, googleConfigured, passwordConfigured, user, pin, data, error, syncStatus, guest, ready: status === "ready" || status === "guest", update, refresh, retrySync: () => { setSyncStatus("pending"); void sync.current(); }, signOut, importGuest, dismissGuest: () => { guestDismissed.current = true; setGuest(null); }, pinAction }}>{children}</AccountContext.Provider>;
}

export function useAccount() { const value = useContext(AccountContext); if (!value) throw new Error("useAccount requires AccountProvider"); return value; }
