import test from "node:test";
import assert from "node:assert/strict";
import { expandedLessons } from "../src/data/expanded-lessons";
import { completeLearningLesson, findLearningLesson, getTopicStatus, learningCourses } from "../src/data/learning-map";
import { createInitialLearningProgress } from "../src/lib/learning-progress";
import { lifeSkillsCourses, lifeSkillsLessons } from "../src/data/life-skills";

test("authored lessons match their actual levels and exercise counts", () => {
  for (const [id, content] of Object.entries(expandedLessons)) {
    const match = findLearningLesson(id);
    assert.ok(match, `Unknown lesson ${id}`);
    const level = match.course.levels?.find((item) => item.topicIds.includes(match.chapter.id))?.number ?? 1;
    assert.equal(content.level, level, id);
    assert.equal(content.tasks.length, level >= 5 ? 8 : 6, id);
    assert.ok(content.introduction.length >= 2 && content.example, id);
    for (const task of content.tasks) {
      assert.ok(task.prompt && task.hint && task.explanation, id);
      if (task.type === "choice") assert.ok(task.options?.includes(task.answer as string), id);
      if (task.type === "order") assert.deepEqual([...(task.options ?? [])].sort(), [...task.answer as string[]].sort(), id);
    }
  }
});

test("life skills courses unlock the next topic and preserve the original reward on repeat", () => {
  assert.equal(lifeSkillsCourses.length, 6);
  const ids = new Set<string>();
  for (const course of lifeSkillsCourses) {
    assert.equal(course.chapters.length, 2);
    const [first, second] = course.chapters;
    const lesson = first.lessons[0];
    assert.equal(ids.has(lesson.id), false); ids.add(lesson.id);
    assert.equal(lifeSkillsLessons[lesson.id].tasks.length, 6);
    let progress = createInitialLearningProgress();
    assert.equal(getTopicStatus(course, second.id, progress.completedLessons, progress.startedCourses), "locked");
    progress = completeLearningLesson(progress, lesson.id, "2026-01-01")!.progress;
    assert.equal(getTopicStatus(course, second.id, progress.completedLessons, progress.startedCourses), "next");
    const repeated = completeLearningLesson(progress, lesson.id, "2026-01-01")!;
    assert.equal(repeated.awarded, false);
    assert.equal(repeated.progress.xp, progress.xp);
  }
});

test("new topics follow existing lessons and repeating a lesson does not add XP", () => {
  for (const [courseId, oldIds, newTopic, firstNew, secondNew] of [
    ["english-start", ["hello-1", "hello-2", "words-1", "words-2"], "english-numbers-time", "english-numbers-1", "english-time-1"],
    ["web-start", ["web-1", "web-2", "web-3", "web-4"], "web-css-basics", "web-css-1", "web-css-2"],
    ["math-start", ["math-1", "math-2", "math-3", "math-4"], "math-fractions", "math-fraction-1", "math-fraction-2"],
  ] as const) {
    const course = learningCourses.find((item) => item.id === courseId)!;
    let progress: ReturnType<typeof createInitialLearningProgress> = { ...createInitialLearningProgress(), completedLessons: [...oldIds], startedCourses: [courseId], xp: 100 };
    assert.equal(getTopicStatus(course, newTopic, progress.completedLessons, progress.startedCourses), "next");
    const first = completeLearningLesson(progress, firstNew, "2026-01-01")!;
    assert.equal(first.awarded, true); progress = first.progress;
    const repeat = completeLearningLesson(progress, firstNew, "2026-01-01")!;
    assert.equal(repeat.awarded, false); assert.equal(repeat.progress.xp, progress.xp);
    const second = completeLearningLesson(progress, secondNew, "2026-01-01")!;
    assert.equal(getTopicStatus(course, newTopic, second.progress.completedLessons, second.progress.startedCourses), "completed");
    if (courseId === "english-start") assert.equal(getTopicStatus(course, "english-daily-plans", second.progress.completedLessons, second.progress.startedCourses), "next");
  }
});
