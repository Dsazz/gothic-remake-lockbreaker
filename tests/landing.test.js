import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MASTERY_ID,
  DEFAULT_PLATES,
  LINK,
  createMatrix,
  createPositions,
  createRemovedLinks,
} from "../src/core/domain.js";
import { resolveLandingType } from "../src/landing.js";
import { LandingType } from "../src/analytics/values.js";

function pristineState() {
  const plateCount = DEFAULT_PLATES;
  return {
    plateCount,
    matrix: createMatrix(plateCount),
    positions: createPositions(plateCount),
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
  };
}

function mappedState() {
  const plateCount = 4;
  const matrix = createMatrix(plateCount);
  matrix[1][0] = LINK.SAME;
  return {
    plateCount,
    matrix,
    positions: [1, 0, -1, 0],
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
  };
}

test("resolveLandingType picks cold, returning, or hash", () => {
  const pristine = pristineState();
  assert.equal(resolveLandingType(pristine, false, false), LandingType.COLD);
  assert.equal(resolveLandingType(pristine, false, true), LandingType.RETURNING);
  assert.equal(resolveLandingType(pristine, true, false), LandingType.COLD);
  assert.equal(resolveLandingType(mappedState(), true, false), LandingType.HASH);
  assert.equal(resolveLandingType(mappedState(), true, true), LandingType.HASH);
});
