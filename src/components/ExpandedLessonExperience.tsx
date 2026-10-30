"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { expandedLessons } from "@/src/data/expanded-lessons";
import { findLearningLesson, XP_PER_LESSON } from "@/src/data/learning-map";
import { statusForLesson } from "@/src/lib/learning-progress";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import { accountRequest, useAccount } from "@/src/components/AccountProvider";

const normalizeAnswer = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");

export function ExpandedLessonExperience({ lessonId }: { lessonId: string }) {
  const match = findLearningLesson(lessonId)!;
  const lessonContent = expandedLessons[lessonId];
  const { course, chapter, lesson } = match;
  const { progress, ready, warning, startLesson, recordAnswer, completeLesson } = useLearningProgress();
  const { settings } = useCustomization();
  const account = useAccount();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [budget, setBudget] = useState<Record<string, number>>({});
  const [starts, setStarts] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [readerMode, setReaderMode] = useState(false);
  const [result, setResult] = useState<{ awarded: boolean } | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifiedAnswers = useRef<unknown[]>([]);
  const started = useRef(false);
  const finishing = useRef(false);
  const task = lessonContent.tasks[index];
  const status = statusForLesson(course.id, lessonId, progress);

  useEffect(() => { if (ready && !started.current && status !== "locked") { started.current = true; startLesson(lessonId); } }, [ready, status, lessonId, startLesson]);
  useEffect(() => { setAnswer(""); setOrder(task.options ?? []); setBudget(Object.fromEntries((task.budget?.allocations ?? []).map((item) => [item.id, item.initial]))); setStarts(Object.fromEntries((task.schedule?.events ?? []).map((item) => [item.id, item.initialStart]))); setChecked(false); setCorrect(false); setHintOpen(false); }, [index, task]);
  useEffect(() => { document.documentElement.dataset.readerMode = String(readerMode); return () => { delete document.documentElement.dataset.readerMode; }; }, [readerMode]);

  const check = () => {
    if (checked && correct) return;
    const isCorrect = task.type === "budget" ? !!task.budget && task.budget.allocations.reduce((sum, item) => sum + (budget[item.id] ?? 0), 0) === task.budget.total && task.budget.allocations.every((item) => (budget[item.id] ?? 0) >= item.minimum)
      : task.type === "schedule" ? !!task.schedule && task.schedule.events.every((event, i, events) => starts[event.id] >= task.schedule!.dayStart && starts[event.id] + event.duration <= (event.latestEnd ?? task.schedule!.dayEnd) && events.slice(i + 1).every((other) => starts[event.id] + event.duration <= starts[other.id] || starts[other.id] + other.duration <= starts[event.id]))
      : task.type === "order"
      ? order.join("\u001f") === (task.answer as string[]).join("\u001f")
      : task.type === "text"
        ? (task.accepted ?? [task.answer as string]).some((item) => normalizeAnswer(item) === normalizeAnswer(answer))
        : answer === task.answer;
    if (recordAnswer(lessonId, isCorrect)) { if (isCorrect) verifiedAnswers.current[index] = structuredClone(task.type === "budget" ? budget : task.type === "schedule" ? starts : task.type === "order" ? order : answer); setCorrect(isCorrect); setChecked(true); }
  };
  const next = async () => {
    if (!checked || !correct || finishing.current) return;
    if (index < lessonContent.tasks.length - 1) { setIndex(index + 1); return; }
    finishing.current = true;
    setVerificationError("");
    if (account.user) {
      setVerifying(true);
      try { await accountRequest("/api/lessons/verify", { method: "POST", body: JSON.stringify({ lessonId, answers: verifiedAnswers.current }) }, account.user.id); }
      catch (error) { setVerificationError(error instanceof Error ? error.message : "Не удалось подтвердить урок. Попробуй ещё раз."); finishing.current = false; setVerifying(false); return; }
      setVerifying(false);
    }
    const completion = completeLesson(lessonId);
    if (completion.ok) setResult({ awarded: completion.awarded });
    else finishing.current = false;
  };
  const move = (position: number, direction: number) => setOrder((current) => {
    const target = position + direction;
    if (target < 0 || target >= current.length) return current;
    const nextOrder = [...current]; [nextOrder[position], nextOrder[target]] = [nextOrder[target], nextOrder[position]];
    setChecked(false); return nextOrder;
  });

  if (!ready) return <p role="status">Загружаем урок…</p>;
  if (status === "locked") return <section className="lesson-blocked"><div><h2>Этот урок пока закрыт</h2><p>Сначала пройди предыдущий открытый шаг.</p><Link href="/map" className="button button-dark">Открыть карту</Link></div></section>;
  if (result) return <section className="lesson-result-card"><span className="lesson-result-seal earned" aria-hidden="true">✦</span><span className="eyebrow">УРОК ЗАВЕРШЁН</span><h1>Отличная работа!</h1><p>{result.awarded ? `Все ${lessonContent.tasks.length} заданий пройдены — +🌿 ${XP_PER_LESSON} мяты.` : "Повторение завершено. Мята за этот урок уже была получена."}</p><MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="lesson-result-mascot" state="celebrate"/><div className="lesson-result-facts"><span>Всего мяты <b>🌿 {progress.xp}</b></span><span>Уроков пройдено <b>{progress.completedLessons.length}</b></span></div><Link className="button button-dark" href="/map">Продолжить по карте →</Link></section>;

  return <section className="lesson-workspace expanded-lesson">
    <div className="lesson-flow-top"><Link href="/map" className="lesson-back-link">← Вернуться к карте</Link><span>{course.title} / {chapter.title}</span><button type="button" className="reader-mode-toggle" aria-pressed={readerMode} onClick={() => setReaderMode(!readerMode)}>{readerMode ? "Выйти из режима чтения" : "Режим чтения"}</button></div>
    {warning && <p className="map-warning" role="alert">{warning}</p>}
    <div className="lesson-session-heading"><div><span className="eyebrow">УРОВЕНЬ {lessonContent.level} · {chapter.title}</span><h1>{lesson.title}</h1><p>🌿 {XP_PER_LESSON} мяты за первое прохождение</p></div><div className="lesson-progress-orb"><b>{index + 1}/{lessonContent.tasks.length}</b><small>заданий</small></div></div>
    <section className="lesson-question-card lesson-material" aria-labelledby="lesson-material-title"><span className="eyebrow">ПЕРЕД ПРАКТИКОЙ</span><h2 id="lesson-material-title">Разберём тему</h2>{lessonContent.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p><b>Пример</b></p><pre>{lessonContent.example}</pre></section>
    <div className="lesson-question-card"><div className="lesson-instruction"><MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="lesson-guide" state={checked ? correct ? "correct" : "support" : hintOpen ? "thinking" : "idle"}/><span>Отвечай в своём темпе. Если ошибёшься, можно попробовать ещё раз.</span></div>
      <div className="expanded-progress"><span>Задание {index + 1} из {lessonContent.tasks.length}</span><progress value={index} max={lessonContent.tasks.length} aria-label="Прогресс урока" /></div>
      <h2>{task.prompt}</h2>
      {task.type === "choice" && <div className="lesson-answer-options" role="group" aria-label="Варианты ответа">{task.options?.map((option) => <button key={option} type="button" className={`lesson-answer-option${answer === option ? " chosen" : ""}`} aria-pressed={answer === option} disabled={checked && correct} onClick={() => { setAnswer(option); setChecked(false); }}>{option}</button>)}</div>}
      {task.type === "text" && <label className="expanded-answer">Твой ответ<input value={answer} disabled={checked && correct} onChange={(event) => { setAnswer(event.target.value); setChecked(false); }} autoComplete="off" /></label>}
      {task.type === "order" && <fieldset className="mechanic-fieldset"><legend>Порядок частей</legend><ol className="sequence-step-list">{order.map((item, position) => <li key={item}><span className="sequence-position">{position + 1}</span><span className="sequence-step-label">{item}</span><button type="button" disabled={position === 0 || (checked && correct)} aria-label={`Поднять выше: ${item}`} onClick={() => move(position, -1)}>↑</button><button type="button" disabled={position === order.length - 1 || (checked && correct)} aria-label={`Опустить ниже: ${item}`} onClick={() => move(position, 1)}>↓</button></li>)}</ol></fieldset>}
      {task.type === "budget" && task.budget && <fieldset className="mechanic-fieldset"><legend>Учебный бюджет: {task.budget.total.toLocaleString("ru-RU")} ₸</legend><div className="budget-allocation-list">{task.budget.allocations.map((item) => <label className="budget-allocation-row" key={item.id}><span>{item.label}</span><span className="budget-input-wrap"><input type="number" min="0" step="1000" inputMode="numeric" value={budget[item.id] ?? 0} disabled={checked && correct} aria-label={`${item.label}, тенге`} onChange={(event) => { setBudget((current) => ({ ...current, [item.id]: Math.max(0, Number(event.target.value) || 0) })); setChecked(false); }} /><span>₸</span></span></label>)}</div><output className="budget-balance" aria-live="polite">Остаток: {(task.budget.total - task.budget.allocations.reduce((sum, item) => sum + (budget[item.id] ?? 0), 0)).toLocaleString("ru-RU")} ₸</output></fieldset>}
      {task.type === "schedule" && task.schedule && <fieldset className="mechanic-fieldset"><legend>Время начала дел</legend><div className="schedule-event-list">{task.schedule.events.map((event) => <label className="schedule-event-row" key={event.id}><span>{event.title}</span><select value={starts[event.id] ?? event.initialStart} disabled={checked && correct} aria-label={`Время начала: ${event.title}`} onChange={(input) => { setStarts((current) => ({ ...current, [event.id]: Number(input.target.value) })); setChecked(false); }}>{Array.from({length: Math.floor((task.schedule!.dayEnd - event.duration - task.schedule!.dayStart) / 30) + 1}, (_, i) => task.schedule!.dayStart + i * 30).map((minute) => <option key={minute} value={minute}>{`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`}</option>)}</select></label>)}</div></fieldset>}
      {checked && <div className={`lesson-answer-explanation${correct ? " explanation-correct" : " explanation-retry"}`} role="status"><b>{correct ? "Верно!" : "Пока не получилось. Попробуй ещё раз."}</b><p>{task.explanation}</p></div>}
      {verificationError && <p role="alert">{verificationError}</p>}
      <div className="lesson-question-footer"><div><span>Награда начисляется только при первом завершении.</span><button type="button" className="lesson-hint-button" aria-expanded={hintOpen} onClick={() => setHintOpen(!hintOpen)}>{hintOpen ? "Скрыть подсказку" : "Попросить подсказку"}</button>{hintOpen && <p className="lesson-hint-copy">{task.hint}</p>}</div>{checked && correct ? <button type="button" className="button button-dark" disabled={verifying} onClick={() => void next()}>{verifying ? "Проверяем…" : index === lessonContent.tasks.length - 1 ? "Завершить урок" : "Следующее задание"} →</button> : <button type="button" className="button button-dark" disabled={(task.type === "text" || task.type === "choice") && !answer.trim()} onClick={check}>Проверить ответ →</button>}</div>
    </div>
    {status === "completed" && <p className="lesson-repeat-note">Урок уже пройден: повторение не начислит мяту повторно.</p>}
  </section>;
}
