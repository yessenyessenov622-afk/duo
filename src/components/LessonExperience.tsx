"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { findLearningLesson, learningCourses, XP_PER_LESSON } from "@/src/data/learning-map";
import { statusForLesson } from "@/src/lib/learning-progress";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import type { LessonTask } from "@/src/types/learning";

export function LessonExperience({ lessonId }: { lessonId: string }) {
  const { progress, ready, warning, startLesson, recordAnswer, completeLesson } = useLearningProgress();
  const { settings } = useCustomization();
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [result, setResult] = useState<{ awarded: boolean; message: string } | null>(null);
  const [readerMode, setReaderMode] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, number>>({});
  const [eventStarts, setEventStarts] = useState<Record<string, number>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [stepOrder, setStepOrder] = useState<string[]>([]);
  const startedLessonId = useRef<string | null>(null);
  const match = lessonId ? findLearningLesson(lessonId) : null;

  useEffect(() => {
    const task = match?.lesson.task;
    setBudgetAmounts(Object.fromEntries((task?.budget?.allocations ?? []).map((item) => [item.id, item.initial])));
    setEventStarts(Object.fromEntries((task?.schedule?.events ?? []).map((item) => [item.id, item.initialStart])));
    setMatchingAnswers({});
    setStepOrder(task?.sequence?.initialOrder ?? []);
    setAnswer("");
    setChecked(false);
    setCorrect(false);
    setHintOpen(false);
  }, [lessonId]);

  useEffect(() => {
    if (!ready || !match || startedLessonId.current === lessonId) return;
    startedLessonId.current = lessonId;
    startLesson(match.lesson.id);
  }, [ready, match, startLesson]);

  useEffect(() => {
    document.documentElement.dataset.readerMode = String(readerMode);
    return () => { delete document.documentElement.dataset.readerMode; };
  }, [readerMode]);

  if (!lessonId) return <section className="lesson-route-empty"><span className="lesson-route-art" aria-hidden="true">⌁</span><span className="eyebrow">ГОТОВ К НОВОМУ ШАГУ?</span><h2>Выбери урок на карте</h2><p>На карте видны все направления, открытые уроки и уже пройденные шаги.</p><Link className="button button-dark" href="/map">Открыть карту обучения <span aria-hidden="true">→</span></Link><div className="lesson-course-shortcuts">{learningCourses.map((course) => <span key={course.id}>{course.icon} {course.title}</span>)}</div></section>;
  if (!match) return <section className="lesson-route-empty"><span className="lesson-route-art" aria-hidden="true">?</span><span className="eyebrow">УРОК НЕ НАЙДЕН</span><h2>Этот шаг не входит в маршрут</h2><p>Вернись на карту и открой урок из доступного списка.</p><Link className="button button-dark" href="/map">Назад к карте <span aria-hidden="true">→</span></Link></section>;

  const { course, chapter, lesson } = match;
  const task = lesson.task;
  const mode = task.mode ?? "single";
  const lessonHint = task.hint ?? (mode === "budget"
    ? "Сначала покрой минимальные расходы, затем распредели оставшуюся сумму так, чтобы остаток стал нулевым."
    : mode === "schedule"
      ? "Сравни интервалы целиком: следующее дело должно начаться после окончания предыдущего, а форма — завершиться до срока."
      : mode === "matching"
        ? "Сопоставь каждую строку с вариантом, который выполняет ту же роль."
        : mode === "sequence"
          ? "Подумай, какие действия нужны раньше, чтобы следующие стали возможны."
          : mode === "multi"
            ? "Проверь каждый пункт отдельно: верными могут быть несколько."
            : "Сопоставь условие задания с контекстом и исключи варианты, которые не решают задачу.");
  const selectedOptions = answer ? answer.split("\u001f") : [];
  const status = statusForLesson(course.id, lesson.id, progress);
  const blocked = status === "locked";
  const budgetTotal = task.budget?.allocations.reduce((sum, item) => sum + (budgetAmounts[item.id] ?? 0), 0) ?? 0;
  const budgetRemaining = (task.budget?.total ?? 0) - budgetTotal;
  const scheduleEvents = task.schedule?.events ?? [];
  const scheduleConflicts = scheduleEvents.filter((event, index) => scheduleEvents.slice(index + 1).some((other) => {
    const start = eventStarts[event.id];
    const otherStart = eventStarts[other.id];
    return start !== undefined && otherStart !== undefined && start < otherStart + other.duration && otherStart < start + event.duration;
  }));
  const formatTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const hasResponse = mode === "budget"
    ? Boolean(task.budget?.allocations.length) && Object.keys(budgetAmounts).length === task.budget?.allocations.length
    : mode === "schedule"
      ? Boolean(scheduleEvents.length) && Object.keys(eventStarts).length === scheduleEvents.length
      : mode === "matching"
        ? Boolean(task.matching?.pairs.length) && task.matching?.pairs.every((pair) => matchingAnswers[pair.left])
        : mode === "sequence"
          ? Boolean(task.sequence?.answer.length)
          : Boolean(answer);
  const submitAnswer = () => {
    if (!hasResponse) return;
    const isCorrect = mode === "budget"
      ? budgetRemaining === 0 && Boolean(task.budget?.allocations.every((item) => (budgetAmounts[item.id] ?? 0) >= item.minimum))
      : mode === "schedule"
        ? scheduleConflicts.length === 0 && scheduleEvents.every((event) => eventStarts[event.id] >= (task.schedule?.dayStart ?? 0) && eventStarts[event.id] + event.duration <= (event.latestEnd ?? task.schedule?.dayEnd ?? 24 * 60))
        : mode === "matching"
          ? task.matching?.pairs.every((pair) => matchingAnswers[pair.left] === pair.right) ?? false
          : mode === "sequence"
            ? stepOrder.join("\u001f") === (task.sequence?.answer ?? []).join("\u001f")
            : mode === "multi"
              ? selectedOptions.slice().sort().join("\u001f") === (task.answers ?? []).slice().sort().join("\u001f")
              : answer === task.answer;
    if (!recordAnswer(lesson.id, isCorrect)) return;
    setCorrect(isCorrect);
    setChecked(true);
  };
  const finish = () => {
    const completion = completeLesson(lesson.id);
    if (completion.ok) setResult({ awarded: completion.awarded, message: completion.awarded ? `Урок завершён — +${XP_PER_LESSON} XP. Следующий шаг открыт.` : "Повтор завершён. Опыт за этот урок уже был получен." });
  };

  const moveStep = (index: number, offset: number) => setStepOrder((order) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= order.length) return order;
    const next = [...order];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });

  return <section className="lesson-workspace">
    <div className="lesson-flow-top"><Link href="/map" className="lesson-back-link">← Вернуться к карте</Link><span>{course.title} <i aria-hidden="true">/</i> {chapter.title}</span><span className="lesson-local-tag">ДЕМО · ЛОКАЛЬНО</span><button type="button" className="reader-mode-toggle" aria-pressed={readerMode} onClick={() => setReaderMode((active) => !active)}>{readerMode ? "Выйти из режима чтения" : "Режим чтения"}</button></div>
    {warning && <p className="map-warning" role="alert">{warning}</p>}
    {blocked ? <div className="lesson-blocked"><span aria-hidden="true">⌑</span><div><h2>Этот урок пока закрыт</h2><p>Продолжи маршрут с предыдущего открытого шага — после него появится этот урок.</p><Link href="/map" className="button button-dark">Найти открытый урок <span aria-hidden="true">→</span></Link></div></div> : result ? <div className="lesson-result-card"><span className={`lesson-result-seal${result.awarded ? " earned" : ""}`} aria-hidden="true">{result.awarded ? "✦" : "↻"}</span><span className="eyebrow">{result.awarded ? "НОВЫЙ ШАГ ПРОЙДЕН" : "ПОВТОРЕНИЕ ЗАВЕРШЕНО"}</span><h1>Отличная работа!</h1><p>{result.message}</p>{lesson.skillOutcome && <div className="lesson-skill-outcome"><b>Что ты освоил</b>{lesson.skillOutcome}</div>}<MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="lesson-result-mascot" state="celebrate"/><div className="lesson-result-facts"><span>Всего XP <b>{progress.xp}</b></span><span>Уроков пройдено <b>{progress.completedLessons.length}</b></span></div><Link className="button button-dark" href="/map">Продолжить по карте <span aria-hidden="true">→</span></Link></div> : <>
      <div className="lesson-session-heading"><div><span className="eyebrow">{chapter.title}</span><h1>{lesson.title}</h1><p>{course.title} <span aria-hidden="true">·</span> {lesson.duration} <span aria-hidden="true">·</span> {XP_PER_LESSON} XP за первое прохождение</p></div><div className="lesson-progress-orb"><b>1</b><small>задание</small></div></div>
      <div className="lesson-question-card"><div className="lesson-instruction"><MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="lesson-guide" state={checked ? correct ? "correct" : "support" : hintOpen ? "thinking" : "idle"}/><span>{mode === "multi" ? "Выбери все подходящие варианты. Если ошибёшься, разбор останется рядом и можно попробовать ещё раз." : mode === "budget" ? "Измени суммы по категориям и следи за остатком." : mode === "schedule" ? "Выбери время начала дел. Управление доступно с клавиатуры." : mode === "matching" ? "Для каждой строки выбери подходящий формат." : mode === "sequence" ? "Переставь шаги кнопками вверх и вниз." : "Выбери один ответ. Если ошибёшься, разбор останется рядом и можно попробовать ещё раз."}</span></div>{lesson.task.context && <p className="lesson-example">{lesson.task.context}</p>}<span className="lesson-question-number">ВОПРОС 1 ИЗ 1</span><h2>{lesson.task.prompt}</h2><div hidden={mode === "budget" || mode === "schedule" || mode === "matching" || mode === "sequence"} className="lesson-answer-options" role="group" aria-label="Варианты ответа">{lesson.task.options.map((option, index) => { const chosen = selectedOptions.includes(option); return <button type="button" key={option} className={`lesson-answer-option${chosen ? " chosen" : ""}${checked && chosen ? correct ? " answer-is-correct" : " answer-is-wrong" : ""}`} aria-pressed={chosen} disabled={checked && correct} onClick={() => { setAnswer((current) => { const values = current ? current.split("\u001f") : []; if (mode !== "multi") return option; return (values.includes(option) ? values.filter((item) => item !== option) : [...values, option]).join("\u001f"); }); setChecked(false); setHintOpen(false); }}><span className="lesson-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{checked && chosen && <span className="lesson-option-feedback" aria-hidden="true">{correct ? "✓" : "↻"}</span>}</button>; })}</div>
        {mode === "budget" && task.budget && <fieldset className="mechanic-fieldset"><legend>Учебный остаток: {task.budget.total.toLocaleString("ru-RU")} ₸</legend><div className="budget-allocation-list">{task.budget.allocations.map((item) => <label className="budget-allocation-row" key={item.id}><span>{item.label}</span><span className="budget-input-wrap"><input type="number" min="0" step="1000" inputMode="numeric" value={budgetAmounts[item.id] ?? 0} aria-label={`${item.label}, тенге`} onChange={(event) => { setBudgetAmounts((current) => ({ ...current, [item.id]: Math.max(0, Number(event.target.value) || 0) })); setChecked(false); }} /><span>₸</span></span></label>)}</div><output className={`budget-balance${budgetRemaining === 0 ? " balanced" : ""}`} aria-live="polite"><span>{budgetRemaining < 0 ? "Превышение бюджета" : "Нераспределённый остаток"}</span><b>{budgetRemaining.toLocaleString("ru-RU")} ₸</b></output></fieldset>}
        {mode === "schedule" && task.schedule && <fieldset className="mechanic-fieldset"><legend>День: {formatTime(task.schedule.dayStart)}–{formatTime(task.schedule.dayEnd)}</legend><div className="schedule-event-list">{scheduleEvents.map((event) => { const latest = Math.min(task.schedule!.dayEnd - event.duration, event.latestEnd ? event.latestEnd - event.duration : task.schedule!.dayEnd - event.duration); const times = Array.from({ length: Math.max(0, Math.floor((latest - task.schedule!.dayStart) / 30) + 1) }, (_, index) => task.schedule!.dayStart + index * 30); return <label className="schedule-event-row" key={event.id}><span>{event.title}</span><select value={eventStarts[event.id] ?? event.initialStart} aria-label={`Время начала: ${event.title}`} onChange={(eventInput) => { setEventStarts((current) => ({ ...current, [event.id]: Number(eventInput.target.value) })); setChecked(false); }}>{times.map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}</select></label>; })}</div><output className={`schedule-check${scheduleConflicts.length === 0 ? " schedule-clear" : " schedule-conflict"}`} aria-live="polite">{scheduleConflicts.length ? `Пока есть пересечение${scheduleConflicts.length > 1 ? "я" : ""}: ${scheduleConflicts.map((item) => item.title.split(" · ")[0]).join(", ")}.` : "Пересечений по времени нет. Проверь крайний срок перед отправкой."}</output></fieldset>}
        {mode === "matching" && task.matching && <fieldset className="mechanic-fieldset"><legend>Сопоставление</legend><div className="matching-list">{task.matching.pairs.map((pair) => <label className="matching-row" key={pair.left}><span>{pair.left}</span><select value={matchingAnswers[pair.left] ?? ""} aria-label={`Формат для: ${pair.left}`} onChange={(event) => { setMatchingAnswers((current) => ({ ...current, [pair.left]: event.target.value })); setChecked(false); }}><option value="">Выбери файл</option>{task.matching!.choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></label>)}</div></fieldset>}
        {mode === "sequence" && task.sequence && <fieldset className="mechanic-fieldset"><legend>Порядок действий</legend><ol className="sequence-step-list">{stepOrder.map((id, index) => { const item = task.sequence!.items.find((entry) => entry.id === id); if (!item) return null; return <li key={id}><span className="sequence-position">{index + 1}</span><span className="sequence-step-label">{item.label}</span><button type="button" disabled={index === 0} aria-label={`Поднять выше: ${item.label}`} onClick={() => { moveStep(index, -1); setChecked(false); }}>↑</button><button type="button" disabled={index === stepOrder.length - 1} aria-label={`Опустить ниже: ${item.label}`} onClick={() => { moveStep(index, 1); setChecked(false); }}>↓</button></li>; })}</ol><p className="mechanic-keyboard-note">Кнопки можно выбирать клавишами Tab и Enter или Space.</p></fieldset>}
        {checked && <div className={`lesson-answer-explanation${correct ? " explanation-correct" : " explanation-retry"}`} role="status"><b>{correct ? "Верно!" : "Попробуй ещё раз — ты справишься."}</b><p>{lesson.task.explanation}</p></div>}
        <div className="lesson-question-footer"><div><span>Награда начисляется только при первом завершении.</span><button type="button" className="lesson-hint-button" aria-expanded={hintOpen} onClick={() => setHintOpen((open) => !open)}>{hintOpen ? "Скрыть подсказку" : "Попросить подсказку"}</button>{hintOpen && <p className="lesson-hint-copy" role="status">{lessonHint}</p>}</div>{checked && correct ? <button type="button" className="button button-dark" onClick={finish}>Завершить урок <span aria-hidden="true">→</span></button> : <button type="button" className="button button-dark" disabled={!hasResponse} onClick={submitAnswer}>Проверить ответ <span aria-hidden="true">→</span></button>}</div>
      </div>
      {status === "completed" && <p className="lesson-repeat-note">Этот урок уже пройден. Повторение поможет закрепить материал, но не начислит XP повторно.</p>}
    </>}
  </section>;
}
