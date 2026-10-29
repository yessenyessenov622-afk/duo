"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountRequest, useAccount } from "@/src/components/AccountProvider";
import { mascotPreviews } from "@/src/data/mascots";

export function GoogleSignIn() {
  const { googleConfigured: configured } = useAccount();
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

export function PasswordSignIn({ mode = "sign-in" }: { mode?: "sign-in" | "sign-up" }) {
  const { passwordConfigured, refresh } = useAccount();
  const [secure, setSecure] = useState(false);
  const signup = mode === "sign-up";
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setSecure(window.location.protocol === "https:"); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const byUsername = !signup && !email.includes("@");
      await accountRequest(signup ? "/api/auth/sign-up/email" : byUsername ? "/api/auth/sign-in/username" : "/api/auth/sign-in/email", { method: "POST", body: JSON.stringify(byUsername ? { username: email, password } : { email, password, ...(signup ? { username: nickname } : {}) }) });
      setPassword(""); await refresh(); window.location.assign("/profile");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось выполнить действие."); setPassword(""); }
    finally { setBusy(false); }
  };
  if (!secure) return <div><p className="account-note">Форма пароля доступна только по HTTPS. На этом HTTP-адресе пароль не запрашивается. Гостевое обучение доступно.</p><p className="account-note">{signup ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"} <Link href={signup ? "/sign-in" : "/register"}>{signup ? "Войти" : "Зарегистрироваться"}</Link></p></div>;
  if (!passwordConfigured) return <div><p className="account-note">Вход и регистрация по паролю пока не включены владельцем сайта. Гостевое обучение доступно.</p><p className="account-note">{signup ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"} <Link href={signup ? "/sign-in" : "/register"}>{signup ? "Войти" : "Зарегистрироваться"}</Link></p></div>;
  return <form className="pin-form" onSubmit={(event) => void submit(event)}>
    {signup && <label>Ник пользователя<input type="text" autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]{3,30}" required value={nickname} onChange={(event) => setNickname(event.target.value)} /><small>От 3 до 30 латинских букв, цифр или знак подчёркивания.</small></label>}
    <label>{signup ? "Электронная почта" : "Электронная почта или ник"}<input type={signup ? "email" : "text"} autoComplete={signup ? "email" : "username"} maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Пароль KiraQuest<input type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    <p className="account-note">Используй отдельный пароль KiraQuest длиной от 12 символов. Пароль от почтового ящика вводить не нужно.</p>
    {error && <p className="account-error" role="alert">{error}</p>}
    <div className="account-actions"><button className="button button-primary" disabled={busy} type="submit">{busy ? "Подожди…" : signup ? "Зарегистрироваться" : "Войти"}</button><Link className="text-button" href={signup ? "/sign-in" : "/register"}>{signup ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}</Link>{!signup && <button type="button" className="text-button" onClick={() => setShowRecovery(!showRecovery)} aria-expanded={showRecovery}>Забыли пароль?</button>}</div>
    {showRecovery && <p className="account-note" role="status">Восстановить пароль можно на <Link href="/sign-in">странице входа</Link> через код, отправленный на почту.</p>}
  </form>;
}

export function EmailSignIn({ recoveryEmail }: { recoveryEmail?: string }) {
  const { configured, refresh } = useAccount();
  const [email, setEmail] = useState(recoveryEmail ?? "");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => { if (!retryAt) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [retryAt]);
  const sendCode = async () => {
    setBusy(true); setError("");
    try { await accountRequest("/api/auth/email-otp/send-verification-otp", { method: "POST", body: JSON.stringify({ email }) }); setSent(true); const time = Date.now(); setNow(time); setRetryAt(time + 60_000); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось отправить код."); }
    finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sent) { await sendCode(); return; }
    setBusy(true); setError("");
    try {
      await accountRequest("/api/auth/sign-in/email-otp", { method: "POST", body: JSON.stringify({ email, otp: code }) });
      if (recoveryEmail) { window.location.assign("/api/account/recovery/complete"); return; }
      await refresh(); window.location.assign("/profile");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось подтвердить код."); setCode(""); }
    finally { setBusy(false); }
  };
  const wait = Math.max(0, Math.ceil((retryAt - now) / 1000));
  return <form className="pin-form" onSubmit={(event) => void submit(event)}>
    <label>Электронная почта<input type="email" autoComplete="email" required maxLength={254} value={email} readOnly={sent || !!recoveryEmail} onChange={(event) => setEmail(event.target.value)} /></label>
    {sent && <><p>Код действует 5 минут. Проверь входящие письма и папку «Спам».</p><label>Код из письма<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label></>}
    {error && <p className="account-error" role="alert">{error}</p>}
    <div className="account-actions"><button className="button button-primary" type="submit" disabled={busy || !configured}>{busy ? "Подожди…" : sent ? "Подтвердить" : "Получить код"}</button>{sent && <button className="text-button" type="button" disabled={busy || wait > 0} onClick={() => void sendCode()}>{wait ? `Отправить код ещё раз через ${wait} с` : "Отправить код ещё раз"}</button>}{sent && !recoveryEmail && <button className="text-button" type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); setError(""); }}>Изменить почту</button>}</div>
    {!configured && <p className="account-note">Вход по почте пока не настроен. Гостевое обучение доступно.</p>}
    <p className="account-note">Пароль от почтового ящика вводить не нужно.</p>
  </form>;
}

