"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountRequest, useAccount } from "@/src/components/AccountProvider";

export function ResetPasswordCard() {
  const account = useAccount();
  const [token, setToken] = useState<string | null>(null);
  const [secure, setSecure] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setSecure(window.location.protocol === "https:");
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    // Never persist the reset token or leave it in browser history.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    setToken(value.length <= 512 ? value : "");
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("Пароли не совпадают. Проверь их и попробуй снова."); return; }
    if (!secure || !account.passwordConfigured || !token) { setError("Ссылка недействительна или восстановление недоступно."); return; }
    setBusy(true);
    try {
      await accountRequest("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword: password }) });
      setToken(""); setPassword(""); setConfirmation(""); setDone(true);
    } catch (err) {
      setPassword(""); setConfirmation("");
      setError(err instanceof Error ? err.message : "Не удалось изменить пароль. Запроси новую ссылку.");
    } finally { setBusy(false); }
  };

  return <div className="hardio-auth-container"><section className="hardio-auth-card">
    <div className="hardio-logo" aria-hidden="true"><span className="hardio-logo-letter">k</span></div>
    <span className="hardio-eyebrow">ТВОЁ ПРОСТРАНСТВО</span>
    <h1 className="hardio-auth-title">Новый пароль</h1>
    {error && <p className="hardio-error" role="alert">{error}</p>}
    {done ? <><p className="account-note" role="status">Пароль изменён. Теперь можно войти.</p><Link className="hardio-button-primary" href="/sign-in">Войти</Link></> : token === null || account.status === "loading" ? <p className="account-note" role="status">Проверяем ссылку…</p> : !secure || !account.passwordConfigured || !token ? <><p className="account-note">Ссылка недействительна или восстановление пока недоступно. Запроси новую ссылку на странице входа.</p><Link className="hardio-switch-link" href="/sign-in">Вернуться ко входу</Link></> : <form className="hardio-form" onSubmit={submit}>
      <div className="hardio-field"><label htmlFor="reset-password" className="hardio-field-label">Новый пароль</label><input id="reset-password" type={visible ? "text" : "password"} className="hardio-input hardio-input-plain" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required /><small className="hardio-password-help">Не менее 12 символов. Используй уникальный пароль.</small><button type="button" className="hardio-password-toggle" aria-controls="reset-password" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Скрыть пароль" : "Показать пароль"}</button></div>
      <div className="hardio-field"><label htmlFor="reset-confirm" className="hardio-field-label">Повтори пароль</label><input id="reset-confirm" type={visible ? "text" : "password"} className="hardio-input hardio-input-plain" autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></div>
      <button className="hardio-button-primary" type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить пароль"}</button>
    </form>}
  </section></div>;
}
