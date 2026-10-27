"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_COURSES_ID, getLessonStatus, learningCourses } from "@/src/data/learning-map";
import { lessonsForCourse, streakFromActivity } from "@/src/lib/learning-progress";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import type { LearningChapter, LearningCourse, LearningLesson, LessonStatus } from "@/src/types/learning";

const MAP_FILTER_KEY = "kiraquest.map.course-filter.v1";
const STATUS_COPY: Record<LessonStatus, { label: string; icon: string }> = {
  completed: { label: "Завершён", icon: "✓" }, next: { label: "Следующий", icon: "→" },
  available: { label: "Можно начать", icon: "✦" }, locked: { label: "Закрыт", icon: "⌑" },
};

function CourseChapter({ course, chapter, completedIds, startedIds, onSelect, chapterIndex, companion }: {
  course: LearningCourse; chapter: LearningChapter; completedIds: string[]; startedIds: string[];
  onSelect: (course: LearningCourse, chapter: LearningChapter, lesson: LearningLesson, status: LessonStatus) => void; chapterIndex: number;
  companion?: { id: string; accessory: string };
}) {
  const completeCount = chapter.lessons.filter((lesson) => completedIds.includes(lesson.id)).length;
  const chapterComplete = completeCount === chapter.lessons.length;
  return <section className="journey-chapter" aria-labelledby={`chapter-${course.id}-${chapter.id}`}>
    <div className="journey-chapter-heading">
      <span className={`chapter-medallion chapter-medallion-${chapterIndex % 4}`} aria-hidden="true">{chapter.icon}</span>
      <div className="chapter-heading-copy"><div><span className="chapter-kicker">ГЛАВА {String(chapterIndex + 1).padStart(2, "0")}</span><span className={`chapter-status${chapterComplete ? " done" : ""}`}>{chapterComplete ? "✓ Глава пройдена" : `${completeCount} из ${chapter.lessons.length} уроков`}</span></div><h3 id={`chapter-${course.id}-${chapter.id}`}>{chapter.title}</h3><p>{chapter.description}</p></div>
      <span className="chapter-progress" aria-label={`Прогресс главы: ${completeCount} из ${chapter.lessons.length}`}><i style={{ width: `${(completeCount / chapter.lessons.length) * 100}%` }} /></span>
    </div>
    <div className="journey-path" aria-label={`Уроки главы «${chapter.title}»`}>
      {chapter.lessons.map((lesson, index) => {
        const status = getLessonStatus(course, lesson.id, completedIds, startedIds);
        const copy = STATUS_COPY[status];
        return <button type="button" key={lesson.id} className={`journey-node node-${status} node-position-${index % 2}`} onClick={() => onSelect(course, chapter, lesson, status)} aria-label={`${lesson.title}. Статус: ${copy.label}. ${lesson.duration}. Награда ${25} XP.`}>
          <span className="node-orbit"><span className="node-symbol" aria-hidden="true">{copy.icon}</span></span>
          <span className="node-copy"><b>{lesson.title}</b><small>{lesson.duration} <span aria-hidden="true">·</span> {copy.label}</small></span>
          {status === "next" && <span className="node-cta">Продолжить</span>}
          {status === "available" && <span className="node-cta">Начать</span>}
        </button>;
      })}
      {companion && <div className="map-path-companion" aria-hidden="true"><MascotAvatar id={companion.id} accessory={companion.accessory} className="map-path-mascot" state="greet" /></div>}
    </div>
  </section>;
}

