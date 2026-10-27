"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ALL_COURSES_ID, completeLearningLesson, findLearningLesson, learningCourses } from "@/src/data/learning-map";
import { createInitialLearningProgress, readLearningProgress, statusForLesson, writeLearningProgress } from "@/src/lib/learning-progress";
import type { LearningProgress } from "@/src/types/learning";

type ProgressContextValue = {
  progress: LearningProgress;
  ready: boolean;
  warning: string;
  selectCourse: (id: string) => boolean;
  startLesson: (lessonId: string) => boolean;
  recordAnswer: (lessonId: string, isCorrect: boolean) => boolean;
  completeLesson: (lessonId: string) => { ok: boolean; awarded: boolean; error?: string };
  resetProgress: () => boolean;
};
const ProgressContext = createContext<ProgressContextValue | null>(null);

export function LearningProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(createInitialLearningProgress);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    const result = readLearningProgress();
    setProgress(result.progress);
    setWarning(result.warning);
    setReady(true);
  }, []);
  const commit = useCallback((next: LearningProgress) => {
    if (!writeLearningProgress(next)) {
      setWarning("Браузер не разрешил сохранить прогресс. Проверь настройки хранилища этого сайта.");
      return false;
    }
    setProgress(next);
    setWarning("");
    return true;
  }, []);
  const selectCourse = useCallback((id: string) => {
    if (id !== ALL_COURSES_ID && !learningCourses.some((course) => course.id === id)) return false;
    return commit({ ...progress, selectedCourseId: id });
  }, [commit, progress]);
  const startLesson = useCallback((lessonId: string) => {
    const match = findLearningLesson(lessonId);
    if (!match) return false;
    const status = statusForLesson(match.course.id, lessonId, progress);
    if (status === "locked") return false;
    return commit({
      ...progress,
      selectedCourseId: match.course.id,
      startedCourses: progress.startedCourses.includes(match.course.id) ? progress.startedCourses : [...progress.startedCourses, match.course.id],
    });
  }, [commit, progress]);
  const recordAnswer = useCallback((lessonId: string, isCorrect: boolean) => {
    const match = findLearningLesson(lessonId);
    if (!match || statusForLesson(match.course.id, lessonId, progress) === "locked") return false;
    const reviewTopics = isCorrect || progress.reviewTopics.includes(lessonId) ? progress.reviewTopics : [...progress.reviewTopics, lessonId];
    return commit({
      ...progress,
      totalAnswers: Number(progress.totalAnswers ?? 0) + 1,
      correctAnswers: Number(progress.correctAnswers ?? 0) + (isCorrect ? 1 : 0),
      reviewTopics,
    });
  }, [commit, progress]);
  const completeLesson = useCallback((lessonId: string) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const completion = completeLearningLesson(progress, lessonId, today);
    if (!completion) return { ok: false, awarded: false, error: "Этот урок пока закрыт." };
    const ok = commit(completion.progress);
    return { ok, awarded: ok && completion.awarded, error: ok ? undefined : "Не удалось сохранить результат в браузере." };
  }, [commit, progress]);
  /*
   * Activity is recorded by successful completion only; opening a node does not
   * generate XP or a study day. The stable date key matches the legacy demo.
   */
  const resetProgress = useCallback(() => {
    const initial = createInitialLearningProgress();
    // Keep the rest of the shared legacy profile intact; reset only learning progress.
    const next: LearningProgress = {
      ...progress,
      selectedCourseId: initial.selectedCourseId,
      startedCourses: [], completedLessons: [], completedModules: [], claimedAchievements: [],
      repeatCompletions: 0, xp: 0, tokens: 0, totalAnswers: 0, correctAnswers: 0,
      activityDates: [], reviewTopics: [], lessonSession: null,
    };
    return commit(next);
  }, [commit, progress]);
  const value = useMemo(() => ({ progress, ready, warning, selectCourse, startLesson, recordAnswer, completeLesson, resetProgress }), [progress, ready, warning, selectCourse, startLesson, recordAnswer, completeLesson, resetProgress]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useLearningProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useLearningProgress must be used inside LearningProgressProvider");
  return value;
}
