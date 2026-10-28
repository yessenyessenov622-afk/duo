import type { LearningCourse, LearningProgress } from "@/src/types/learning";
import { technicalCourses } from "@/src/data/technical-courses";

// Демо-задания отражают темы и идентификаторы уроков существующего vanilla-каталога.
export const learningCourses: LearningCourse[] = [
  {
    id: "english-start", title: "Английский без страха", category: "Языки", icon: "Aa", accent: "#765bd4",
    description: "Первые фразы, полезные слова и уверенность в разговоре.", chapters: [
      { id: "hello", title: "Привет, мир!", description: "Знакомимся и учимся вежливо общаться.", icon: "✧", lessons: [
        { id: "hello-1", title: "Знакомимся", duration: "4 мин", task: { prompt: "Как по-английски сказать «Привет»?", options: ["Goodbye", "Hello", "Please"], answer: "Hello", explanation: "Hello — универсальное приветствие для начала разговора." } },
        { id: "hello-2", title: "Вежливые слова", duration: "5 мин", task: { prompt: "Что означает «Please»?", options: ["Пожалуйста (просьба)", "Пока", "Извините"], answer: "Пожалуйста (просьба)", explanation: "Please добавляют к просьбе, чтобы она звучала вежливо." } },
      ] },
      { id: "first-words", title: "Первые слова", description: "Запоминаем слова, которые встречаются каждый день.", icon: "✿", lessons: [
        { id: "words-1", title: "Вещи вокруг нас", duration: "4 мин", task: { prompt: "Как переводится «book»?", options: ["Стол", "Книга", "Дверь"], answer: "Книга", explanation: "Book означает «книга»." } },
        { id: "words-2", title: "Цвета и предметы", duration: "4 мин", task: { prompt: "Что означает слово «blue»?", options: ["Зелёный", "Синий", "Красный"], answer: "Синий", explanation: "Blue — синий или голубой цвет." } },
      ] },
    ],
  },
  {
    id: "web-start", title: "Веб-разработка с нуля", category: "Технологии", icon: "</>", accent: "#278675",
    description: "Разберись, как устроены страницы, и создай свой первый сайт.", chapters: [
      { id: "web-foundation", title: "Как устроен веб", description: "Знакомимся со структурой и оформлением страниц.", icon: "⌘", lessons: [
        { id: "web-1", title: "Из чего состоит страница", duration: "5 мин", task: { prompt: "Какой язык задаёт структуру веб-страницы?", options: ["CSS", "HTML", "PNG"], answer: "HTML", explanation: "HTML задаёт структуру: заголовки, абзацы, ссылки и изображения." } },
        { id: "web-2", title: "Первый заголовок", duration: "4 мин", task: { prompt: "Какой тег создаёт основной заголовок?", options: ["<h1>", "<p>", "<img>"], answer: "<h1>", explanation: "Тег h1 обозначает главный заголовок страницы." } },
      ] },
      { id: "first-page", title: "Собираем страницу", description: "Добавляем знакомые элементы и стили.", icon: "✦", lessons: [
        { id: "web-3", title: "Ссылки и изображения", duration: "6 мин", task: { prompt: "Какой тег создаёт ссылку?", options: ["<a>", "<div>", "<h2>"], answer: "<a>", explanation: "Тег a создаёт ссылку, а её адрес задаётся через href." } },
        { id: "web-4", title: "Добавляем стили", duration: "5 мин", task: { prompt: "Какое CSS-свойство меняет цвет текста?", options: ["color", "size", "font"], answer: "color", explanation: "CSS-свойство color задаёт цвет текста." } },
      ] },
    ],
  },
  {
    id: "math-start", title: "Математика в жизни", category: "Математика", icon: "+", accent: "#c48527",
    description: "Тренируй счёт и находи математику в повседневных задачах.", chapters: [
      { id: "numbers", title: "Считаем уверенно", description: "Решаем небольшие задачи на счёт.", icon: "◈", lessons: [
        { id: "math-1", title: "Складываем вместе", duration: "4 мин", task: { prompt: "Сколько будет 7 + 5?", options: ["11", "12", "13"], answer: "12", explanation: "Если к 7 прибавить ещё 5, получится 12." } },
        { id: "math-2", title: "Считаем в уме", duration: "4 мин", task: { prompt: "Сколько будет 9 + 6?", options: ["14", "15", "16"], answer: "15", explanation: "9 + 6 = 15. Можно сначала дополнить 9 до 10." } },
      ] },
      { id: "patterns", title: "Замечаем закономерности", description: "Ищем правила в числах и повседневной логике.", icon: "⌁", lessons: [
        { id: "math-3", title: "Продолжи ряд", duration: "4 мин", task: { prompt: "Какое число продолжит ряд: 2, 4, 6, …?", options: ["7", "8", "10"], answer: "8", explanation: "Каждый раз прибавляем 2, поэтому после 6 идёт 8." } },
        { id: "math-4", title: "Логика на каждый день", duration: "5 мин", task: { prompt: "Все чашки стоят на полке. Синяя чашка — одна из них. Где она?", options: ["На полке", "Под столом", "Мы не знаем"], answer: "На полке", explanation: "Синяя чашка входит в множество чашек на полке." } },
      ] },
    ],
  },
  {
    id: "coding-start", title: "Логика и программирование", category: "Технологии", icon: "{}", accent: "#bf5d71",
    description: "Первые алгоритмы и понятные задачи для будущих разработчиков.", chapters: [
      { id: "logic", title: "Думать как программист", description: "Превращаем задачу в последовательность шагов.", icon: "↗", lessons: [
        { id: "code-1", title: "Последовательность действий", duration: "5 мин", task: { prompt: "Что точнее всего описывает алгоритм?", options: ["Случайный набор слов", "Понятная последовательность шагов", "Цветная картинка"], answer: "Понятная последовательность шагов", explanation: "Алгоритм — это конечная последовательность шагов для решения задачи." } },
        { id: "code-2", title: "Шаг за шагом", duration: "4 мин", task: { prompt: "Что делает условие в алгоритме?", options: ["Выбирает путь в зависимости от ситуации", "Меняет цвет экрана", "Сохраняет все файлы"], answer: "Выбирает путь в зависимости от ситуации", explanation: "Условие помогает выполнить один из вариантов действий в зависимости от ответа." } },
      ] },
      { id: "first-program", title: "Первая программа", description: "Проверяем команды и учимся разбираться с ошибками.", icon: "⌘", lessons: [
        { id: "code-3", title: "Команды и результат", duration: "5 мин", task: { prompt: "Как называют отдельное указание компьютеру?", options: ["Команда", "Обложка", "Палитра"], answer: "Команда", explanation: "Команда — отдельное указание, которое выполняет программа." } },
        { id: "code-4", title: "Проверяем решение", duration: "4 мин", task: { prompt: "Зачем проверять программу после изменений?", options: ["Убедиться, что она работает ожидаемо", "Изменить её название", "Скрыть команды"], answer: "Убедиться, что она работает ожидаемо", explanation: "Проверка помогает понять, приводит ли программа к нужному результату." } },
      ] },
    ],
  },
];

