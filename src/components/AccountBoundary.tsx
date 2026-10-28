"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAccount } from "@/src/components/AccountProvider";
import { PinForm } from "@/src/components/AccountPanel";

export function AccountBoundary({ children }: { children: ReactNode }) {
  const account = useAccount();
  const [exitError, setExitError] = useState("");
  if (account.status === "loading") return <div className="account-card" role="status" aria-live="polite"><h1>Открываем KiraQuest…</h1><p>Проверяем сессию и загружаем сохранённые данные.</p></div>;
  if (account.status === "error") return <section className="account-card"><h1>Не удалось загрузить аккаунт</h1><p role="alert">{account.error}</p><button className="button button-primary" onClick={() => void account.refresh()}>Повторить проверку</button><p className="account-note">Проверь соединение. Сохранённые данные остаются на сервере.</p></section>;
  if (account.status === "locked") return <section className="account-card sign-in-card"><span className="eyebrow">KIRAQUEST ЗАБЛОКИРОВАН</span><h1>Продолжим обучение?</h1><p>Разблокируй приложение PIN-кодом этого устройства.</p><PinForm mode="unlock" /><button className="text-button" onClick={() => { void account.signOut().then(() => window.location.replace("/sign-in?logged_out=1")).catch((e) => setExitError(e instanceof Error ? e.message : "Не удалось выйти.")); }}>Выйти из аккаунта</button>{exitError && <p role="alert">{exitError}</p>}</section>;
  return <>{account.syncStatus === "pending" && <p className="account-sync" role="status">Сохраняем изменения на сервере…</p>}{account.syncStatus === "saved" && <p className="account-sync" role="status">Изменения сохранены в аккаунте</p>}{account.error && <div className="account-feedback" role="alert"><p>{account.error}</p>{account.syncStatus === "error" && <button className="button button-outline" onClick={account.retrySync}>Повторить сохранение</button>}</div>}{account.user && account.guest && <p className="account-import-notice">В этом браузере есть гостевые данные. <Link href="/profile">Перенести в аккаунт</Link></p>}{children}</>;
}

export function AccountStatus() {
  const { user, status, configured } = useAccount();
  return <div className="account-status">{user ? <Link href="/profile">{status === "locked" ? "Аккаунт заблокирован" : user.name}</Link> : <Link href="/sign-in">{configured ? "Войти через Google" : "Гостевой режим"}</Link>}</div>;
}

export function AccountStorageNote() {
  const { user } = useAccount();
  return <p className="stage-disclosure">{user ? "Учебный прогресс и оформление сохраняются в твоём аккаунте на сервере. Статус сохранения показан над страницей." : "Гостевой прогресс и оформление сохраняются в этом браузере. Войди через Google в профиле, чтобы продолжать на других устройствах."}</p>;
}
