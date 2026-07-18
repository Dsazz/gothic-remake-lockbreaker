import { test } from "node:test";
import assert from "node:assert/strict";

import { createStore } from "../src/core/store.js";
import { catalogEntryToLockState } from "../src/catalog/entries.js";
import { LINK, MASTERY } from "../src/core/domain.js";

test("loadLock keeps catalog identity until the lock is edited", () => {
  const store = createStore();
  const entry = {
    id: "OC_Chest_Armory_01_Lock",
    name: "Armory 01 Chest",
    place: "Old Camp",
    plateCount: 5,
    positions: [3, 3, -2, 3, 0],
    matrix: Array.from({ length: 5 }, () => new Array(5).fill(LINK.NONE)),
    k1: null,
    k2: null,
  };
  entry.matrix[0][4] = LINK.OPP;

  store.loadLock(catalogEntryToLockState(entry));
  assert.equal(store.getState().catalogId, "OC_Chest_Armory_01_Lock");
  assert.equal(store.getState().catalogName, "Armory 01 Chest");

  store.setPosition(0, 2);
  assert.equal(store.getState().catalogId, null);
  assert.equal(store.getState().catalogName, null);
});

test("mastery and breaks edits keep catalog identity", () => {
  const store = createStore();
  const entry = {
    id: "OC_Chest_Armory_01_Lock",
    name: "Armory 01 Chest",
    place: "Old Camp",
    plateCount: 5,
    positions: [3, 3, -2, 3, 0],
    matrix: Array.from({ length: 5 }, () => new Array(5).fill(LINK.NONE)),
    k1: null,
    k2: null,
  };
  entry.matrix[0][4] = LINK.OPP;

  assert.equal(store.loadLock(catalogEntryToLockState(entry)), true);
  store.setMasteryLevel(MASTERY.TRAINED.id);
  assert.equal(store.getState().catalogId, "OC_Chest_Armory_01_Lock");

  store.setMasteryLevel(MASTERY.MASTER.id);
  store.adjustBreaksBudget(1);
  assert.equal(store.getState().catalogId, "OC_Chest_Armory_01_Lock");
  assert.equal(store.getState().breaksBudget, 1);
});
