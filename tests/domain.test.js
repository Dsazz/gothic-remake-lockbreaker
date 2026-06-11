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
