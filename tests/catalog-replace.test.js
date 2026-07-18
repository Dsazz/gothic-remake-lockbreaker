import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldConfirmCatalogReplace } from "../src/catalog/replace.js";
import {
  DEFAULT_MASTERY_ID,
  DEFAULT_PLATES,
  createMatrix,
  createPositions,
  createRemovedLinks,
  LINK,
} from "../src/core/domain.js";

function pristine() {
  return {
    plateCount: DEFAULT_PLATES,
    matrix: createMatrix(DEFAULT_PLATES),
    positions: createPositions(DEFAULT_PLATES),
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(DEFAULT_PLATES),
  };
}

test("shouldConfirmCatalogReplace is false on pristine default without solution", () => {
  assert.equal(shouldConfirmCatalogReplace(pristine(), false), false);
});

test("shouldConfirmCatalogReplace is true when a solution session is active", () => {
  assert.equal(shouldConfirmCatalogReplace(pristine(), true), true);
});

test("shouldConfirmCatalogReplace is true when the lock is mapped", () => {
  const state = pristine();
  state.matrix[1][0] = LINK.SAME;
  assert.equal(shouldConfirmCatalogReplace(state, false), true);
});
