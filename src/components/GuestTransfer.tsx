"use client";

import { useState, type ChangeEvent } from "react";
import { useAccount } from "@/src/components/AccountProvider";
import { mergeAccountProgress, normalizeAccountPreferences, normalizeAccountProgress, normalizeAccountSettings } from "@/src/lib/account-data";
import type { AccountPreferences, GuestDataImport } from "@/src/types/account";
import type { CustomizationSettings } from "@/src/types/customization";
import type { LearningProgress } from "@/src/types/learning";

type Transfer = GuestDataImport;
const MAX_FILE_BYTES = 512 * 1024;

export function GuestTransfer() {
  const account = useAccount();
  const [candidate, setCandidate] = useState<Transfer | null>(null);
  const [useAppearance, setUseAppearance] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const signedIn = account.status === "ready";
  if (!signedIn && account.status !== "guest") return null;

  const download = () => {
    try {
      const payload = { format: "kiraquest-guest", version: 1, progress: normalizeAccountProgress(account.data.progress), settings: normalizeAccountSettings(account.data.settings), preferences: normalizeAccountPreferences(account.data.preferences) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "kiraquest-guest-backup.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Файл создан. Данные на старом адресе сохранены; не удаляй их, пока не проверишь перенос.");
    } catch { setMessage("Не удалось создать файл. Исходные данные не изменены."); }
  };
  const select = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    setCandidate(null); setMessage(""); setUseAppearance(false);
    if (!file) return;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error();
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      const item = value as Record<string, unknown>;
      if (item.format !== "kiraquest-guest" || item.version !== 1) throw new Error();
      setCandidate({ importId: crypto.randomUUID(), progress: normalizeAccountProgress(item.progress), settings: normalizeAccountSettings(item.settings), preferences: normalizeAccountPreferences(item.preferences), useGuestSettings: false });
    } catch { setMessage("Файл не распознан или повреждён. Текущий прогресс не изменён."); }
  };
  const restore = async () => {
    if (!candidate || busy) return;
    setBusy(true);
    try {
      if (signedIn) {
        const settings = candidate.settings.background === "image" ? { ...candidate.settings, background: account.data.settings.background, customWallpaperId: account.data.settings.customWallpaperId } : candidate.settings;
        await account.importGuest(useAppearance, { ...candidate, settings });
        setCandidate(null); setMessage("Прогресс объединён с аккаунтом. Резервный файл и исходные данные не изменены.");
      } else {
        const progress = mergeAccountProgress(account.data.progress, candidate.progress);
        // User-uploaded images live in IndexedDB and are deliberately not in the backup.
        const settings = candidate.settings.background === "image" ? { ...candidate.settings, background: account.data.settings.background, customWallpaperId: account.data.settings.customWallpaperId } : candidate.settings;
        if (!account.update({ progress, ...(useAppearance ? { settings, preferences: candidate.preferences } : {}) })) throw new Error();
        setCandidate(null); setMessage("Прогресс объединён. Исходные данные не удалены.");
      }
    } catch (error) { setMessage(error instanceof Error ? `Не удалось завершить перенос: ${error.message}` : "Не удалось завершить перенос. Повтори попытку; исходный файл не изменён."); }
    finally { setBusy(false); }
  };
  return <section className="account-card" aria-labelledby="guest-transfer-title">
    <h2 id="guest-transfer-title">Перенос гостевого прогресса</h2>
    <p>{signedIn ? "Выбери резервный файл со старого адреса. Данные объединятся с текущим аккаунтом без повторной награды за те же уроки." : "Скачай файл на старом адресе, затем открой новый адрес и выбери его здесь. После входа предложим сохранить данные в аккаунте."}</p>
    <p className="account-note">Файл содержит учебный прогресс и оформление. Не отправляй его посторонним. Загруженные пользователем изображения фона в файл не входят — их нужно выбрать заново.</p>
    <div className="account-actions">{!signedIn && <button type="button" className="button button-outline" disabled={busy} onClick={download}>Скачать гостевой прогресс</button>}<label>Выбрать файл прогресса<input type="file" accept=".json,application/json" disabled={busy} onChange={(event) => void select(event)} /></label></div>
    {candidate && <div><p>В файле: {candidate.progress.completedLessons.length} уроков, {candidate.progress.xp} XP. Здесь сейчас: {account.data.progress.completedLessons.length} уроков, {account.data.progress.xp} XP.</p><label className="account-checkbox"><input type="checkbox" disabled={busy} checked={useAppearance} onChange={(event) => setUseAppearance(event.target.checked)} />Применить оформление и маскота из файла</label><div className="account-actions"><button type="button" className="button button-primary" disabled={busy} onClick={() => void restore()}>{busy ? "Переносим…" : "Объединить прогресс"}</button><button type="button" className="text-button" disabled={busy} onClick={() => setCandidate(null)}>Отмена</button></div></div>}
    {message && <p className="account-feedback" role="status">{message}</p>}
  </section>;
}
