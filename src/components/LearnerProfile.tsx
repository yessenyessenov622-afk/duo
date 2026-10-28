"use client";

import Link from "next/link";
import { learningCourses, findLearningLesson } from "@/src/data/learning-map";
import { useCustomization } from "@/src/components/CustomizationProvider";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { MascotAvatar } from "@/src/components/MascotAvatar";
import { mascotPreviews } from "@/src/data/mascots";
import { useAccount } from "@/src/components/AccountProvider";

export function LearnerProfile() {
  const { user } = useAccount();
  const { settings } = useCustomization();
  const { progress, ready } = useLearningProgress();
  const mascot = mascotPreviews.find((item) => item.id === settings.mascot.id) ?? mascotPreviews[0];
  const completed = progress.completedLessons.map(findLearningLesson).filter((match): match is NonNullable<ReturnType<typeof findLearningLesson>> => Boolean(match));
  return <div className="learner-profile">
    <section className="profile-banner profile-preview"><MascotAvatar id={mascot.id} accessory={settings.mascot.accessory} className="profile-mascot" state="rest"/><div className="profile-info"><span className="eyebrow">ЛОКАЛЬНЫЙ ПРОФИЛЬ</span><h2>Исследователь</h2><p>Твой спутник — {mascot.name}. Настрой его внешний вид или выбери другого в любой момент.</p><Link href="/mascots" className="button button-outline">Выбрать спутника</Link><Link href="/studio" className="text-button">Настроить вид →</Link></div></section>
    <section className="profile-stat-grid" aria-label="Результаты обучения"><article><span>Пройдено уроков</span><b>{ready ? progress.completedLessons.length : "—"}</b></article><article><span>Опыт</span><b>{ready ? progress.xp : "—"} XP</b></article><article><span>Учебные дни</span><b>{ready ? progress.activityDates.length : "—"}</b></article><article><span>Попытки ответов</span><b>{ready ? progress.totalAnswers : "—"}</b></article></section>
    <section className="profile-skills"><div><span className="eyebrow">НАВЫКИ</span><h2>Прогресс по направлениям</h2><p className="profile-skill-disclosure">Это статистика по выполненным учебным заданиям, а не официальная оценка квалификации или сертификат.</p></div>{learningCourses.map((course) => { const lessons = course.chapters.flatMap((chapter) => chapter.lessons); const done = lessons.filter((lesson) => progress.completedLessons.includes(lesson.id)); const count = done.length; const percent = lessons.length ? Math.round(count / lessons.length * 100) : 0; const outcomes = [...new Set(done.map((item) => item.skillOutcome).filter((value): value is string => Boolean(value)))]; return <div className="profile-skill-row" key={course.id}><div><b>{course.title}</b><span>{count} из {lessons.length} уроков</span>{outcomes.length > 0 && <small className="profile-skill-outcomes"><b>Практиковал:</b> {outcomes.slice(0, 2).join(" · ")}</small>}</div><div className="course-catalog-progress" role="img" aria-label={`${course.title}: ${percent}% пройденных уроков`}><i style={{ width: `${percent}%`, background: course.accent }} /></div></div>; })}</section>
    <section className="profile-history"><div><span className="eyebrow">ПРАКТИКА</span><h2>Пройденные уроки</h2></div>{completed.length ? <ul>{completed.map(({ course, lesson }) => <li key={lesson.id}><span><b>{lesson.title}</b><small>{course.title}</small></span><Link href={`/lessons?lesson=${encodeURIComponent(lesson.id)}`}>Повторить</Link></li>)}</ul> : <p>Здесь появятся уроки, когда ты завершишь первый маршрут. Начать можно без регистрации.</p>}</section>
    <p className="profile-local-note">{user ? "Прогресс привязан к твоему аккаунту и сохраняется на сервере." : "Гостевой прогресс хранится в этом браузере. Войди через Google, чтобы перенести его в аккаунт."}</p>
  </div>;
}
