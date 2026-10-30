import test from "node:test";
import assert from "node:assert/strict";
import { verifyLesson } from "../src/lib/verified-lesson";
import { expandedLessons } from "../src/data/expanded-lessons";
import { findLearningLesson } from "../src/data/learning-map";

test("only an authored lesson with all correct answers is accepted", () => {
  const lesson = expandedLessons["web-css-1"];
  const answers = lesson.tasks.map(task => task.answer);
  assert.equal(verifyLesson("web-css-1", answers), true);
  assert.equal(verifyLesson("not-a-lesson", answers), false);
  assert.equal(verifyLesson("web-css-1", answers.slice(1)), false);
  assert.equal(verifyLesson("web-css-1", answers.map((answer, index) => index === 0 ? "wrong" : answer)), false);
  assert.equal(verifyLesson("web-css-1", { xp: 1000000 }), false);
});

test("legacy lessons require their real answer", () => {
  const id = "math-1";
  const lesson = findLearningLesson(id);
  assert.ok(lesson);
  assert.equal(verifyLesson(id, [lesson.lesson.task.answer]), true);
  assert.equal(verifyLesson(id, ["not the answer"]), false);
  assert.equal(verifyLesson(id, [lesson.lesson.task.answer, lesson.lesson.task.answer]), false);
});
