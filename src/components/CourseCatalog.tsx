"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { learningCourses } from "@/src/data/learning-map";
import { useLearningProgress } from "@/src/components/LearningProgressProvider";
import { useCustomization } from "@/src/components/CustomizationProvider";

export function CourseCatalog() {
  const { progress, ready } = useLearningProgress();
  const { settings } = useCustomization();
  return <section className="course-catalog" aria-label={settings.visualStyle === "retro-desktop" ? "Библиотека курсов" : "Каталог практических направлений"}>
    <header><span className="eyebrow">НАВЫКИ ДЛЯ ПОВСЕДНЕВНОЙ ЖИЗНИ</span><h2>Выбери направление</h2><p>Короткие уроки идут от простых решений к самостоятельному плану. Все денежные суммы в задачах учебные.</p></header>
    <div className="course-catalog-grid">
      {learningCourses.map((course) => {
        const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
        const completed = lessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
        const next = lessons.find((lesson) => !progress.completedLessons.includes(lesson.id));
        const percent = lessons.length ? Math.round(completed / lessons.length * 100) : 0;
        return <article className="course-catalog-card" key={course.id} style={{ "--course-accent": course.accent } as CSSProperties}>
          <span className="course-catalog-icon" aria-hidden="true">{course.icon}</span>
          <div><p className="eyebrow">{course.category}</p><h2>{course.title}</h2><p>{course.description}</p>
            <div className="course-catalog-meta"><span>{lessons.length} коротких уроков</span><span>{ready ? `${completed} пройдено` : "Загрузка прогресса"}</span></div>
            <div className="course-catalog-progress" role="img" aria-label={`${percent}% направления пройдено`}><i style={{ width: `${percent}%` }} /></div>
          </div>
          <Link href={`/lessons?lesson=${encodeURIComponent((next ?? lessons[0]).id)}`} className="button button-dark">{completed ? "Продолжить" : "Начать маршрут"}<span aria-hidden="true">→</span></Link>
        </article>;
      })}
    </div>
  </section>;
}
