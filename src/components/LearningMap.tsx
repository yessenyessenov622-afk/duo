"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_COURSES_ID, getLessonStatus, getTopicStatus, learningCourses, topicProgress } from "@/src/data/learning-map";
import { lessonsForCourse, streakFromActivity } from "@/src/lib/learning-progress";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useAccount } from "@/src/components/AccountProvider";
import type { LearningChapter, LearningCourse, LessonStatus } from "@/src/types/learning";
import { englishRoadmap } from "@/src/data/english-roadmap";
import { lifeSkillsFuture } from "@/src/data/life-skills";

const STATUS_COPY: Record<LessonStatus, { label: string; icon: string }> = {
  completed: { label: "Завершён", icon: "✓" }, next: { label: "Следующий", icon: "→" },
  available: { label: "Можно начать", icon: "✦" }, locked: { label: "Закрыт", icon: "⌑" },
};

function CourseChapter({ course, chapter, completedIds, startedIds, onSelect }: {
  course: LearningCourse; chapter: LearningChapter; completedIds: string[]; startedIds: string[];
  onSelect: (course: LearningCourse, chapter: LearningChapter, status: LessonStatus) => void;
}) {
  const { complete: completeCount, total } = topicProgress(chapter, completedIds);
  const status = getTopicStatus(course, chapter.id, completedIds, startedIds);
  const statusLabel = status === "completed" ? "Завершена" : status === "next" ? "Продолжить" : status === "available" ? "Начать" : "Сначала пройди предыдущую тему";
  return <section className="journey-chapter" aria-label={`Тема ${chapter.title}`}>
    <div className="journey-path" aria-label={`Тема «${chapter.title}»`}>
      <button type="button" className={`journey-node topic-node node-${status}`} style={{ "--topic-progress": `${Math.round((completeCount / total) * 100)}%` } as React.CSSProperties} onClick={() => onSelect(course, chapter, status)} aria-label={`${chapter.title}. ${statusLabel}. Пройдено ${completeCount} из ${total} уроков.`}>
        <span className="node-orbit"><span className="node-symbol" aria-hidden="true">{status === "completed" ? "✓" : chapter.icon}</span><svg className="pixel-level-icon" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true"><path d={status === "locked" ? "M4 6V3h2V1h4v2h2v3h2v9H2V6h2zm2 0h4V3H6v3zm1 3v3h2V9H7z" : status === "completed" ? "M1 7h3v2h2v2h1V9h2V7h2V5h2V3h2v4h-2v2h-2v2H9v2H5v-2H3V9H1z" : "M7 1h2v3h3v2h3v4h-3v2H9v3H7v-3H4v-2H1V6h3V4h3z"} fill="currentColor" fillRule="evenodd" /></svg></span>
        <span className="node-copy"><b>{chapter.title}</b><small>{completeCount} из {total} уроков · {statusLabel}</small></span>
        {status === "next" && <span className="node-cta">Продолжить</span>}
        {status === "available" && <span className="node-cta">Начать</span>}
      </button>
    </div>
    <p className="topic-description">{chapter.description}</p>
  </section>;
}

