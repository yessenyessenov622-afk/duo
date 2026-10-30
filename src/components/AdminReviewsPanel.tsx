"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { accountRequest } from "@/src/components/AccountProvider";
import { AdminUsers } from "@/src/components/AdminUsers";

type Entry = { user_id: string; author: string; rating: number; body: string; created_at: string; hidden_at: string | null; hidden_reason: string | null };
type Log = { author: string; action: "hide" | "restore"; reason: string | null; created_at: string };
type Period = { visits: number; active: number; guests: number; seconds: number; lessons: number; mint: number };
type Overview = { total: number; day: number; week: number; month: number; periods: Record<string, Period>; startedAt: string | null; recentlyActive: number };
export function AdminReviewsPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), status: filter, q: query });
    const data = await accountRequest<{reviews:Entry[];log:Log[]}>(`/api/admin/reviews?${params}`);
    setEntries(data.reviews); setLog(data.log);
  }, [page, filter, query]);
  useEffect(() => { let active = true; setLoading(true); void load().catch(e => { if (active) setError(e instanceof Error ? e.message : "Не удалось загрузить отзывы."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);
  useEffect(() => { const controller = new AbortController(); void accountRequest<Overview>("/api/admin/overview", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setOverview(data); }).catch(() => { if (!controller.signal.aborted) setError("Не удалось загрузить число аккаунтов."); }); return () => controller.abort(); }, []);
  const moderate = async (event: FormEvent, userId: string, action: "hide" | "restore") => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { await accountRequest("/api/admin/reviews", { method: "POST", body: JSON.stringify({userId,action,reason:reason[userId] ?? ""}) }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить статус."); }
    finally { setBusy(false); }
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setPasswordMessage("");
    if (newPassword !== confirmation) { setPasswordMessage("Новые пароли не совпадают."); return; }
    setBusy(true);
    try {
      await accountRequest("/api/admin/password", { method: "POST", body: JSON.stringify({currentPassword,newPassword}) });
      setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setPasswordMessage("Пароль изменён. Ранее открытые сессии остаются активными до выхода или истечения.");
    } catch (e) { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setPasswordMessage(e instanceof Error ? e.message : "Не удалось изменить пароль."); }
    finally { setBusy(false); }
  };
  return <div className="reviews-page"><section className="account-card"><h1>Панель владельца</h1>{overview ? <p>Аккаунтов: <b>{overview.total}</b>. Регистраций: сегодня — {overview.day}, на этой неделе — {overview.week}, в этом месяце — {overview.month}. Границы периодов: UTC, неделя начинается в понедельник.</p> : <p role="status">Загружаем число аккаунтов…</p>}<p>Управление отзывами. Скрытые отзывы не входят в общий список и среднюю оценку.</p>{error && <p className="account-feedback" role="alert">{error}</p>}
    {overview?.startedAt && <section><h2>Посещения и учебное время</h2><p>Учёт с {new Date(overview.startedAt).toLocaleDateString("ru-RU", {timeZone:"UTC"})}. Недавно активны: {overview.recentlyActive} аккаунтов за 5 минут. Это не точный показатель присутствия онлайн.</p>{([['day','Сегодня'],['week','Неделя'],['month','Месяц']] as const).map(([key,label]) => { const p = overview.periods[key]; return p && <p key={key}>{label}: посещений аккаунтов — {p.visits}, активных аккаунтов — {p.active}, гостевых посещений — {p.guests}, подтверждено уроков — {p.lessons}, мяты — 🌿 {p.mint}, оценка учебного времени — {Math.floor(p.seconds / 60)} мин.</p>; })}<p>Время приблизительное: учитываются сигналы активного урока; оно не доказывает внимание пользователя.</p></section>}
    <div className="reviews-filters"><label>Поиск<input value={query} maxLength={100} onChange={e => { setQuery(e.target.value); setPage(1); }}/></label><label>Статус<select value={filter} onChange={e => {setFilter(e.target.value);setPage(1);}}><option value="all">Все</option><option value="visible">Опубликованные</option><option value="hidden">Скрытые</option></select></label></div>
    {loading ? <p role="status">Загружаем…</p> : entries.length === 0 ? <p>Отзывов не найдено.</p> : <div className="reviews-list">{entries.map(item => <article className="review-item" key={item.user_id}><b>{item.author}</b> · {item.rating} из 5 · <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("ru-RU")}</time><p className="reviews-text">{item.body}</p>{item.hidden_at ? <><p>Скрыт: {item.hidden_reason}</p><button className="button button-outline" type="button" disabled={busy} onClick={event => void moderate(event, item.user_id, "restore")}>Восстановить</button></> : <form className="reviews-form" onSubmit={event => void moderate(event,item.user_id,"hide")}><label>Причина скрытия<input required maxLength={500} value={reason[item.user_id] ?? ""} onChange={e => setReason({...reason,[item.user_id]:e.target.value})}/></label><button className="button button-outline" disabled={busy} type="submit">Скрыть отзыв</button></form>}</article>)}</div>}
    <div className="account-actions"><button className="button button-outline" disabled={page <= 1 || loading} onClick={() => setPage(page-1)}>Назад</button><span>Страница {page}</span><button className="button button-outline" disabled={entries.length < 10 || loading} onClick={() => setPage(page+1)}>Далее</button></div></section>
    <AdminUsers />
    <section className="account-card"><h2>Журнал модерации</h2>{log.length ? <ul>{log.map((entry,index) => <li key={`${entry.created_at}-${index}`}>{entry.author}: {entry.action === "hide" ? `скрыт — ${entry.reason}` : "восстановлен"} · {new Date(entry.created_at).toLocaleString("ru-RU")}</li>)}</ul> : <p>Действий пока нет.</p>}</section>
    <section className="account-card"><h2>Смена пароля владельца</h2><form className="reviews-form" onSubmit={event => void changePassword(event)}><label>Текущий пароль<input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}/></label><label>Новый пароль<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNewPassword(e.target.value)}/></label><label>Повторите новый пароль<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label><button className="button button-primary" disabled={busy}>Изменить пароль</button>{passwordMessage && <p role="status">{passwordMessage}</p>}</form></section></div>;
}
