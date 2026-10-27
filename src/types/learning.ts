export type LessonTask = {
  mode?: "single" | "multi" | "budget" | "schedule" | "matching" | "sequence";
  answers?: string[];
  budget?: { total: number; allocations: { id: string; label: string; minimum: number; initial: number }[] };
  schedule?: { dayStart: number; dayEnd: number; events: { id: string; title: string; duration: number; initialStart: number; latestEnd?: number }[] };
  matching?: { pairs: { left: string; right: string }[]; choices: string[] };
  sequence?: { items: { id: string; label: string }[]; answer: string[]; initialOrder: string[] };
  context?: string;
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
  skillOutcome?: string;
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
