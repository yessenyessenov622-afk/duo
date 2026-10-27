"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { findLearningLesson, learningCourses, XP_PER_LESSON } from "@/src/data/learning-map";
import { statusForLesson } from "@/src/lib/learning-progress";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";

export function LessonExperience({ lessonId }: { lessonId: string }) {
  const { progress, ready, warning, startLesson, recordAnswer, completeLesson } = useLearningProgress();
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [result, setResult] = useState<{ awarded: boolean; message: string } | null>(null);
  const [readerMode, setReaderMode] = useState(false);
  const started = useRef(false);
  const match = lessonId ? findLearningLesson(lessonId) : null;

  useEffect(() => {
    if (!ready || !match || started.current) return;
    started.current = true;
    startLesson(match.lesson.id);
  }, [ready, match, startLesson]);

  useEffect(() => {
    document.documentElement.dataset.readerMode = String(readerMode);
    return () => { delete document.documentElement.dataset.readerMode; };
  }, [readerMode]);

  if (!lessonId) return <section className="lesson-route-empty"><span className="lesson-route-art" aria-hidden="true">⌁</span><span className="eyebrow">ГОТОВ К НОВОМУ ШАГУ?</span><h2>Выбери урок на карте</h2><p>На карте видны все направления, открытые уроки и уже пройденные шаги.</p><Link className="button button-dark" href="/map">Открыть карту обучения <span aria-hidden="true">→</span></Link><div className="lesson-course-shortcuts">{learningCourses.map((course) => <span key={course.id}>{course.icon} {course.title}</span>)}</div></section>;
  if (!match) return <section className="lesson-route-empty"><span className="lesson-route-art" aria-hidden="true">?</span><span className="eyebrow">УРОК НЕ НАЙДЕН</span><h2>Этот шаг не входит в маршрут</h2><p>Вернись на карту и открой урок из доступного списка.</p><Link className="button button-dark" href="/map">Назад к карте <span aria-hidden="true">→</span></Link></section>;

  const { course, chapter, lesson } = match;
  const status = statusForLesson(course.id, lesson.id, progress);
  const blocked = status === "locked";
  const submitAnswer = () => {
    if (!answer) return;
    const isCorrect = answer === lesson.task.answer;
    if (!recordAnswer(lesson.id, isCorrect)) return;
    setCorrect(isCorrect);
    setChecked(true);
  };
  const finish = () => {
    const completion = completeLesson(lesson.id);
    if (completion.ok) setResult({ awarded: completion.awarded, message: completion.awarded ? `Урок завершён — +${XP_PER_LESSON} XP. Следующий шаг открыт.` : "Повтор завершён. Опыт за этот урок уже был получен." });
  };

  return <section className="lesson-workspace">
    <div className="lesson-flow-top"><Link href="/map" className="lesson-back-link">← Вернуться к карте</Link><span>{course.title} <i aria-hidden="true">/</i> {chapter.title}</span><span className="lesson-local-tag">ДЕМО · ЛОКАЛЬНО</span><button type="button" className="reader-mode-toggle" aria-pressed={readerMode} onClick={() => setReaderMode((active) => !active)}>{readerMode ? "Выйти из режима чтения" : "Режим чтения"}</button></div>
    {warning && <p className="map-warning" role="alert">{warning}</p>}
    {blocked ? <div className="lesson-blocked"><span aria-hidden="true">⌑</span><div><h2>Этот урок пока закрыт</h2><p>Продолжи маршрут с предыдущего открытого шага — после него появится этот урок.</p><Link href="/map" className="button button-dark">Найти открытый урок <span aria-hidden="true">→</span></Link></div></div> : result ? <div className="lesson-result-card"><span className={`lesson-result-seal${result.awarded ? " earned" : ""}`} aria-hidden="true">{result.awarded ? "✦" : "↻"}</span><span className="eyebrow">{result.awarded ? "НОВЫЙ ШАГ ПРОЙДЕН" : "ПОВТОРЕНИЕ ЗАВЕРШЕНО"}</span><h1>Отличная работа!</h1><p>{result.message}</p><div className="lesson-result-facts"><span>Всего XP <b>{progress.xp}</b></span><span>Уроков пройдено <b>{progress.completedLessons.length}</b></span></div><Link className="button button-dark" href="/map">Продолжить по карте <span aria-hidden="true">→</span></Link></div> : <>
      <div className="lesson-session-heading"><div><span className="eyebrow">{chapter.title}</span><h1>{lesson.title}</h1><p>{course.title} <span aria-hidden="true">·</span> {lesson.duration} <span aria-hidden="true">·</span> {XP_PER_LESSON} XP за первое прохождение</p></div><div className="lesson-progress-orb"><b>1</b><small>задание</small></div></div>
      <div className="lesson-question-card"><div className="lesson-instruction"><span aria-hidden="true">✧</span><span>Выбери один ответ. Если захочешь попробовать ещё раз, подсказка и объяснение останутся рядом.</span></div><span className="lesson-question-number">ВОПРОС 1 ИЗ 1</span><h2>{lesson.task.prompt}</h2><div className="lesson-answer-options" role="group" aria-label="Варианты ответа">{lesson.task.options.map((option, index) => <button type="button" key={option} className={`lesson-answer-option${answer === option ? " chosen" : ""}${checked && answer === option ? correct ? " answer-is-correct" : " answer-is-wrong" : ""}`} aria-pressed={answer === option} disabled={checked && correct} onClick={() => { setAnswer(option); setChecked(false); }}><span className="lesson-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{checked && answer === option && <span className="lesson-option-feedback" aria-hidden="true">{correct ? "✓" : "↻"}</span>}</button>)}</div>
        {checked && <div className={`lesson-answer-explanation${correct ? " explanation-correct" : " explanation-retry"}`} role="status"><b>{correct ? "Верно!" : "Попробуй ещё раз — ты справишься."}</b><p>{lesson.task.explanation}</p></div>}
        <div className="lesson-question-footer"><span>Награда начисляется только при первом завершении.</span>{checked && correct ? <button type="button" className="button button-dark" onClick={finish}>Завершить урок <span aria-hidden="true">→</span></button> : <button type="button" className="button button-dark" disabled={!answer} onClick={submitAnswer}>Проверить ответ <span aria-hidden="true">→</span></button>}</div>
      </div>
      {status === "completed" && <p className="lesson-repeat-note">Этот урок уже пройден. Повторение поможет закрепить материал, но не начислит XP повторно.</p>}
    </>}
  </section>;
}
