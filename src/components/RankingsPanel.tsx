"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { accountRequest, useAccount } from "@/src/components/AccountProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";

type Entry = { place: string; nickname: string; mascot: string; score: string; mine?: boolean };
type Result = { top: Entry[]; entries: Entry[]; own: Entry | null; hidden: boolean; signedIn: boolean; total: number };
export function RankingsPanel() {
  const account = useAccount();
  const [metric, setMetric] = useState("mint");
  const [period, setPeriod] = useState("week");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({ metric, period, page: String(page) });
    const data = await accountRequest<Result>(`/api/rankings?${params}`, { signal });
    if (!signal?.aborted) { setResult(data); setLoading(false); }
  }, [metric, period, page]);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(""); void load(controller.signal).catch(e => { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : "Не удалось загрузить рейтинг."); setLoading(false); } }); return () => controller.abort(); }, [load, account.user?.id]);
  const privacy = async () => {
    if (!account.user || !result || busy) return;
    setBusy(true); setError("");
    try { await accountRequest("/api/rankings", { method: "POST", body: JSON.stringify({hidden: !result.hidden}) }, account.user.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить видимость."); }
    finally { setBusy(false); }
  };
  const value = (entry: Entry) => metric === "mint" ? `🌿 ${entry.score} мяты` : metric === "time" ? `${Math.floor(Number(entry.score) / 60)} мин` : `${entry.score} уроков`;
  const card = (entry: Entry) => <article className="review-item" key={entry.place}><div className="review-heading"><MascotAvatar id={entry.mascot} className="review-mascot"/><b>#{entry.place} · {entry.nickname}{entry.mine ? " · Вы" : ""}</b><span>{value(entry)}</span></div></article>;
  return <div className="reviews-page"><section className="account-card"><h1>Рейтинги</h1><p>Неделя начинается в понедельник, периоды считаются по UTC. Мята и уроки — только после серверной проверки ответов; ранее сохранённый и гостевой опыт остаётся в профиле. Время — приблизительная оценка, а не доказательство внимания.</p>
    <div className="reviews-filters"><label>Показатель<select value={metric} onChange={e => {setMetric(e.target.value);setPage(1);}}><option value="mint">Мята</option><option value="time">Время обучения</option><option value="lessons">Уроки</option></select></label><label>Период<select value={period} onChange={e => {setPeriod(e.target.value);setPage(1);}}><option value="week">Неделя</option><option value="month">Месяц</option><option value="all">Всё время</option></select></label></div>
    {account.user && account.status === "ready" && result && <button type="button" className="button button-outline" disabled={busy} onClick={() => void privacy()}>{result.hidden ? "Показать профиль в рейтинге" : "Скрыть профиль из рейтинга"}</button>}
    {!account.user && <p><Link href="/sign-in" className="text-button">Войди в аккаунт</Link>, чтобы участвовать в рейтинге.</p>}
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">Загружаем рейтинг…</p> : result && <><h2>Тройка лидеров</h2>{result.top.length ? <div className="reviews-list">{result.top.map(card)}</div> : <p>Пока нет результатов за этот период.</p>}
    {result.signedIn && <p><b>Твоё место:</b> {result.hidden ? "профиль скрыт" : result.own ? `#${result.own.place} · ${value(result.own)}` : "пока нет результата за этот период"}</p>}
    <h2>Все участники</h2>{result.entries.length ? <div className="reviews-list">{result.entries.map(card)}</div> : <p>На этой странице пока нет участников.</p>}
    <div className="account-actions"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(page-1)}>Назад</button><span>Страница {page}</span><button className="button button-outline" disabled={page*10 >= result.total} onClick={() => setPage(page+1)}>Далее</button></div></>}
  </section></div>;
}
