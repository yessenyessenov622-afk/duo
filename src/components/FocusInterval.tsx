"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "focus" | "break";
type TimerState = { phase: Phase; secondsLeft: number; running: boolean; endsAt: number | null };
const STORAGE_KEY = "kiraquest.focus-interval.v1";
const duration = (phase: Phase) => phase === "focus" ? 25 * 60 : 5 * 60;
const initialState: TimerState = { phase: "focus", secondsLeft: duration("focus"), running: false, endsAt: null };

export function FocusInterval() {
  const pathname = usePathname();
  const [state, setState] = useState<TimerState>(initialState);
  const [expanded, setExpanded] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { timer?: TimerState; distractionFree?: boolean } | null;
      if (stored?.timer && (stored.timer.phase === "focus" || stored.timer.phase === "break")
        && typeof stored.timer.running === "boolean"
        && Number.isFinite(stored.timer.secondsLeft)
        && stored.timer.secondsLeft >= 0 && stored.timer.secondsLeft <= duration(stored.timer.phase)) {
        const timer = stored.timer;
        const secondsLeft = timer.running && timer.endsAt ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) : timer.secondsLeft;
        if (timer.running && secondsLeft === 0) {
          setState({ phase: timer.phase === "focus" ? "break" : "focus", secondsLeft: duration(timer.phase === "focus" ? "break" : "focus"), running: false, endsAt: null });
          setAnnouncement(timer.phase === "focus" ? "Интервал учёбы завершён. Можно начать отдых." : "Перерыв завершён. Можно начать новый интервал.");
        } else setState({ ...timer, secondsLeft, endsAt: timer.running ? Date.now() + secondsLeft * 1000 : null });
      }
      setDistractionFree(Boolean(stored?.distractionFree));
    } catch { /* A broken timer preference should not affect the rest of the app. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (state.running && state.secondsLeft % 5 !== 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ timer: state, distractionFree })); } catch { /* Timer remains usable for this visit. */ }
  }, [state, distractionFree, ready]);

  useEffect(() => {
    document.documentElement.dataset.focusMode = String(distractionFree);
    return () => { delete document.documentElement.dataset.focusMode; };
  }, [distractionFree]);

  useEffect(() => {
    if (!state.running || !state.endsAt) return;
    const update = () => {
      const secondsLeft = Math.max(0, Math.ceil((state.endsAt! - Date.now()) / 1000));
      if (secondsLeft === 0) {
        const nextPhase = state.phase === "focus" ? "break" : "focus";
        setState({ phase: nextPhase, secondsLeft: duration(nextPhase), running: false, endsAt: null });
        setAnnouncement(state.phase === "focus" ? "Интервал учёбы завершён. Можно начать отдых." : "Перерыв завершён. Можно начать новый интервал.");
      } else setState((current) => current.running ? { ...current, secondsLeft } : current);
    };
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [state.running, state.endsAt, state.phase]);

  const time = useMemo(() => `${String(Math.floor(state.secondsLeft / 60)).padStart(2, "0")}:${String(state.secondsLeft % 60).padStart(2, "0")}`, [state.secondsLeft]);
  const toggleTimer = () => {
    setAnnouncement("");
    setState((current) => current.running
      ? { ...current, running: false, endsAt: null }
      : { ...current, running: true, endsAt: Date.now() + current.secondsLeft * 1000 });
  };
  const resetTimer = () => { setState({ ...initialState, phase: state.phase, secondsLeft: duration(state.phase) }); setAnnouncement("Интервал сброшен."); };

  return <div className="focus-interval">
    <button type="button" className="focus-interval-trigger" aria-expanded={expanded} aria-controls="focus-interval-panel" onClick={() => setExpanded((value) => !value)}>
      <span aria-hidden="true">◷</span><span>Фокус</span>
    </button>
    {expanded && <section id="focus-interval-panel" className="focus-interval-panel" aria-label="Интервал фокуса">
      <p className="eyebrow">ИНТЕРВАЛ ФОКУСА</p>
      <p className="focus-phase">{state.phase === "focus" ? "Учёба" : "Отдых"}</p>
      <time className="focus-time" aria-label={`${state.phase === "focus" ? "Учёба" : "Отдых"}: ${time}`}>{time}</time>
      <div className="focus-actions"><button type="button" className="button button-dark" onClick={toggleTimer}>{state.running ? "Пауза" : "Начать"}</button><button type="button" className="button button-outline" onClick={resetTimer}>Сбросить</button></div>
      <p className="focus-hint">25 минут учёбы и 5 минут отдыха. Таймер можно поставить на паузу.</p>
      {pathname === "/" && <label className="focus-mode-toggle"><input type="checkbox" checked={distractionFree} onChange={(event) => setDistractionFree(event.target.checked)} />Скрыть лишнее на главной</label>}
      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>
    </section>}
  </div>;
}
