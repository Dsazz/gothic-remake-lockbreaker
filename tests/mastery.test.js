import { test } from "node:test";
import assert from "node:assert/strict";

import { solve } from "../src/core/solver.js";
import {
  LINK,
  MASTERY,
  createMatrix,
  createRemovedLinks,
  effectiveMatrix,
  countRemovedLinks,
  isDefaultMastery,
} from "../src/core/domain.js";

test("effectiveMatrix clears removed couplings only", () => {
  const matrix = createMatrix(3);
  matrix[1][0] = LINK.SAME;
  matrix[2][0] = LINK.OPP;
  const removedLinks = createRemovedLinks(3);
  removedLinks[1][0] = true;

  const effective = effectiveMatrix(matrix, removedLinks);
  assert.equal(effective[1][0], LINK.NONE);
  assert.equal(effective[2][0], LINK.OPP);
});

test("solver result unchanged when mastery metadata differs but matrix is same", () => {
  const matrix = createMatrix(2);
  matrix[1][0] = LINK.SAME;
  const start = [-1, -1];
  const base = solve(start, matrix);

  const removedLinks = createRemovedLinks(2);
  const withRemoval = solve(start, effectiveMatrix(matrix, removedLinks));
  assert.deepEqual(withRemoval, base);
});

test("removed link can unlock previously unsolvable lock", () => {
  const matrix = createMatrix(2);
  matrix[0][1] = LINK.SAME;
  matrix[1][0] = LINK.SAME;
  const start = [3, -3];
  assert.equal(solve(start, matrix), null);

  const removedLinks = createRemovedLinks(2);
  removedLinks[0][1] = true;
  const solution = solve(start, effectiveMatrix(matrix, removedLinks));
  assert.ok(solution);
});

test("isDefaultMastery detects non-default tier", () => {
  assert.equal(
    isDefaultMastery({
      masteryLevel: MASTERY.TRAINED.id,
      breaksBudget: 0,
      removedLinks: createRemovedLinks(4),
    }),
    false,
  );
  assert.equal(countRemovedLinks(createRemovedLinks(4)), 0);
});
