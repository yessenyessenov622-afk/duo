export type LessonTask = {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type LearningLesson = {
  id: string;
  title: string;
  duration: string;
  task: LessonTask;
};

export type LearningChapter = {
  id: string;
  title: string;
  description: string;
  icon: string;
  lessons: LearningLesson[];
};

export type LearningCourse = {
  id: string;
  title: string;
  category: string;
  icon: string;
  accent: string;
  description: string;
  chapters: LearningChapter[];
};

export type LessonStatus = "completed" | "next" | "available" | "locked";

export type LearningProgress = {
  version: 1;
  selectedCourseId: string;
  startedCourses: string[];
  completedLessons: string[];
  completedModules: string[];
  xp: number;
  tokens: number;
  repeatCompletions: number;
  activityDates: string[];
  totalAnswers: number;
  correctAnswers: number;
  reviewTopics: string[];
  activeLessonId?: string | null;
  lastActivityAt?: number;
  lastModuleCompletedAt?: number;
  [field: string]: unknown;
};
