import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LINK,
  DEFAULT_PLATES,
  DEFAULT_MASTERY_ID,
  createMatrix,
  createPositions,
  createRemovedLinks,
  isPristineDefault,
  isLockMapped,
  getMappingCompleteness,
  isLockReadyToSolve,
} from "../src/domain.js";

function freshDefault(plateCount = DEFAULT_PLATES) {
  return {
    plateCount,
    matrix: createMatrix(plateCount),
    positions: createPositions(plateCount),
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
  };
}

test("isPristineDefault matches fresh default lock", () => {
  assert.equal(isPristineDefault(freshDefault()), true);
});

test("plate count alone is still pristine when couplings and pins unchanged", () => {
  assert.equal(isPristineDefault(freshDefault(5)), false);
  assert.equal(isLockMapped({ matrix: createMatrix(5), positions: createPositions(5) }), false);
});

test("isLockMapped after coupling or pin edit", () => {
  const matrix = createMatrix(6);
  matrix[1][0] = LINK.SAME;
  const positions = createPositions(6);
  assert.equal(isLockMapped({ matrix, positions }), true);

  const empty = createMatrix(6);
  const moved = createPositions(6);
  moved[0] = 2;
  assert.equal(isLockMapped({ matrix: empty, positions: moved }), true);
});

test("getMappingCompleteness tiers for 6-plate lock", () => {
  const plateCount = 6;
  const pristine = freshDefault(plateCount);
  assert.equal(getMappingCompleteness(pristine), "insufficient");
  assert.equal(isLockReadyToSolve(pristine), false);

  const onePin = { ...pristine, positions: createPositions(plateCount) };
  onePin.positions[0] = 1;
  assert.equal(getMappingCompleteness(onePin), "partial");

  const matrix = createMatrix(plateCount);
  matrix[1][0] = LINK.SAME;
  matrix[2][0] = LINK.OPP;
  matrix[3][0] = LINK.SAME;
  matrix[4][0] = LINK.OPP;
  matrix[5][0] = LINK.SAME;
  const readyByCouplings = { ...pristine, matrix };
  assert.equal(getMappingCompleteness(readyByCouplings), "ready");
  assert.equal(isLockReadyToSolve(readyByCouplings), true);

  const threePins = { ...pristine, positions: [1, -1, 2, 0, 0, 0] };
  assert.equal(getMappingCompleteness(threePins), "ready");
});

test("a single coupling on the default lock is partial, not ready", () => {
  const matrix = createMatrix(DEFAULT_PLATES);
  matrix[1][0] = LINK.SAME;
  const state = { ...freshDefault(), matrix };
  assert.equal(getMappingCompleteness(state), "partial");
  assert.equal(isLockReadyToSolve(state), false);
});
