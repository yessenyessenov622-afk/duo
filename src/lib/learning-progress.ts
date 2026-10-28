import { ALL_COURSES_ID, courseLessonIds, findLearningLesson, learningCourses } from "@/src/data/learning-map";
import type { LearningProgress } from "@/src/types/learning";

export const PROGRESS_STORAGE_KEY = "kiraquest.progress.v1";

export function createInitialLearningProgress(): LearningProgress {
  return {
    version: 1,
    firstRunComplete: false,
    nickname: "Исследователь",
    selectedMascotId: "ren",
    selectedCourseId: learningCourses[0]?.id ?? "",
    startedCourses: [],
    interests: [],
    completedLessons: [],
    completedModules: [],
    claimedAchievements: [],
    repeatCompletions: 0,
    xp: 0,
    tokens: 0,
    totalAnswers: 0,
    correctAnswers: 0,
    activityDates: [],
    reviewTopics: [],
    lessonSession: null,
    settings: { theme: "light", reducedMotion: false },
  };
}

export function readLearningProgress(): { progress: LearningProgress; warning: string } {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return { progress: createInitialLearningProgress(), warning: "" };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Сохранение имеет неверный формат.");
    const stored = parsed as Partial<LearningProgress>;
    if (stored.version !== 1 || !Array.isArray(stored.completedLessons) || !Array.isArray(stored.startedCourses) || !Number.isFinite(stored.xp)) {
      throw new Error("Версия локального сохранения не поддерживается.");
    }
    const defaults = createInitialLearningProgress();
    // Preserve every recognized completion, including valid legacy completions after gaps.
    // The previous contiguous-prefix filter silently erased those saved IDs on read.
    const preservedCompleted = [...new Set(stored.completedLessons.filter((id): id is string => typeof id === "string" && Boolean(findLearningLesson(id))))];
    return {
      progress: {
        ...defaults,
        ...stored,
        completedLessons: preservedCompleted,
        startedCourses: stored.startedCourses.filter((id): id is string => typeof id === "string" && learningCourses.some((course) => course.id === id)),
        completedModules: Array.isArray(stored.completedModules) ? stored.completedModules.filter((id): id is string => typeof id === "string") : [],
        activityDates: Array.isArray(stored.activityDates) ? stored.activityDates.filter((id): id is string => typeof id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(id)) : [],
        claimedAchievements: Array.isArray(stored.claimedAchievements) ? stored.claimedAchievements.filter((id): id is string => typeof id === "string") : [],
        reviewTopics: Array.isArray(stored.reviewTopics) ? stored.reviewTopics.filter((id): id is string => typeof id === "string") : [],
        activeLessonId: typeof stored.activeLessonId === "string" && findLearningLesson(stored.activeLessonId) ? stored.activeLessonId : null,
        lastActivityAt: typeof stored.lastActivityAt === "number" && Number.isFinite(stored.lastActivityAt) ? stored.lastActivityAt : undefined,
        lastModuleCompletedAt: typeof stored.lastModuleCompletedAt === "number" && Number.isFinite(stored.lastModuleCompletedAt) ? stored.lastModuleCompletedAt : undefined,
        xp: Math.max(0, Math.floor(stored.xp ?? 0)),
        tokens: typeof stored.tokens === "number" && Number.isFinite(stored.tokens) ? Math.max(0, Math.floor(stored.tokens)) : 0,
        repeatCompletions: typeof stored.repeatCompletions === "number" && Number.isFinite(stored.repeatCompletions) ? Math.max(0, Math.floor(stored.repeatCompletions)) : 0,
        totalAnswers: typeof stored.totalAnswers === "number" && Number.isFinite(stored.totalAnswers) ? Math.max(0, Math.floor(stored.totalAnswers)) : 0,
        correctAnswers: typeof stored.correctAnswers === "number" && Number.isFinite(stored.correctAnswers) ? Math.max(0, Math.floor(stored.correctAnswers)) : 0,
        selectedCourseId: typeof stored.selectedCourseId === "string" && (learningCourses.some((course) => course.id === stored.selectedCourseId) || stored.selectedCourseId === ALL_COURSES_ID)
          ? stored.selectedCourseId
          : defaults.selectedCourseId,
      },
      warning: "",
    };
  } catch (error) {
    return {
      progress: createInitialLearningProgress(),
      warning: error instanceof Error ? error.message : "Не удалось прочитать локальный прогресс.",
    };
  }
}

export function writeLearningProgress(progress: LearningProgress) {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function streakFromActivity(dates: string[]) {
  const activeDates = new Set(dates);
  const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const cursor = activeDates.has(toKey(today)) ? today : yesterday;
  if (!activeDates.has(toKey(cursor))) return 0;
  let count = 0;
  while (activeDates.has(toKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function statusForLesson(courseId: string, lessonId: string, progress: LearningProgress) {
  const course = learningCourses.find((item) => item.id === courseId);
  if (!course) return "locked" as const;
  const lessonIds = courseLessonIds(course);
  if (progress.completedLessons.includes(lessonId)) return "completed" as const;
  const nextId = lessonIds.find((id) => !progress.completedLessons.includes(id));
  if (nextId !== lessonId) return "locked" as const;
  return progress.startedCourses.includes(courseId) ? "next" as const : "available" as const;
}

export function lessonsForCourse(courseId: string) {
  const course = learningCourses.find((item) => item.id === courseId);
  return course ? course.chapters.flatMap((chapter) => chapter.lessons) : [];
}
