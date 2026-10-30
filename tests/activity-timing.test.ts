import test from "node:test";
import assert from "node:assert/strict";
import { activityTiming } from "../src/lib/activity-timing";

test("visits start once and start again after 30 minutes of inactivity", () => {
  assert.equal(activityTiming(2_000_000, null, null, false).newVisit, true);
  assert.equal(activityTiming(2_000_000, 200_001, null, false).newVisit, false);
  assert.equal(activityTiming(2_000_000, 200_000, null, false).newVisit, true);
});

test("study time needs consecutive active signals and excludes long gaps", () => {
  assert.equal(activityTiming(100_000, 90_000, null, true).seconds, 0);
  assert.equal(activityTiming(100_000, 90_000, 85_000, true).seconds, 15);
  assert.equal(activityTiming(100_000, 90_000, 75_000, true).seconds, 20);
  assert.equal(activityTiming(100_000, 90_000, 74_999, true).seconds, 0);
  assert.equal(activityTiming(100_000, 90_000, 85_000, false).seconds, 0);
  assert.equal(activityTiming(100_000, 90_000, 100_000, true).seconds, 0);
});