export function LearningMap() {
  const account = useAccount();
  const { progress, warning, resetProgress } = useLearningProgress();
  const filterId = account.data.preferences.mapFilter;
  const [selected, setSelected] = useState<{ course: LearningCourse; chapter: LearningChapter; status: LessonStatus } | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
  const hintLesson = nextLesson?.lesson ?? visibleLessons.find((lesson) => progress.completedLessons.includes(lesson.id));
  const hintText = nextLesson ? `Твой следующий шаг — «${nextLesson.lesson.title}». Один короткий урок поможет открыть следующий узел маршрута.` : hintLesson ? "Ты прошёл все доступные уроки выбранного пути. Продолжение некоторых направлений ещё готовится; можно повторить урок или выбрать другую тему." : "Выбери направление и начни с первого короткого урока — дальше путь будет открываться по шагам.";
  const progressPercent = visibleLessons.length ? Math.round((completedCount / visibleLessons.length) * 100) : 0;
  const streak = streakFromActivity(progress.activityDates);

  const chooseFilter = (value: string) => {
    account.update({ preferences: { ...account.data.preferences, mapFilter: value } });
  };
  const openTopic = (course: LearningCourse, chapter: LearningChapter, status: LessonStatus) => {
    setSelected({ course, chapter, status });
  };
  const handleReset = () => {
    if (!window.confirm(account.user ? "Сбросить учебный прогресс и награды этого аккаунта на сервере?" : "Сбросить гостевой учебный прогресс и награды этого браузера?")) return;
    resetProgress();
  };
  const startHref = nextLesson ? `/lessons?lesson=${encodeURIComponent(nextLesson.lesson.id)}` : null;

  return <div className="learning-map-page">
    <section className="map-overview">
      <div className="map-overview-copy"><span className="eyebrow">ТВОЁ ПРИКЛЮЧЕНИЕ</span><h2>Исследуй. Учись. Открывай.</h2><p>Выбирай маршрут и проходи короткие уроки в своём темпе.</p><div className="map-overview-actions">
        {startHref ? <Link href={startHref} className="button button-dark map-continue">{completedCount ? "Продолжить обучение" : "Начать первое приключение"}<span aria-hidden="true">→</span></Link> : <span className="map-finished-note">Ты прошёл все доступные уроки этого направления. Новые материалы могут появиться позже.</span>}
        <button type="button" className="button button-outline map-hint-trigger" aria-expanded={hintOpen} onClick={() => setHintOpen((value) => !value)}>✦ Подсказка</button>
      </div>{hintOpen && <p className="map-hint" role="status">{hintText}</p>}</div>
      <div className="map-stats" aria-label="Демо-прогресс">
        <div className="map-stat map-stat-progress"><span>Готовые уроки</span><b>{progressPercent}<small>%</small></b><span className="map-meter"><i style={{ width: `${progressPercent}%` }}/></span></div>
        <div className="map-stat"><span>Уроки</span><b>{completedCount}<small> / {visibleLessons.length}</small></b></div>
        <div className="map-stat"><span>Опыт</span><b>{progress.xp}<small> XP</small></b></div>
        <div className="map-stat"><span>Серия</span><b>{streak}<small> {streak === 1 ? "день" : "дней"}</small></b></div>
      </div>
      <div className="map-filter-row"><label htmlFor="course-filter">Маршрут</label><select id="course-filter" value={filterId} onChange={(event) => chooseFilter(event.target.value)}><option value={ALL_COURSES_ID}>Все направления</option>{learningCourses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select><span className="map-demo-tag"><i aria-hidden="true"/>Демо · прогресс хранится локально</span></div>
    </section>

    {warning && <p className="map-warning" role="alert">{warning} После сброса повреждённого сохранения можно начать заново.</p>}
      <div className="map-content-heading"><div><span className="eyebrow">ТВОИ УЧЕБНЫЕ МИРЫ</span><h2>Выбери следующую тему</h2></div><span>{shownCourses.reduce((count, course) => count + course.chapters.length, 0)} тем <i aria-hidden="true">·</i> {visibleLessons.length} коротких уроков</span></div>
      <div className="map-legend" aria-label="Легенда статусов"><span><i className="legend-complete">✓</i>Завершён</span><span><i className="legend-next">→</i>Следующий</span><span><i className="legend-available">✦</i>Можно начать</span><span><i className="legend-locked">⌑</i>Закрыт</span></div>
      <div className="map-course-groups">{shownCourses.map((course) => {
        const courseLessons = lessonsForCourse(course.id);
        const courseCompleted = courseLessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
        return <section className="map-course-world" key={course.id} style={{ "--course-accent": course.accent } as React.CSSProperties}>
          <header className="map-world-heading"><span className="world-course-icon" aria-hidden="true">{course.icon}</span><div><span className="world-category">{course.category.toUpperCase()} · {courseCompleted} ИЗ {courseLessons.length} ГОТОВЫХ УРОКОВ</span><h2>{course.title}</h2><p>{course.description}</p>{course.id === "english-start" && <p>Доступны первые темы A1 и A2. Продолжение курса в разработке; процент относится только к готовым урокам. Уровни — ориентир, не сертификат CEFR.</p>}</div><div className="world-completion" aria-label={`Завершено ${courseCompleted} из ${courseLessons.length} готовых уроков`}><span>{Math.round((courseCompleted / courseLessons.length) * 100)}%</span><i><b style={{ width: `${(courseCompleted / courseLessons.length) * 100}%` }}/></i></div></header>
          {(course.levels?.length ? course.levels : [{ id: "legacy-level-1", number: 1 as const, title: course.id === "english-start" ? "A1 · Первые шаги" : "Маршрут курса", description: course.id === "english-start" ? "Это начальная часть A1; остальные темы готовятся." : "Продолжай темы по порядку.", topicIds: course.chapters.map((topic) => topic.id) }]).map((level) => {
            const topics = level.topicIds.map((id) => course.chapters.find((topic) => topic.id === id)).filter((topic): topic is LearningChapter => Boolean(topic));
            const levelDone = topics.length > 0 && topics.every((topic) => topic.lessons.every((lesson) => progress.completedLessons.includes(lesson.id)));
            return <section className="map-course-level" key={level.id} aria-label={`Уровень ${level.number}: ${level.title}`}><header><span>УРОВЕНЬ {level.number}</span><h3>{level.title}</h3><p>{level.description}</p><small>{levelDone ? (course.id === "english-start" ? "✓ Готовые темы пройдены" : "✓ Уровень завершён") : `${topics.filter((topic) => topic.lessons.every((lesson) => progress.completedLessons.includes(lesson.id))).length} из ${topics.length} тем`}</small></header><div className="world-chapters">{topics.map((chapter) => <CourseChapter key={chapter.id} course={course} chapter={chapter} completedIds={progress.completedLessons} startedIds={progress.startedCourses} onSelect={openTopic} />)}</div></section>;
          })}
          {course.id === "english-start" && englishRoadmap.slice(2).map((item) => <section className="map-course-level" key={item.level} aria-label={`${item.level}: в разработке`}><header><span>В РАЗРАБОТКЕ</span><h3>{item.level} · {item.title}</h3><p>{item.topics}</p><small>Будущий этап</small></header></section>)}
          {lifeSkillsFuture[course.id] && <section className="map-course-level"><header><span>В РАЗРАБОТКЕ</span><h3>Следующие темы</h3><p>{lifeSkillsFuture[course.id]}</p><small>Будущий этап</small></header></section>}
        </section>;
      })}</div>
      <section className="map-footer-tools"><div className="map-reward-card"><span className="map-reward-icon" aria-hidden="true">✦</span><div><span className="eyebrow">НАГРАДА ТЕМЫ</span><b>Каждый урок приносит {25} XP</b><small>Тема завершена, когда пройдены все её уроки.</small></div></div><button type="button" className="map-reset-button" onClick={handleReset}>Сбросить демо-прогресс</button></section>

    <dialog ref={dialogRef} className="lesson-detail-dialog" aria-labelledby="lesson-dialog-title" onCancel={(event) => { event.preventDefault(); setSelected(null); }} onClose={() => setSelected(null)}>
      {selected && <div className="lesson-detail-content"><button type="button" className="lesson-dialog-close" aria-label="Закрыть карточку темы" onClick={() => dialogRef.current?.close()}>×</button><div className={`lesson-dialog-mark detail-${selected.status}`} aria-hidden="true">{STATUS_COPY[selected.status].icon}</div><span className="eyebrow">{selected.course.title} · ТЕМА</span><h2 id="lesson-dialog-title">{selected.chapter.title}</h2><p>{selected.status === "locked" ? "Сначала пройди предыдущую тему, чтобы открыть этот узел." : selected.chapter.description}</p><div className="lesson-dialog-facts"><span>{topicProgress(selected.chapter, progress.completedLessons).complete} из {selected.chapter.lessons.length} уроков темы</span><span>{selected.status === "completed" ? "Тема завершена" : selected.status === "next" ? "Продолжить тему" : selected.status === "available" ? "Начать тему" : "Тема закрыта"}</span></div><ol className="topic-lesson-list">{selected.chapter.lessons.map((lesson) => { const lessonStatus = getLessonStatus(selected.course, lesson.id, progress.completedLessons, progress.startedCourses); const canOpen = selected.status !== "locked" && (lessonStatus !== "locked" || selected.status === "completed"); return <li key={lesson.id}><span><b>{lesson.title}</b><small>{lesson.duration} · {progress.completedLessons.includes(lesson.id) ? "Завершён" : lessonStatus === "locked" ? "Сначала предыдущий урок" : "Доступен"}</small></span>{canOpen ? <Link className="button button-dark" href={`/lessons?lesson=${encodeURIComponent(lesson.id)}`} onClick={() => dialogRef.current?.close()}>{progress.completedLessons.includes(lesson.id) ? "Повторить" : "Начать"}<span aria-hidden="true">→</span></Link> : <span className="topic-lesson-locked" aria-label="Урок пока закрыт">🔒</span>}</li>; })}</ol></div>}
    </dialog>
  </div>;
}
