import { ALL_COURSES_ID, learningCourses, TOKENS_PER_LESSON, XP_PER_LESSON } from "@/src/data/learning-map";
import { mascotPreviews } from "@/src/data/mascots";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/src/lib/customization";
import { createInitialLearningProgress } from "@/src/lib/learning-progress";
import type { AccountDataUpdate, AccountPreferences, GuestDataImport } from "@/src/types/account";
import type { CustomizationSettings } from "@/src/types/customization";
import type { LearningProgress } from "@/src/types/learning";

export class AccountDataValidationError extends Error {}

const lessonIds = new Set(learningCourses.flatMap((course) => course.chapters.flatMap((topic) => topic.lessons.map((lesson) => lesson.id))));
const courseIds = new Set(learningCourses.map((course) => course.id));
const mascotIds = new Set(mascotPreviews.map((mascot) => mascot.id));
const safeId = /^[a-zA-Z0-9._:-]{1,128}$/;
const MAX_COUNTER = 1_000_000_000;
const MAX_LIST_ITEMS = 10_000;

export function defaultAccountPreferences(): AccountPreferences {
  return { favoriteLooks: [], mapFilter: ALL_COURSES_ID, distractionFree: false };
}

function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AccountDataValidationError("Неверный формат данных.");
  return input as Record<string, unknown>;
}

function counter(value: unknown, fallback = 0): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > MAX_COUNTER) {
    throw new AccountDataValidationError("Счётчик прогресса имеет недопустимое значение.");
  }
  return value;
}

function ids(value: unknown, accepted?: Set<string>): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS || value.some((item) => typeof item !== "string" || !safeId.test(item))) {
    throw new AccountDataValidationError("Список прогресса имеет неверный формат или слишком велик.");
  }
  return [...new Set((value as string[]).filter((id) => !accepted || accepted.has(id)))];
}

function timestamp(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000 ? value : undefined;
}

