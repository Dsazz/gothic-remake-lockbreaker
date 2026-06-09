import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LINK,
  CENTER,
  DEFAULT_PLATES,
  createMatrix,
  createPositions,
  isPristineDefault,
  isLockMapped,
} from "../src/domain.js";

test("isPristineDefault matches fresh default lock", () => {
  assert.equal(
    isPristineDefault({
      plateCount: DEFAULT_PLATES,
      matrix: createMatrix(DEFAULT_PLATES),
      positions: createPositions(DEFAULT_PLATES),
    }),
    true,
  );
});

test("plate count alone is still pristine when couplings and pins unchanged", () => {
  assert.equal(
    isPristineDefault({
      plateCount: 5,
      matrix: createMatrix(5),
      positions: createPositions(5),
    }),
    false,
  );
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
