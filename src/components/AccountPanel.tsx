"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountRequest, useAccount } from "@/src/components/AccountProvider";

export function GoogleSignIn() {
  const { configured } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const start = async () => {
    setLoading(true); setError(""); controller.current = new AbortController();
    try {
      const response = await accountRequest<{ url: string }>("/api/auth/sign-in/social", { method: "POST", body: JSON.stringify({ provider: "google", callbackURL: "/profile", errorCallbackURL: "/sign-in?error=oauth" }), signal: controller.current.signal });
      const target = new URL(response.url);
      if (target.protocol !== "https:" || target.hostname !== "accounts.google.com") throw new Error("Не удалось открыть безопасную страницу входа Google.");
      window.location.assign(target.href);
    } catch (e) { if (!(e instanceof Error && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Вход не выполнен. Попробуй снова."); setLoading(false); }
  };
  return <div className="google-sign-in">
    <button className="button button-primary google-button" type="button" disabled={loading || !configured} onClick={() => void start()}><span className="google-mark" aria-hidden="true">G</span>{loading ? "Открываем Google…" : "Продолжить с Google"}</button>
    {loading && <button className="text-button" type="button" onClick={() => { controller.current?.abort(); setLoading(false); }}>Отменить вход</button>}
    {!configured && <p className="account-note">Владелец ещё не подключил Google-вход. Гостевое обучение доступно.</p>}
    {error && <p className="account-error" role="alert">{error} Нажми «Продолжить с Google», чтобы повторить.</p>}
  </div>;
}

type PinMode = "setup" | "unlock" | "change" | "disable";
export function PinForm({ mode, onDone }: { mode: PinMode; onDone?: () => void }) {
  const { pinAction, recoverPin, pin } = useAccount();
  const [pinValue, setPinValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const label = mode === "setup" ? "Создать PIN" : mode === "unlock" ? "Разблокировать" : mode === "change" ? "Изменить PIN" : "Отключить PIN";
  const wait = Math.max(0, Math.ceil(((pin.retryAt ?? 0) - now) / 1000));
  useEffect(() => { if (!pin.retryAt) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [pin.retryAt]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await pinAction(mode, { pin: pinValue, confirmation, currentPin }); onDone?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось проверить PIN. Повтори попытку."); }
    finally { setBusy(false); setPinValue(""); setConfirmation(""); setCurrentPin(""); }
  };
  const recover = async () => {
    setBusy(true); setError("");
    try { await recoverPin(); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось открыть Google."); setBusy(false); }
  };
  return <form className="pin-form" onSubmit={(event) => void submit(event)} aria-label={label}>
    <p id={`pin-explanation-${mode}`}>Этот PIN используется для разблокировки KiraQuest на этом устройстве.</p>
    {mode !== "unlock" && <p className="account-note">PIN KiraQuest состоит из 6 цифр. Пароль и коды подтверждения Google вводятся только на странице Google.</p>}
    {(mode === "change" || mode === "disable") && <label>Текущий PIN KiraQuest<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby={`pin-explanation-${mode}`} /></label>}
    {pin.deviceChanged && mode === "unlock" && <p className="account-error" role="alert">Данные устройства изменились. Подтверди доступ повторным входом через Google.</p>}
    {mode !== "disable" && !pin.deviceChanged && <label>{mode === "change" ? "Новый PIN KiraQuest" : "PIN KiraQuest"}<input autoFocus={mode === "unlock"} type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby={`pin-explanation-${mode}`} /></label>}
    {(mode === "setup" || mode === "change") && <label>Повтори новый PIN<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={confirmation} onChange={(e) => setConfirmation(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>}
    {wait > 0 && <p role="status">Слишком много попыток. Повтори через {Math.ceil(wait / 60)} мин.</p>}
    {error && <p className="account-error" role="alert">{error}</p>}
    <div className="account-actions">{!pin.deviceChanged && <button className="button button-primary" disabled={busy || wait > 0} type="submit">{busy ? "Проверяем…" : label}</button>}{onDone && <button className="button button-outline" type="button" disabled={busy} onClick={onDone}>Отмена</button>}</div>
    {mode === "unlock" && <button className="text-button" type="button" disabled={busy} onClick={() => void recover()}>Забыл PIN — войти снова через Google</button>}
  </form>;
}

export function AccountPanel() {
  const account = useAccount();
  const [pinMode, setPinMode] = useState<PinMode | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestSettings, setGuestSettings] = useState(false);
  const [skipPin, setSkipPin] = useState(false);
  const execute = async (fn: () => Promise<void>, message = "") => {
    setBusy(true); setNotice("");
    try { await fn(); setNotice(message); } catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось выполнить действие."); }
    finally { setBusy(false); }
  };
  if (!account.user) return <section className="account-card"><span className="eyebrow">АККАУНТ KIRAQUEST</span><h2>Сохрани свой учебный путь</h2><p>Войди через Google, чтобы продолжать обучение на других устройствах. Гостевой прогресс можно будет перенести.</p><GoogleSignIn /><p className="account-note">Google передаст только идентификатор, имя, email и аватар.</p></section>;
  return <div className="account-sections">
    {account.syncStatus === "error" && <div className="account-feedback"><p>Часть изменений ещё не сохранена. На общем устройстве можно выйти, отказавшись от этих изменений.</p><button className="button button-outline" disabled={busy} onClick={() => { if (window.confirm("Выйти и удалить из памяти несохранённые изменения? Уже сохранённый прогресс останется на сервере.")) void execute(async () => { await account.signOut(true); window.location.replace("/sign-in?logged_out=1"); }); }}>Выйти без несохранённых изменений</button></div>}
    <section className="account-card"><div className="account-identity">{account.user.image ? <img src={account.user.image} referrerPolicy="no-referrer" alt="" width={64} height={64} /> : <span className="account-avatar" aria-hidden="true">{account.user.name.slice(0, 1)}</span>}<div><span className="eyebrow">АККАУНТ GOOGLE</span><h2>{account.user.name}</h2><p>{account.user.email}</p></div></div><div className="account-actions">{account.pin.enabled && <button className="button button-outline" type="button" disabled={busy} onClick={() => void execute(() => account.pinAction("lock"))}>Заблокировать</button>}<button className="button button-outline" type="button" disabled={busy} onClick={() => void execute(async () => { await account.signOut(); window.location.replace("/sign-in?logged_out=1"); })}>Выйти из аккаунта</button></div><p className="account-note">На общем устройстве выходи из аккаунта после занятия. PIN не заменяет вход через Google на новом устройстве.</p></section>
    {account.guest && <section className="account-card"><h2>Найден гостевой прогресс</h2><p>{account.guest.progress.completedLessons.length} завершённых уроков, {account.guest.progress.xp} XP в этом браузере. Перенос объединит завершённые уроки и сохранит награды без повторного начисления.</p><label className="account-checkbox"><input type="checkbox" checked={guestSettings} onChange={(e) => setGuestSettings(e.target.checked)} />Использовать гостевое оформление и маскота</label><div className="account-actions"><button className="button button-primary" disabled={busy} onClick={() => void execute(() => account.importGuest(guestSettings), "Гостевой прогресс перенесён в аккаунт.")}>Перенести в аккаунт</button><button className="text-button" disabled={busy} onClick={account.dismissGuest}>Пока оставить в браузере</button></div></section>}
    <section className="account-card"><h2>Быстрая разблокировка</h2>{account.pin.enabled ? <><p>PIN KiraQuest включён на этом устройстве. Разблокировка действует до 15 минут; затем потребуется PIN снова.</p>{!pinMode && <div className="account-actions"><button className="button button-outline" onClick={() => setPinMode("change")}>Изменить PIN</button><button className="text-button" onClick={() => setPinMode("disable")}>Отключить PIN</button></div>}</> : <><p>Можно защитить KiraQuest на этом устройстве необязательным PIN из 6 цифр.</p>{!pinMode && !skipPin && <div className="account-actions"><button className="button button-primary" onClick={() => setPinMode("setup")}>Создать PIN</button><button className="text-button" onClick={() => setSkipPin(true)}>Сейчас без PIN</button></div>}{skipPin && !pinMode && <button className="text-button" onClick={() => setPinMode("setup")}>Настроить PIN позже</button>}</>}{pinMode && <PinForm mode={pinMode} onDone={() => setPinMode(null)} />}</section>
    {notice && <p className="account-feedback" role="status">{notice}</p>}
  </div>;
}

export function SignInScreen() {
  const account = useAccount();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errors = params.getAll("error");
    setNotice(errors.some((e) => ["access_denied", "recovery_cancelled"].includes(e)) ? "Вход отменён. Ты можешь попробовать ещё раз." : errors.length ? "Вход не завершён. Попробуй снова через Google. При восстановлении выбери тот же аккаунт." : params.has("logged_out") ? "Ты вышел из аккаунта. Его данные удалены из состояния приложения." : "");
  }, []);
  return <section className="account-card sign-in-card"><span className="eyebrow">ТВОЙ АККАУНТ</span><h1>Добро пожаловать в KiraQuest</h1><p>Учебный прогресс, маскот и оформление будут доступны на твоих устройствах.</p>{notice && <p className="account-feedback" role="status">{notice}</p>}{account.user ? <Link className="button button-primary" href="/profile">Открыть профиль</Link> : <GoogleSignIn />}<p className="account-note">Регистрация произойдёт автоматически после успешного входа. Пароль и коды Google вводи только на стороне Google.</p><Link href="/" className="text-button">Продолжить как гость</Link></section>;
}
