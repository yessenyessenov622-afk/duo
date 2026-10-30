"use client";
import { useEffect, useState } from "react";
import { accountRequest } from "@/src/components/AccountProvider";

type User = { id: string; nickname: string; registered_at: string; first_visit: string | null; last_visit: string | null; visits: string; seconds: string; lessons: string; mint: string };
const date = (value: string | null) => value ? new Date(value).toLocaleString("ru-RU", { timeZone: "UTC" }) + " UTC" : "нет данных";
export function AdminUsers() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("registered");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = new URLSearchParams({ q: query, page: String(page), sort });
    void accountRequest<{users:User[]}>(`/api/admin/users?${params}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setUsers(data.users); }).catch(() => { if (!controller.signal.aborted) setError("Не удалось загрузить пользователей."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, sort]);
  return <section className="account-card"><h2>Пользователи</h2><p>Посещения и подтверждённые результаты учитываются с момента запуска статистики; старый опыт остаётся в профиле.</p>
    <div className="reviews-filters"><label>Поиск по никнейму<input value={query} maxLength={100} onChange={event => {setQuery(event.target.value);setPage(1);}} /></label><label>Сортировка<select value={sort} onChange={event => {setSort(event.target.value);setPage(1);}}><option value="registered">По регистрации</option><option value="recent">По последнему посещению</option></select></label></div>
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">Загружаем пользователей…</p> : users.length ? <div className="reviews-list">{users.map(user => <article className="review-item" key={user.id}><b>{user.nickname}</b><p>Регистрация: {date(user.registered_at)}<br/>Первое посещение: {date(user.first_visit)}<br/>Последнее посещение: {date(user.last_visit)}<br/>Посещений: {user.visits}<br/>Подтверждено уроков: {user.lessons}<br/>Подтверждено мяты: 🌿 {user.mint}<br/>Учебное время: {Math.floor(Number(user.seconds)/60)} мин.</p></article>)}</div> : <p>Пользователей не найдено.</p>}
    <div className="account-actions"><button type="button" className="button button-outline" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Назад</button><span>Страница {page}</span><button type="button" className="button button-outline" disabled={loading || users.length < 10} onClick={() => setPage(page + 1)}>Далее</button></div>
  </section>;
}
