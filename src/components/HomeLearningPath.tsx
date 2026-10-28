"use client";

import Link from "next/link";
import { learningCourses } from "@/src/data/learning-map";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import { FOCUS_COURSE_IDS } from "@/src/data/focus-courses";

export function HomeLearningPath() {
  const { progress, ready, selectCourse } = useLearningProgress();
  const { settings, ready: customizationReady } = useCustomization();
  const storedCourse = learningCourses.find((course) => course.id === progress.selectedCourseId);
  const preferred = storedCourse && (progress.startedCourses.includes(storedCourse.id) || progress.completedLessons.some((id) => storedCourse.chapters.some((chapter) => chapter.lessons.some((lesson) => lesson.id === id))))
    ? storedCourse
    : learningCourses[0];
  const orderedCourses = preferred ? [preferred, ...learningCourses.filter((course) => course.id !== preferred.id)] : learningCourses;
  const next = orderedCourses.map((course) => ({
    course,
    lessons: course.chapters.flatMap((chapter) => chapter.lessons),
  })).map((item) => ({ ...item, lesson: item.lessons.find((lesson) => !progress.completedLessons.includes(lesson.id)) }))
    .find((item) => item.lesson);

  if (!ready) return <section className="hero-panel home-hero home-learning-path home-path-loading" aria-label="Загрузка следующего урока"><div className="home-path-copy"><p>Готовим следующий шаг…</p></div>{customizationReady && <MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="home-path-mascot" state="rest" />}</section>;
  if (!progress.startedCourses.length && !progress.completedLessons.length) return <section className="focus-start" aria-labelledby="focus-start-title"><span className="eyebrow">НАЧНИ С ТОГО, ЧТО ТЕБЕ ИНТЕРЕСНО</span><h2 id="focus-start-title">Что ты хочешь изучать?</h2><p>Выбери направление и попробуй первый урок. Выбор можно изменить позже.</p><div className="focus-course-grid">{FOCUS_COURSE_IDS.map((id) => { const course = learningCourses.find((item) => item.id === id)!; const lesson = course.chapters[0].lessons[0]; return <article className="focus-course-card" key={id}><span className="focus-course-icon" aria-hidden="true">{course.icon}</span><h3>{course.title}</h3><p>{course.description}</p><Link className="button button-dark" href={`/lessons?lesson=${encodeURIComponent(lesson.id)}`} onClick={() => selectCourse(course.id)}>Начать первый урок <span aria-hidden="true">→</span></Link></article>; })}</div><Link href="/lessons" className="text-button">Посмотреть все направления →</Link></section>;
  if (!next?.lesson) return <section className="hero-panel home-hero home-learning-path"><div><span className="hero-kicker">ПРАКТИКА НА КАЖДЫЙ ДЕНЬ</span><h2>Все короткие маршруты пройдены</h2><p>Можно вернуться к любому направлению и повторить урок или выбрать новую тему.</p><Link href="/lessons" className="button button-dark">Открыть каталог уроков <span aria-hidden="true">→</span></Link></div><MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="home-path-mascot" state="celebrate" /></section>;

  const { course, lesson, lessons } = next;
  const completed = lessons.filter((item) => progress.completedLessons.includes(item.id)).length;
  const progressPercent = Math.round((completed / lessons.length) * 100);
  const hasStarted = progress.startedCourses.includes(course.id) || completed > 0;
  const href = `/lessons?lesson=${encodeURIComponent(lesson.id)}`;
  return <section className="hero-panel home-hero home-learning-path" aria-labelledby="home-next-title">
    <div className="home-path-copy">
      <span className="hero-kicker">Твой следующий шаг</span>
      <p className="home-path-course">{course.category} · {course.title}</p>
      <h2 id="home-next-title">{lesson.title}</h2>
      <p>{lesson.skillOutcome ?? course.description}</p>
      <div className="home-path-progress" role="img" aria-label={`В направлении пройдено ${completed} из ${lessons.length} уроков`}><span><i style={{ width: `${progressPercent}%` }} /></span><small>{completed} из {lessons.length} уроков</small></div>
      <Link href={href} className="button button-dark">{hasStarted ? "Продолжить урок" : "Начать урок"}<span aria-hidden="true">→</span></Link>
    </div>
    <MascotAvatar id={settings.mascot.id} accessory={settings.mascot.accessory} className="home-path-mascot" state={hasStarted ? "progress" : "greet"} />
  </section>;
}
