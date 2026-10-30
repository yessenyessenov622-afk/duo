import { expandedLessons, type ExpandedTask } from "@/src/data/expanded-lessons";
import { findLearningLesson } from "@/src/data/learning-map";
import type { LessonTask } from "@/src/types/learning";

type Budget = NonNullable<LessonTask["budget"]>;
type Schedule = NonNullable<LessonTask["schedule"]>;
const normalize = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
const listEquals = (a: unknown, b: string[]) => Array.isArray(a) && a.length === b.length && a.every((v, i) => typeof v === "string" && v === b[i]);
const numbers = (value: unknown): Record<string, number> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.values(value).some(v => !Number.isSafeInteger(v))) return null;
  return value as Record<string, number>;
};
function budgetValid(spec: Budget | undefined, value: unknown) {
  const answers = numbers(value);
  if (!spec || !answers || Object.keys(answers).length !== spec.allocations.length) return false;
  return spec.allocations.every(item => Object.hasOwn(answers, item.id) && answers[item.id] >= item.minimum) && spec.allocations.reduce((sum, item) => sum + answers[item.id], 0) === spec.total;
}
function scheduleValid(spec: Schedule | undefined, value: unknown) {
  const answers = numbers(value);
  if (!spec || !answers || Object.keys(answers).length !== spec.events.length) return false;
  return spec.events.every((event, i, events) => Object.hasOwn(answers, event.id) && answers[event.id] >= spec.dayStart && answers[event.id] + event.duration <= (event.latestEnd ?? spec.dayEnd) && events.slice(i + 1).every(other => answers[event.id] + event.duration <= answers[other.id] || answers[other.id] + other.duration <= answers[event.id]));
}
function expandedAnswer(task: ExpandedTask, value: unknown) {
  if (task.type === "budget") return budgetValid(task.budget, value);
  if (task.type === "schedule") return scheduleValid(task.schedule, value);
  if (task.type === "order") return Array.isArray(task.answer) && listEquals(value, task.answer);
  if (typeof value !== "string") return false;
  if (task.type === "text") return (task.accepted ?? [task.answer as string]).some(answer => normalize(answer) === normalize(value));
  return value === task.answer;
}
function legacyAnswer(task: LessonTask, value: unknown) {
  if (task.mode === "budget") return budgetValid(task.budget, value);
  if (task.mode === "schedule") return scheduleValid(task.schedule, value);
  if (task.mode === "sequence") return listEquals(value, task.sequence?.answer ?? []);
  if (task.mode === "matching") {
    if (!value || typeof value !== "object" || Array.isArray(value) || !task.matching) return false;
    const answers = value as Record<string, unknown>;
    return Object.keys(answers).length === task.matching.pairs.length && task.matching.pairs.every(pair => answers[pair.left] === pair.right);
  }
  if (task.mode === "multi") return Array.isArray(value) && value.every(item => typeof item === "string") && listEquals([...value].sort(), [...(task.answers ?? [])].sort());
  return typeof value === "string" && value === task.answer;
}
/** A submission must contain exactly one correct answer per authored exercise. */
export function verifyLesson(lessonId: unknown, answers: unknown): boolean {
  if (typeof lessonId !== "string" || lessonId.length > 100 || !Array.isArray(answers)) return false;
  const match = findLearningLesson(lessonId);
  if (!match) return false;
  const expanded = Object.hasOwn(expandedLessons, lessonId) ? expandedLessons[lessonId] : undefined;
  return expanded ? answers.length === expanded.tasks.length && expanded.tasks.every((task, index) => expandedAnswer(task, answers[index])) : answers.length === 1 && legacyAnswer(match.lesson.task, answers[0]);
}
