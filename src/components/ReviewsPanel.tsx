"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { accountRequest, useAccount } from "@/src/components/AccountProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";

type Review = { rating: number; body: string; created_at: string; updated_at: string; edited: boolean; author: string; mascot: string; mine: boolean };
type OwnReview = { rating: number; body: string; hidden_at: string | null; hidden_reason: string | null };
type Result = { reviews: Review[]; total: number; average: number | null; filtered: number; pageSize: number; own: OwnReview | null };

export function ReviewsPanel() {
  const account = useAccount();
  const [result, setResult] = useState<Result | null>(null);
  const [sort, setSort] = useState("newest");
  const [stars, setStars] = useState("");
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), sort });
    if (stars) query.set("stars", stars);
    const next = await accountRequest<Result>(`/api/reviews?${query}`, { signal });
    if (!signal?.aborted) { setResult(next); setLoading(false); }
  }, [page, sort, stars]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const refresh = () => { if (document.visibilityState === "visible") void load(controller.signal).catch((e) => { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : "Не удалось загрузить отзывы."); setLoading(false); } }); };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [load, account.user?.id]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await accountRequest("/api/reviews", { method: "POST", body: JSON.stringify({ rating, body }) }, account.user?.id);
      setEditing(false); setBody(""); await load(); setMessage("Отзыв сохранён.");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить отзыв."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || !window.confirm("Удалить свой отзыв?")) return;
    setBusy(true); setError(""); setMessage("");
    try { await accountRequest("/api/reviews", { method: "DELETE", body: "{}" }, account.user?.id); setEditing(false); setBody(""); await load(); setMessage("Отзыв удалён."); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось удалить отзыв."); }
    finally { setBusy(false); }
  };
  const own = result?.own;
  const showForm = !!account.user && (editing || (!loading && !own));
  const pages = Math.max(1, Math.ceil((result?.filtered ?? 0) / (result?.pageSize ?? 10)));

  return <div className="reviews-page">
    <section className="account-card"><h1>Отзывы о KiraQuest</h1><p>Отзывы и имена авторов видны всем. Список обновляется примерно каждые 15 секунд, пока вкладка открыта.</p>
      {result && <p><b>{result.average === null ? "Пока нет оценок" : `${result.average.toFixed(1)} из 5`}</b> · Отзывов: {result.total}</p>}
      {!account.user && account.status === "guest" && <p>Чтобы оставить отзыв, <Link className="text-button" href="/sign-in">войдите</Link> или <Link className="text-button" href="/register">зарегистрируйтесь</Link>.</p>}
      {own?.hidden_at && <p className="account-feedback" role="status">Ваш отзыв скрыт. Причина: {own.hidden_reason || "Не указана"}.</p>}
      {own && !editing && <div className="reviews-own"><p>Ваш отзыв: {own.rating} из 5</p><p className="reviews-text">{own.body}</p><div className="account-actions"><button type="button" className="button button-outline" disabled={busy} onClick={() => { setRating(own.rating); setBody(own.body); setEditing(true); }}>Изменить</button><button type="button" className="button button-outline" disabled={busy} onClick={() => void remove()}>Удалить</button></div></div>}
      {showForm && <form className="reviews-form" onSubmit={(event) => void save(event)}><label>Оценка<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5,4,3,2,1].map(value => <option value={value} key={value}>{value} из 5</option>)}</select></label><label>Отзыв<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={2000} required rows={5}/></label><p>Отзыв и ваш никнейм будут видны всем. Если никнейма нет, будет указано «Участник». От 10 до 2000 символов.</p><div className="account-actions"><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Сохраняем…" : own ? "Сохранить изменения" : "Опубликовать отзыв"}</button>{editing && <button type="button" className="text-button" onClick={() => setEditing(false)}>Отмена</button>}</div></form>}
      {error && <p className="account-feedback" role="alert">{error}</p>}{message && <p className="account-feedback" role="status">{message}</p>}
    </section>
    <section className="account-card"><div className="reviews-filters"><label>Сортировка<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Сначала новые</option><option value="rating">Сначала высокие оценки</option></select></label><label>Оценка<select value={stars} onChange={(event) => { setStars(event.target.value); setPage(1); }}><option value="">Все оценки</option>{[5,4,3,2,1].map(value => <option value={value} key={value}>{value} из 5</option>)}</select></label></div>
      {loading ? <p role="status">Загружаем отзывы…</p> : !result?.reviews.length ? <p>Здесь пока нет опубликованных отзывов.</p> : <div className="reviews-list">{result.reviews.map((review, index) => <article className="review-item" key={`${review.created_at}-${index}`}><div className="review-heading"><MascotAvatar id={review.mascot} className="review-mascot"/><div><b>{review.author}</b>{review.mine && <span> · Ваш отзыв</span>}<div aria-label={`Оценка: ${review.rating} из 5`}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</div></div><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("ru-RU", { timeZone: "UTC" })}</time></div><p className="reviews-text">{review.body}</p>{review.edited && <small>Изменён</small>}</article>)}</div>}
      <div className="account-actions"><button type="button" className="button button-outline" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Назад</button><span>Страница {page} из {pages}</span><button type="button" className="button button-outline" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Далее</button></div>
    </section>
  </div>;
}
