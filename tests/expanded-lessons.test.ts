import test from "node:test";
import assert from "node:assert/strict";
import { expandedLessons } from "../src/data/expanded-lessons";
import { findLearningLesson } from "../src/data/learning-map";

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