// Existing course and lesson IDs remain unchanged so saved progress remains valid.
learningCourses.push(...technicalCourses);

export const ALL_COURSES_ID = "all-courses";
export const XP_PER_LESSON = 25;
export const TOKENS_PER_LESSON = 5;

export function findLearningLesson(lessonId: string) {
  for (const course of learningCourses) {
    for (const chapter of course.chapters) {
      const lesson = chapter.lessons.find((item) => item.id === lessonId);
      if (lesson) return { course, chapter, lesson };
    }
  }
  return null;
}

export function courseLessonIds(course: LearningCourse) {
  return course.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
}

export function getLessonStatus(course: LearningCourse, lessonId: string, completedIds: string[], startedCourseIds: string[]) {
  const lessonIds = courseLessonIds(course);
  if (completedIds.includes(lessonId)) return "completed" as const;
  const nextLessonId = lessonIds.find((id) => !completedIds.includes(id));
  if (lessonId !== nextLessonId) return "locked" as const;
  return startedCourseIds.includes(course.id) ? "next" as const : "available" as const;
}

export function getTopicStatus(course: LearningCourse, topicId: string, completedIds: string[], startedCourseIds: string[]) {
  const topic = course.chapters.find((item) => item.id === topicId);
  if (!topic) return "locked" as const;
  if (topic.lessons.every((lesson) => completedIds.includes(lesson.id))) return "completed" as const;
  const nextTopic = course.chapters.find((item) => !item.lessons.every((lesson) => completedIds.includes(lesson.id)));
  if (nextTopic?.id !== topicId) return "locked" as const;
  return startedCourseIds.includes(course.id) || completedIds.some((id) => courseLessonIds(course).includes(id)) ? "next" as const : "available" as const;
}

export function topicProgress(topic: LearningCourse["chapters"][number], completedIds: string[]) {
  const complete = topic.lessons.filter((lesson) => completedIds.includes(lesson.id)).length;
  return { complete, total: topic.lessons.length, done: complete === topic.lessons.length };
}

export function completeLearningLesson(progress: LearningProgress, lessonId: string, today: string) {
  const match = findLearningLesson(lessonId);
  if (!match || getLessonStatus(match.course, lessonId, progress.completedLessons, progress.startedCourses) === "locked") return null;
  const repeated = progress.completedLessons.includes(lessonId);
  const chapterComplete = match.chapter.lessons.every((lesson) => lesson.id === lessonId || progress.completedLessons.includes(lesson.id));
  return {
    awarded: !repeated,
    progress: {
      ...progress,
      selectedCourseId: match.course.id,
      startedCourses: progress.startedCourses.includes(match.course.id) ? progress.startedCourses : [...progress.startedCourses, match.course.id],
      completedLessons: repeated ? progress.completedLessons : [...progress.completedLessons, lessonId],
      completedModules: chapterComplete ? [...new Set([...progress.completedModules, `${match.course.id}:${match.chapter.id}`])] : progress.completedModules,
      xp: progress.xp + (repeated ? 0 : XP_PER_LESSON),
      tokens: progress.tokens + (repeated ? 0 : TOKENS_PER_LESSON),
      repeatCompletions: progress.repeatCompletions + (repeated ? 1 : 0),
      activityDates: progress.activityDates.includes(today) ? progress.activityDates : [...progress.activityDates, today],
    },
  };
}