export function LearningMap() {
  const { progress, warning, resetProgress } = useLearningProgress();
  const { settings } = useCustomization();
  const [filterId, setFilterId] = useState<string>(ALL_COURSES_ID);
  const [selected, setSelected] = useState<{ course: LearningCourse; chapter: LearningChapter; lesson: LearningLesson; status: LessonStatus } | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const savedFilter = window.localStorage.getItem(MAP_FILTER_KEY);
      if (savedFilter && (savedFilter === ALL_COURSES_ID || learningCourses.some((course) => course.id === savedFilter))) setFilterId(savedFilter);
    } catch { /* Filtering still works in memory if storage is unavailable. */ }
  }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!selected || !dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [selected]);
  const shownCourses = filterId === ALL_COURSES_ID ? learningCourses : learningCourses.filter((course) => course.id === filterId);
  const visibleLessons = shownCourses.flatMap((course) => lessonsForCourse(course.id));
  const completedCount = visibleLessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
  const nextLesson = useMemo(() => {
    const currentCourse = learningCourses.find((course) => course.id === progress.selectedCourseId);
    const preferred = currentCourse && shownCourses.some((course) => course.id === currentCourse.id) ? [currentCourse, ...shownCourses.filter((course) => course.id !== currentCourse.id)] : shownCourses;
    for (const course of preferred) {
      const lesson = lessonsForCourse(course.id).find((item) => !progress.completedLessons.includes(item.id));
      if (lesson) return { course, lesson };
    }
    return null;
  }, [progress.completedLessons, progress.selectedCourseId, shownCourses]);
  const mascot = settings.mascot.id;
  const hintLesson = nextLesson?.lesson ?? visibleLessons.find((lesson) => progress.completedLessons.includes(lesson.id));
  const hintText = nextLesson ? `Твой следующий шаг — «${nextLesson.lesson.title}». Один короткий урок поможет открыть следующий узел маршрута.` : hintLesson ? "Ты прошёл все уроки выбранного пути. Можно повторить любой узел или выбрать другое направление." : "Выбери направление и начни с первого короткого урока — дальше путь будет открываться по шагам.";
  const progressPercent = visibleLessons.length ? Math.round((completedCount / visibleLessons.length) * 100) : 0;
  const streak = streakFromActivity(progress.activityDates);

  const chooseFilter = (value: string) => {
    setFilterId(value);
    try { window.localStorage.setItem(MAP_FILTER_KEY, value); } catch { /* Keep current filter in memory. */ }
  };
  const openLesson = (course: LearningCourse, chapter: LearningChapter, lesson: LearningLesson, status: LessonStatus) => {
    setSelected({ course, chapter, lesson, status });
  };
  const handleReset = () => {
    if (!window.confirm("Сбросить локальный учебный прогресс и демонаграды? Настройки темы и маскота останутся.")) return;
    resetProgress();
  };
  const startHref = nextLesson ? `/lessons?lesson=${encodeURIComponent(nextLesson.lesson.id)}` : null;

  return <div className="learning-map-page">
    <section className="map-overview">
      <div className="map-overview-copy"><span className="eyebrow">ТВОЁ ПРИКЛЮЧЕНИЕ</span><h2>Исследуй. Учись. Открывай.</h2><p>Выбирай маршрут и проходи короткие уроки в своём темпе.</p><div className="map-overview-actions">
        {startHref ? <Link href={startHref} className="button button-dark map-continue">{completedCount ? "Продолжить обучение" : "Начать первое приключение"}<span aria-hidden="true">→</span></Link> : <span className="map-finished-note">Ты прошёл все уроки этого направления. Можно вернуться и повторить любой.</span>}
        <button type="button" className="button button-outline map-hint-trigger" aria-expanded={hintOpen} onClick={() => setHintOpen((value) => !value)}>✦ Подсказка</button>
      </div>{hintOpen && <p className="map-hint" role="status">{hintText}</p>}</div>
      <div className="map-stats" aria-label="Демо-прогресс">
        <div className="map-stat map-stat-progress"><span>Путь пройден</span><b>{progressPercent}<small>%</small></b><span className="map-meter"><i style={{ width: `${progressPercent}%` }}/></span></div>
        <div className="map-stat"><span>Уроки</span><b>{completedCount}<small> / {visibleLessons.length}</small></b></div>
        <div className="map-stat"><span>Опыт</span><b>{progress.xp}<small> XP</small></b></div>
        <div className="map-stat"><span>Серия</span><b>{streak}<small> {streak === 1 ? "день" : "дней"}</small></b></div>
      </div>
      <div className="map-filter-row"><label htmlFor="course-filter">Маршрут</label><select id="course-filter" value={filterId} onChange={(event) => chooseFilter(event.target.value)}><option value={ALL_COURSES_ID}>Все направления</option>{learningCourses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select><span className="map-demo-tag"><i aria-hidden="true"/>Демо · прогресс хранится локально</span></div>
    </section>

    {warning && <p className="map-warning" role="alert">{warning} После сброса повреждённого сохранения можно начать заново.</p>}
      <div className="map-content-heading"><div><span className="eyebrow">ТВОИ УЧЕБНЫЕ МИРЫ</span><h2>Выбери следующий островок</h2></div><span>{shownCourses.reduce((count, course) => count + course.chapters.length, 0)} главы <i aria-hidden="true">·</i> {visibleLessons.length} коротких уроков</span></div>
      <div className="map-legend" aria-label="Легенда статусов"><span><i className="legend-complete">✓</i>Завершён</span><span><i className="legend-next">→</i>Следующий</span><span><i className="legend-available">✦</i>Можно начать</span><span><i className="legend-locked">⌑</i>Закрыт</span></div>
      <div className="map-course-groups">{shownCourses.map((course) => {
        const courseLessons = lessonsForCourse(course.id);
        const courseCompleted = courseLessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
        return <section className="map-course-world" key={course.id} style={{ "--course-accent": course.accent } as React.CSSProperties}>
          <header className="map-world-heading"><span className="world-course-icon" aria-hidden="true">{course.icon}</span><div><span className="world-category">{course.category.toUpperCase()} · {courseCompleted} ИЗ {courseLessons.length} УРОКОВ</span><h2>{course.title}</h2><p>{course.description}</p></div><div className="world-completion" aria-label={`Завершено ${courseCompleted} из ${courseLessons.length} уроков`}><span>{Math.round((courseCompleted / courseLessons.length) * 100)}%</span><i><b style={{ width: `${(courseCompleted / courseLessons.length) * 100}%` }}/></i></div></header>
          <div className="world-chapters">{course.chapters.map((chapter, index) => <CourseChapter key={chapter.id} course={course} chapter={chapter} chapterIndex={index} completedIds={progress.completedLessons} startedIds={progress.startedCourses} onSelect={openLesson} companion={course.id === shownCourses[0]?.id && index === 0 ? { id: mascot, accessory: settings.mascot.accessory } : undefined} />)}</div>
        </section>;
      })}</div>
      <section className="map-footer-tools"><div className="map-reward-card"><span className="map-reward-icon" aria-hidden="true">✦</span><div><span className="eyebrow">НАГРАДА ГЛАВЫ</span><b>Каждый урок приносит {25} XP</b><small>Заверши все уроки главы — она появится в твоих достижениях.</small></div></div><button type="button" className="map-reset-button" onClick={handleReset}>Сбросить демо-прогресс</button></section>

    <dialog ref={dialogRef} className="lesson-detail-dialog" aria-labelledby="lesson-dialog-title" onCancel={(event) => { event.preventDefault(); setSelected(null); }} onClose={() => setSelected(null)}>
      {selected && <div className="lesson-detail-content"><button type="button" className="lesson-dialog-close" aria-label="Закрыть карточку урока" onClick={() => dialogRef.current?.close()}>×</button><div className={`lesson-dialog-mark detail-${selected.status}`} aria-hidden="true">{STATUS_COPY[selected.status].icon}</div><span className="eyebrow">{selected.course.title} · {selected.chapter.title}</span><h2 id="lesson-dialog-title">{selected.lesson.title}</h2><p>{selected.status === "locked" ? `Этот узел пока закрыт. Сначала пройди «${lessonsForCourse(selected.course.id).find((lesson) => !progress.completedLessons.includes(lesson.id))?.title ?? "предыдущий урок"}».` : selected.status === "completed" ? "Урок уже пройден. Его можно повторить — повтор не начисляет XP второй раз." : "Короткое демо-задание поможет закрепить тему и открыть следующий шаг."}</p><div className="lesson-dialog-facts"><span>◷ {selected.lesson.duration}</span><span>✦ {25} XP за первое прохождение</span></div>{selected.status !== "locked" ? <Link className="button button-dark" href={`/lessons?lesson=${encodeURIComponent(selected.lesson.id)}`} onClick={() => dialogRef.current?.close()}>{selected.status === "completed" ? "Повторить урок" : "Начать урок"}<span aria-hidden="true">→</span></Link> : <button type="button" className="button button-outline" onClick={() => dialogRef.current?.close()}>Понятно</button>}</div>}
    </dialog>
  </div>;
}