/** Whitelist legacy learning fields; never persist arbitrary account IDs or secrets. */
export function normalizeAccountProgress(input: unknown): LearningProgress {
  const value = object(input);
  if (value.version !== 1 || !Array.isArray(value.completedLessons) || !Array.isArray(value.startedCourses)) {
    throw new AccountDataValidationError("Версия сохранения прогресса не поддерживается.");
  }
  const defaults = createInitialLearningProgress();
  const completedLessons = ids(value.completedLessons, lessonIds);
  const totalAnswers = counter(value.totalAnswers);
  const rawDates = value.activityDates ?? [];
  if (!Array.isArray(rawDates) || rawDates.length > MAX_LIST_ITEMS || rawDates.some((date) => typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new AccountDataValidationError("Список учебных дней имеет неверный формат.");
  }
  const activityDates = [...new Set((rawDates as string[]).filter((date) => {
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }))];
  const legacySession = value.lessonSession && typeof value.lessonSession === "object" && !Array.isArray(value.lessonSession)
    ? value.lessonSession as Record<string, unknown> : null;
  return {
    version: 1,
    firstRunComplete: value.firstRunComplete === true,
    nickname: typeof value.nickname === "string" && value.nickname.trim() ? value.nickname.trim().slice(0, 80) : defaults.nickname,
    selectedMascotId: typeof value.selectedMascotId === "string" && mascotIds.has(value.selectedMascotId) ? value.selectedMascotId : defaults.selectedMascotId,
    selectedCourseId: typeof value.selectedCourseId === "string" && (courseIds.has(value.selectedCourseId) || value.selectedCourseId === ALL_COURSES_ID) ? value.selectedCourseId : defaults.selectedCourseId,
    startedCourses: ids(value.startedCourses, courseIds),
    interests: Array.isArray(value.interests) ? value.interests.filter((item): item is string => typeof item === "string").slice(0, 30).map((item) => item.slice(0, 80)) : [],
    completedLessons,
    // Keep stable legacy module/achievement keys, including historical curricula.
    completedModules: ids(value.completedModules),
    claimedAchievements: ids(value.claimedAchievements),
    repeatCompletions: counter(value.repeatCompletions),
    xp: counter(value.xp),
    tokens: counter(value.tokens),
    totalAnswers,
    correctAnswers: Math.min(totalAnswers, counter(value.correctAnswers)),
    activityDates,
    reviewTopics: ids(value.reviewTopics),
    activeLessonId: typeof value.activeLessonId === "string" && lessonIds.has(value.activeLessonId) ? value.activeLessonId : null,
    lastActivityAt: timestamp(value.lastActivityAt),
    lastModuleCompletedAt: timestamp(value.lastModuleCompletedAt),
    lessonSession: legacySession && typeof legacySession.lessonId === "string" && lessonIds.has(legacySession.lessonId)
      ? { lessonId: legacySession.lessonId, step: Math.min(100, counter(legacySession.step)) } : null,
  };
}

export function normalizeAccountSettings(input: unknown): CustomizationSettings {
  const value = object(input);
  if (value.version !== undefined && (typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1 || value.version > DEFAULT_SETTINGS.version)) {
    throw new AccountDataValidationError("Версия оформления не поддерживается.");
  }
  // normalizeSettings returns an allowlisted shape and migrates all supported versions.
  return normalizeSettings(value);
}

export function normalizeAccountPreferences(input: unknown): AccountPreferences {
  const value = object(input);
  const favorites = value.favoriteLooks ?? [];
  if (!Array.isArray(favorites) || favorites.length > 12) throw new AccountDataValidationError("Можно сохранить не больше 12 избранных оформлений.");
  return {
    favoriteLooks: favorites.map((favorite) => {
      const look = object(favorite);
      if (typeof look.name !== "string" || !look.name.trim() || look.name.length > 80) throw new AccountDataValidationError("Название оформления должно содержать от 1 до 80 символов.");
      return { name: look.name.trim(), settings: normalizeAccountSettings(look.settings) };
    }),
    mapFilter: typeof value.mapFilter === "string" && courseIds.has(value.mapFilter) ? value.mapFilter : ALL_COURSES_ID,
    distractionFree: value.distractionFree === true,
  };
}

function union(a: string[], b: string[]) { return [...new Set([...a, ...b])]; }

/**
 * Historical saves contain aggregates, not answer events. Max is deliberately
 * conservative for those counters. Completion rewards are deduplicated by ID.
 */
export function mergeAccountProgress(currentInput: unknown, incomingInput: unknown): LearningProgress {
  const current = normalizeAccountProgress(currentInput);
  const incoming = normalizeAccountProgress(incomingInput);
  const completedLessons = union(current.completedLessons, incoming.completedLessons);
  const reward = (key: "xp" | "tokens", perLesson: number) => Math.min(MAX_COUNTER, Math.max(
    current[key], incoming[key],
    completedLessons.length * perLesson + Math.max(0, current[key] - current.completedLessons.length * perLesson, incoming[key] - incoming.completedLessons.length * perLesson),
  ));
  const completedModules = union(current.completedModules, incoming.completedModules);
  for (const course of learningCourses) {
    for (const topic of course.chapters) {
      if (topic.lessons.length && topic.lessons.every((lesson) => completedLessons.includes(lesson.id))) {
        const id = `${course.id}:${topic.id}`;
        if (!completedModules.includes(id)) completedModules.push(id);
      }
    }
  }
  return {
    ...current,
    ...incoming,
    firstRunComplete: current.firstRunComplete === true || incoming.firstRunComplete === true,
    completedLessons,
    completedModules,
    startedCourses: union(current.startedCourses, incoming.startedCourses),
    claimedAchievements: union(current.claimedAchievements as string[], incoming.claimedAchievements as string[]),
    reviewTopics: union(current.reviewTopics, incoming.reviewTopics),
    activityDates: union(current.activityDates, incoming.activityDates).sort(),
    xp: reward("xp", XP_PER_LESSON),
    tokens: reward("tokens", TOKENS_PER_LESSON),
    repeatCompletions: Math.max(current.repeatCompletions, incoming.repeatCompletions),
    totalAnswers: Math.max(current.totalAnswers, incoming.totalAnswers),
    correctAnswers: Math.max(current.correctAnswers, incoming.correctAnswers),
    lastActivityAt: Math.max(current.lastActivityAt ?? 0, incoming.lastActivityAt ?? 0) || undefined,
    lastModuleCompletedAt: Math.max(current.lastModuleCompletedAt ?? 0, incoming.lastModuleCompletedAt ?? 0) || undefined,
  };
}

export function parseAccountUpdate(input: unknown): AccountDataUpdate {
  const value = object(input);
  const revision = counter(value.revision);
  if (value.revision === undefined) throw new AccountDataValidationError("Нужна версия сохранения.");
  if (value.resetProgress !== undefined && typeof value.resetProgress !== "boolean") throw new AccountDataValidationError("Неверная команда сброса.");
  if (value.resetProgress === true && value.progress !== undefined) throw new AccountDataValidationError("Сброс и запись прогресса должны выполняться отдельно.");
  if (value.progress === undefined && value.settings === undefined && value.preferences === undefined && value.resetProgress !== true) throw new AccountDataValidationError("Нет изменений для сохранения.");
  return {
    revision,
    ...(value.progress !== undefined ? { progress: normalizeAccountProgress(value.progress) } : {}),
    ...(value.settings !== undefined ? { settings: normalizeAccountSettings(value.settings) } : {}),
    ...(value.preferences !== undefined ? { preferences: normalizeAccountPreferences(value.preferences) } : {}),
    ...(value.resetProgress === true ? { resetProgress: true } : {}),
  };
}

export function parseGuestImport(input: unknown): GuestDataImport {
  const value = object(input);
  if (typeof value.importId !== "string" || !/^[a-zA-Z0-9_-]{16,128}$/.test(value.importId)) throw new AccountDataValidationError("Не удалось определить гостевое сохранение.");
  if (typeof value.useGuestSettings !== "boolean") throw new AccountDataValidationError("Выбери, переносить ли гостевое оформление.");
  return {
    progress: normalizeAccountProgress(value.progress),
    settings: normalizeAccountSettings(value.settings),
    importId: value.importId,
    useGuestSettings: value.useGuestSettings,
    ...(value.preferences !== undefined ? { preferences: normalizeAccountPreferences(value.preferences) } : {}),
  };
}