type PinMode = "setup" | "unlock" | "change" | "disable";
export function PinForm({ mode, onDone }: { mode: PinMode; onDone?: () => void }) {
  const { pinAction, pin, googleConfigured } = useAccount();
  const [pinValue, setPinValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [recoveryEmail, setRecoveryEmail] = useState("");
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
    try { const result = await accountRequest<{ email: string }>("/api/account/recovery/start", { method: "POST", body: "{}" }); setRecoveryEmail(result.email); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось начать восстановление."); } finally { setBusy(false); }
  };
  const recoverGoogle = async () => {
    setBusy(true); setError("");
    try {
      const response = await accountRequest<{ url: string }>("/api/account/recovery/start?method=google", { method: "POST", body: "{}" });
      const target = new URL(response.url);
      if (target.protocol !== "https:" || target.hostname !== "accounts.google.com") throw new Error("Не удалось открыть Google.");
      window.location.assign(target.href);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось начать восстановление."); setBusy(false); }
  };
  if (recoveryEmail) return <div><h2>Подтверди почту для восстановления PIN</h2><EmailSignIn recoveryEmail={recoveryEmail} /><button className="text-button" type="button" onClick={() => setRecoveryEmail("")}>Назад к PIN</button></div>;
  return <form className="pin-form" onSubmit={(event) => void submit(event)} aria-label={label}>
    <p id={`pin-explanation-${mode}`}>Этот PIN используется для разблокировки KiraQuest на этом устройстве.</p>
    {mode !== "unlock" && <p className="account-note">PIN KiraQuest состоит из 6 цифр. Не используй пароль от почты в качестве PIN.</p>}
    {(mode === "change" || mode === "disable") && <label>Текущий PIN KiraQuest<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby={`pin-explanation-${mode}`} /></label>}
    {pin.deviceChanged && mode === "unlock" && <p className="account-error" role="alert">Данные устройства изменились. Подтверди доступ повторным входом.</p>}
    {mode !== "disable" && !pin.deviceChanged && <label>{mode === "change" ? "Новый PIN KiraQuest" : "PIN KiraQuest"}<input autoFocus={mode === "unlock"} type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={pinValue} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby={`pin-explanation-${mode}`} /></label>}
    {(mode === "setup" || mode === "change") && <label>Повтори новый PIN<input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={confirmation} onChange={(e) => setConfirmation(e.target.value.replace(/\D/g, "").slice(0, 6))} /></label>}
    {wait > 0 && <p role="status">Слишком много попыток. Повтори через {Math.ceil(wait / 60)} мин.</p>}
    {error && <p className="account-error" role="alert">{error}</p>}
    <div className="account-actions">{!pin.deviceChanged && <button className="button button-primary" disabled={busy || wait > 0} type="submit">{busy ? "Проверяем…" : label}</button>}{onDone && <button className="button button-outline" type="button" disabled={busy} onClick={onDone}>Отмена</button>}</div>
    {mode === "unlock" && <button className="text-button" type="button" disabled={busy} onClick={() => void recover()}>Забыл PIN — подтвердить почту</button>}
    {mode === "unlock" && googleConfigured && <button className="text-button" type="button" disabled={busy} onClick={() => void recoverGoogle()}>Восстановить через Google</button>}
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
  if (!account.user) return <section className="account-card"><span className="eyebrow">АККАУНТ KIRAQUEST</span><h2>Сохрани свой учебный путь</h2><p>Войди по почте, чтобы продолжать обучение на других устройствах. Гостевой прогресс можно будет перенести.</p><PasswordSignIn />{account.googleConfigured && <GoogleSignIn />}</section>;
  return <div className="account-sections">
    {account.syncStatus === "error" && <div className="account-feedback"><p>Часть изменений ещё не сохранена. На общем устройстве можно выйти, отказавшись от этих изменений.</p><button className="button button-outline" disabled={busy} onClick={() => { if (window.confirm("Выйти и удалить из памяти несохранённые изменения? Уже сохранённый прогресс останется на сервере.")) void execute(async () => { await account.signOut(true); window.location.replace("/sign-in?logged_out=1"); }); }}>Выйти без несохранённых изменений</button></div>}
    <section className="account-card"><div className="account-identity">{account.user.image ? <img src={account.user.image} referrerPolicy="no-referrer" alt="" width={64} height={64} /> : <span className="account-avatar" aria-hidden="true">{account.user.name.slice(0, 1)}</span>}<div><span className="eyebrow">АККАУНТ KIRAQUEST</span><h2>{account.user.name}</h2><p>{account.user.email}</p><p>{account.user.emailVerified ? "Почта подтверждена" : "Почта не подтверждена"}</p></div></div><div className="account-actions">{account.pin.enabled && <button className="button button-outline" type="button" disabled={busy} onClick={() => void execute(() => account.pinAction("lock"))}>Заблокировать</button>}<button className="button button-outline" type="button" disabled={busy} onClick={() => void execute(async () => { await account.signOut(); window.location.replace("/sign-in?logged_out=1"); })}>Выйти из аккаунта</button></div><p className="account-note">На общем устройстве выходи из аккаунта после занятия. PIN не заменяет вход на новом устройстве.</p></section>
    {account.guest && <section className="account-card"><h2>Найден гостевой прогресс</h2><p>В этом браузере: {account.guest.progress.completedLessons.length} завершённых уроков, {account.guest.progress.xp} XP; спутник — {mascotPreviews.find((mascot) => mascot.id === account.guest?.settings.mascot.id)?.name ?? "Нэо"}. Гостевые настройки темы, стиля и фона можно перенести вместе со спутником.</p><p>В аккаунте: {account.data.progress.completedLessons.length} завершённых уроков и {account.data.progress.xp} XP. Перенос объединит прогресс без повторного начисления за один урок. Оформление аккаунта останется прежним, если не выбрать гостевое.</p><label className="account-checkbox"><input type="checkbox" checked={guestSettings} onChange={(e) => setGuestSettings(e.target.checked)} />Использовать гостевое оформление и маскота</label><div className="account-actions"><button className="button button-primary" disabled={busy} onClick={() => void execute(() => account.importGuest(guestSettings), "Гостевой прогресс перенесён в аккаунт.")}>Перенести в аккаунт</button><button className="text-button" disabled={busy} onClick={account.dismissGuest}>Пока оставить в браузере</button></div></section>}
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
    setNotice(errors.some((e) => ["access_denied", "recovery_cancelled"].includes(e)) ? "Вход отменён. Ты можешь попробовать ещё раз." : errors.length ? "Вход не завершён. Попробуй снова. При восстановлении используй ту же почту." : params.has("logged_out") ? "Ты вышел из аккаунта. Его данные удалены из состояния приложения." : "");
  }, []);
  return <section className="account-card sign-in-card"><span className="eyebrow">ТВОЙ АККАУНТ</span><h1>Добро пожаловать в KiraQuest</h1><p>Учебный прогресс, маскот и оформление будут доступны на твоих устройствах.</p>{notice && <p className="account-feedback" role="status">{notice}</p>}{account.user ? <Link className="button button-primary" href="/profile">Открыть профиль</Link> : <><PasswordSignIn />{account.googleConfigured && <GoogleSignIn />}</>}<Link href="/" className="text-button">Продолжить как гость</Link></section>;
}

export function RegisterScreen() {
  const account = useAccount();
  if (account.user) return <section className="account-card sign-in-card"><span className="eyebrow">ТВОЙ АККАУНТ</span><h1>Ты уже вошёл в KiraQuest</h1><p>Продолжай обучение или открой сохранённый профиль.</p><Link className="button button-primary" href="/profile">Открыть профиль</Link></section>;
  return <section className="account-card sign-in-card"><span className="eyebrow">СОЗДАТЬ АККАУНТ</span><h1>Начни свой путь в KiraQuest</h1><p>Прогресс, XP, настройки и маскот будут сохраняться в аккаунте и станут доступны после повторного входа.</p><Link href="/register" className="button button-primary">Зарегистрироваться</Link><Link href="/" className="text-button">Продолжить как гость</Link></section>;
}
