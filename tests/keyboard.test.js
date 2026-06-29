import { test } from "node:test";
import assert from "node:assert/strict";

import { POS_MIN, POS_MAX } from "../src/core/domain.js";
import { holeLabel } from "../src/view/labels.js";
import {
  KeyAction,
  resolveWalkKeyAction,
  resolveGrooveKeyAction,
  resolveChipKeyAction,
  parseHoleDigit,
  digitToValue,
  clampPosition,
  isEditableTarget,
  isSolveShortcut,
} from "../src/controllers/keyboard.js";

test("resolveWalkKeyAction maps only left/right to a step delta", () => {
  assert.deepEqual(resolveWalkKeyAction("ArrowLeft"), { type: KeyAction.WALK, delta: -1 });
  assert.deepEqual(resolveWalkKeyAction("ArrowRight"), { type: KeyAction.WALK, delta: 1 });
  assert.equal(resolveWalkKeyAction("ArrowUp"), null);
  assert.equal(resolveWalkKeyAction("Home"), null);
  assert.equal(resolveWalkKeyAction("x"), null);
});

test("resolveGrooveKeyAction covers step, plate, and digit intents", () => {
  assert.deepEqual(resolveGrooveKeyAction("ArrowLeft"), { type: KeyAction.STEP, delta: -1 });
  assert.deepEqual(resolveGrooveKeyAction("ArrowRight"), { type: KeyAction.STEP, delta: 1 });
  assert.deepEqual(resolveGrooveKeyAction("ArrowUp"), { type: KeyAction.PLATE, delta: -1 });
  assert.deepEqual(resolveGrooveKeyAction("ArrowDown"), { type: KeyAction.PLATE, delta: 1 });
  assert.deepEqual(resolveGrooveKeyAction("3"), { type: KeyAction.SET, hole: 3 });
  assert.equal(resolveGrooveKeyAction("8"), null);
  assert.equal(resolveGrooveKeyAction("Enter"), null);
});

test("resolveChipKeyAction moves within/between toolbars but leaves Enter/Space native", () => {
  assert.deepEqual(resolveChipKeyAction("ArrowLeft"), { type: KeyAction.MOVE, delta: -1 });
  assert.deepEqual(resolveChipKeyAction("ArrowRight"), { type: KeyAction.MOVE, delta: 1 });
  assert.deepEqual(resolveChipKeyAction("ArrowUp"), { type: KeyAction.PLATE, delta: -1 });
  assert.deepEqual(resolveChipKeyAction("ArrowDown"), { type: KeyAction.PLATE, delta: 1 });
  assert.equal(resolveChipKeyAction("Enter"), null);
  assert.equal(resolveChipKeyAction(" "), null);
});

test("parseHoleDigit only accepts a single in-range hole label", () => {
  assert.equal(parseHoleDigit("1"), 1);
  assert.equal(parseHoleDigit("7"), 7);
  assert.equal(parseHoleDigit("0"), null);
  assert.equal(parseHoleDigit("8"), null);
  assert.equal(parseHoleDigit("12"), null);
  assert.equal(parseHoleDigit("a"), null);
});

test("digit key and holeLabel are exact inverses across the position range", () => {
  for (let value = POS_MIN; value <= POS_MAX; value++) {
    const hole = parseHoleDigit(holeLabel(value));
    assert.notEqual(hole, null);
    assert.equal(digitToValue(hole), value);
  }
});

test("clampPosition keeps values inside the wall bounds (no wrap)", () => {
  assert.equal(clampPosition(POS_MIN - 2), POS_MIN);
  assert.equal(clampPosition(POS_MAX + 2), POS_MAX);
  assert.equal(clampPosition(0), 0);
});

test("isSolveShortcut fires only on Ctrl/Cmd+Enter, not plain or Shift+Enter", () => {
  assert.equal(isSolveShortcut({ key: "Enter", metaKey: true }), true);
  assert.equal(isSolveShortcut({ key: "Enter", ctrlKey: true }), true);
  assert.equal(isSolveShortcut({ key: "Enter" }), false);
  assert.equal(isSolveShortcut({ key: "Enter", shiftKey: true }), false);
  assert.equal(isSolveShortcut({ key: "a", metaKey: true }), false);
});

test("isEditableTarget guards typing surfaces", () => {
  assert.equal(isEditableTarget({ tagName: "INPUT" }), true);
  assert.equal(isEditableTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isEditableTarget({ tagName: "SELECT" }), true);
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: false }), false);
  assert.equal(isEditableTarget(null), false);
});
