import { achievements, courses, findLesson, flattenLessons } from './data.js';

export const STORAGE_KEY = 'kiraquest.progress.v1';
export const XP_PER_LESSON = 25;

export function createInitialProgress() {
  return {
    version: 1,
    firstRunComplete: false,
    nickname: 'Исследователь',
    selectedMascotId: 'miko',
    selectedCourseId: 'english-start',
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
    settings: { theme: 'light', reducedMotion: false }
  };
}

function isValidProgress(value) {
  return value && value.version === 1 && typeof value === 'object'
    && Array.isArray(value.completedLessons) && Array.isArray(value.startedCourses)
    && Number.isFinite(value.xp) && typeof value.selectedCourseId === 'string';
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { progress: createInitialProgress(), warning: '' };
    const parsed = JSON.parse(raw);
    if (!isValidProgress(parsed)) throw new Error('Формат сохранения отличается от текущей версии.');
    const defaults = createInitialProgress();
    const merged = { ...defaults, ...parsed, settings: { ...defaults.settings, ...(parsed.settings || {}) } };
    merged.completedLessons = merged.completedLessons.filter(id => !!findLesson(id));
    merged.startedCourses = merged.startedCourses.filter(id => courses.some(course => course.id === id));
    merged.selectedCourseId = courses.some(course => course.id === merged.selectedCourseId) ? merged.selectedCourseId : courses[0].id;
    merged.selectedMascotId = ['miko','ren','yuki','piko','kumo','tori'].includes(merged.selectedMascotId) ? merged.selectedMascotId : 'miko';
    return { progress: merged, warning: '' };
  } catch (error) {
    return { progress: createInitialProgress(), warning: `Не удалось прочитать сохранение: ${error.message} Начинаем с чистого профиля.` };
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return { ok: true, error: '' };
  } catch {
    return { ok: false, error: 'Браузер не разрешил сохранить данные. Проверь настройки хранилища сайта.' };
  }
}

export function getLevel(xp) {
  const level = Math.floor(Math.max(0, xp) / 100) + 1;
  return { level, current: Math.max(0, xp) % 100, needed: 100, remaining: 100 - (Math.max(0, xp) % 100) };
}

export function getCourseStats(course, progress) {
  const lessons = flattenLessons(course);
  const completed = lessons.filter(lesson => progress.completedLessons.includes(lesson.id)).length;
  return { total: lessons.length, completed, percent: lessons.length ? Math.round(completed / lessons.length * 100) : 0, nextLesson: lessons.find(lesson => !progress.completedLessons.includes(lesson.id)) || lessons[0] || null };
}

export function getNextLesson(course, progress) {
  const lessons = flattenLessons(course);
  return lessons.find(lesson => !progress.completedLessons.includes(lesson.id)) || lessons[lessons.length - 1] || null;
}

export function getUnlockedLessonIds(course, progress) {
  const lessons = flattenLessons(course);
  const next = lessons.find(lesson => !progress.completedLessons.includes(lesson.id));
  return new Set([...progress.completedLessons.filter(id => lessons.some(lesson => lesson.id === id)), next?.id].filter(Boolean));
}

export function getStreak(progress) {
  const dates = new Set(progress.activityDates || []);
  const today = new Date();
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  let cursor = dates.has(dayKey(today)) ? today : yesterday;
  if (!dates.has(dayKey(cursor))) return 0;
  let count = 0;
  while (dates.has(dayKey(cursor))) { count += 1; cursor = new Date(cursor); cursor.setDate(cursor.getDate() - 1); }
  return count;
}

export function updateAchievements(progress) {
  const newlyUnlocked = achievements.filter(item => !progress.claimedAchievements.includes(item.id) && item.condition(progress));
  progress.claimedAchievements.push(...newlyUnlocked.map(item => item.id));
  return newlyUnlocked;
}

export function completeLesson(progress, lessonId) {
  if (!findLesson(lessonId)) return { progress, awarded: false, achievements: [], levelUp: false };
  const isRepeat = progress.completedLessons.includes(lessonId);
  const previousLevel = getLevel(progress.xp).level;
  if (isRepeat) progress.repeatCompletions += 1;
  else {
    progress.completedLessons.push(lessonId);
    progress.xp += XP_PER_LESSON;
    progress.tokens += 5;
  }
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (!progress.activityDates.includes(date)) progress.activityDates.push(date);
  const { course, lesson } = findLesson(lessonId);
  const module = course.modules.find(item => item.id === lesson.moduleId);
  if (module && module.lessons.every(item => progress.completedLessons.includes(item.id))) {
    const completedModuleId = `${course.id}:${module.id}`;
    if (!progress.completedModules.includes(completedModuleId)) progress.completedModules.push(completedModuleId);
  }
  const unlocked = updateAchievements(progress);
  return { progress, awarded: !isRepeat, isRepeat, achievements: unlocked, levelUp: getLevel(progress.xp).level > previousLevel };
}

export function recordAnswer(progress, correct, topicId) {
  progress.totalAnswers += 1;
  if (correct) progress.correctAnswers += 1;
  else if (topicId && !progress.reviewTopics.includes(topicId)) progress.reviewTopics.push(topicId);
}
