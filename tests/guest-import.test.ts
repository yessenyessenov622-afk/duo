import assert from "node:assert/strict";
import test from "node:test";
import { guestAlreadyImported, guestImportId, markGuestImported } from "../src/lib/guest-import";
import { createInitialLearningProgress } from "../src/lib/learning-progress";
import { DEFAULT_SETTINGS } from "../src/lib/customization";
import { defaultAccountPreferences } from "../src/lib/account-data";

test("guest import retains source data and retries only the same snapshot with the same ID", () => {
  const values = new Map<string, string>([["guest-progress", "original progress"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const oldData = { progress: createInitialLearningProgress(), settings: DEFAULT_SETTINGS, preferences: defaultAccountPreferences() };
  const newData = { ...oldData, progress: { ...oldData.progress, xp: 15 } };
  const oldId = guestImportId(storage, oldData, () => "first-import-id");
  assert.equal(guestImportId(storage, oldData, () => "unexpected"), oldId);

  // A second tab changes progress while the first import is in flight.
  const newId = guestImportId(storage, newData, () => "second-import-id");
  markGuestImported(storage, "account-a", oldData, oldId);
  assert.equal(values.get("guest-progress"), "original progress");
  assert.equal(guestAlreadyImported(storage, "account-a", oldData), true);
  assert.equal(guestAlreadyImported(storage, "account-a", newData), false);
  assert.equal(guestAlreadyImported(storage, "account-b", oldData), false);
  assert.equal(guestImportId(storage, newData, () => "unexpected"), newId);
});

test("legacy or corrupt import markers do not hide guest data", () => {
  const values = new Map<string, string>([["kiraquest.guest-import-id.v1", "legacy-id"], ["kiraquest.guest-imported-snapshot.v1", "broken json"]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const data = { progress: createInitialLearningProgress(), settings: DEFAULT_SETTINGS, preferences: defaultAccountPreferences() };
  assert.equal(guestAlreadyImported(storage, "account-a", data), false);
  assert.equal(guestImportId(storage, data, () => "fresh-import-id"), "fresh-import-id");
});
