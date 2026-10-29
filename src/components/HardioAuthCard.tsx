"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAccount, accountRequest } from "@/src/components/AccountProvider";
import { GoogleSignIn } from "@/src/components/AccountPanel";

// SVG Icons matching user screenshots
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"></circle>
      <path d="m21 2-9.6 9.6"></path>
      <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
    </svg>
  );
}

function AddUserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <line x1="19" x2="19" y1="8" y2="14"></line>
      <line x1="22" x2="16" y1="11" y2="11"></line>
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
      <polyline points="10 17 15 12 10 7"></polyline>
      <line x1="15" x2="3" y1="12" y2="12"></line>
    </svg>
  );
}

export function HardioAuthCard({ mode }: { mode: "register" | "sign-in" }) {
  const router = useRouter();
  const account = useAccount();

  const [username, setUsername] = useState("");
  const [emailOrLogin, setEmailOrLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [secure, setSecure] = useState(false);
  useEffect(() => { setSecure(window.location.protocol === "https:"); }, []);

  const isRegister = mode === "register";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (!account.passwordConfigured || window.location.protocol !== "https:") {
        throw new Error("Вход по паролю недоступен.");
      }
      const byUsername = !isRegister && !emailOrLogin.includes("@");
      await accountRequest(
        isRegister ? "/api/auth/sign-up/email" : byUsername ? "/api/auth/sign-in/username" : "/api/auth/sign-in/email",
        { method: "POST", body: JSON.stringify(byUsername ? { username: emailOrLogin, password } : { email: emailOrLogin, password, ...(isRegister ? { username } : {}) }) }
      );
      setPassword("");
      await account.refresh();
      router.push("/profile");
    } catch (err) {
      setPassword("");
      setError(err instanceof Error ? err.message : "Произошла ошибка при отправке формы");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hardio-auth-container">
      <div className="hardio-auth-card">
        {/* Логотип H */}
        <div className="hardio-logo">
          <span className="hardio-logo-letter">H</span>
        </div>

        {/* Заголовок и подзаголовок */}
        <h1 className="hardio-auth-title">
          {isRegister ? "Создание аккаунта" : "Вход в Hardio"}
        </h1>
        <p className="hardio-auth-subtitle">
          {isRegister
            ? "Присоединяйтесь к Hardio и изучайте код играючи!"
            : "Игровой путь в мир программирования"}
        </p>

        {error && <div className="hardio-error" role="alert">{error}</div>}

        {account.user ? <Link href="/profile" className="hardio-button-primary">Открыть профиль</Link> : !secure ? <p className="account-note">Вход по паролю доступен только по HTTPS. Гостевое обучение доступно.</p> : !account.passwordConfigured ? <p className="account-note">Вход и регистрация по паролю пока не включены владельцем сайта. Гостевое обучение доступно.</p> : <form className="hardio-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="hardio-field">
              <label htmlFor="hardio-username" className="hardio-field-label">Имя пользователя (Никнейм)</label>
              <div className="hardio-input-wrapper">
                <span className="hardio-input-icon">
                  <UserIcon />
                </span>
                <input
                  id="hardio-username"
                  type="text"
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_]{3,30}"
                  className="hardio-input"
                  placeholder="CodeMaster"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="hardio-field">
            <label htmlFor="hardio-email" className="hardio-field-label">
              {isRegister ? "Email" : "Email или Логин"}
            </label>
            <div className="hardio-input-wrapper">
              <span className="hardio-input-icon">
                <EmailIcon />
              </span>
              <input
                id="hardio-email"
                autoComplete={isRegister ? "email" : "username"}
                maxLength={254}
                type={isRegister ? "email" : "text"}
                className="hardio-input"
                placeholder="dev@example.com"
                value={emailOrLogin}
                onChange={(e) => setEmailOrLogin(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="hardio-field">
            <label htmlFor="hardio-password" className="hardio-field-label">Пароль</label>
            <div className="hardio-input-wrapper">
              <span className="hardio-input-icon">
                <KeyIcon />
              </span>
              <input
                id="hardio-password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                maxLength={128}
                type="password"
                className="hardio-input"
                placeholder={isRegister ? "Минимум 12 символов" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={12}
                required
              />
            </div>
          </div>

          <button type="submit" className="hardio-button-primary" disabled={busy}>
            {isRegister ? (
              <>
                <AddUserIcon />
                <span>{busy ? "Регистрируем…" : "Зарегистрироваться"}</span>
              </>
            ) : (
              <>
                <LogInIcon />
                <span>{busy ? "Входим…" : "Войти в аккаунт"}</span>
              </>
            )}
          </button>

        </form>}
        {!account.user && secure && account.googleConfigured && <GoogleSignIn />}
        <div className="hardio-switch-auth"><Link href="/" className="hardio-switch-link">Продолжить как гость</Link></div>

        <div className="hardio-switch-auth">
          {isRegister ? (
            <>
              Уже есть профиль?
              <Link href="/sign-in" className="hardio-switch-link">
                Войти
              </Link>
            </>
          ) : (
            <>
              Ещё нет аккаунта?
              <Link href="/register" className="hardio-switch-link">
                Зарегистрироваться
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

