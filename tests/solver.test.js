import { test } from "node:test";
import assert from "node:assert/strict";

import { solve, statesAlong } from "../src/solver.js";
import {
  LINK,
  applyMove,
  isInBounds,
  isSolved,
  createMatrix,
} from "../src/domain.js";

function assertValidSolution(start, matrix, solution) {
  assert.notEqual(solution, null, "expected an edge-safe solution");
  const states = statesAlong(start, matrix, solution);
  for (const state of states) {
    assert.ok(isInBounds(state), `state out of bounds: ${state}`);
  }
  assert.ok(isSolved(states.at(-1)), `final state not centered: ${states.at(-1)}`);
}

test("already-centered lock needs no moves", () => {
  assert.deepEqual(solve([0, 0, 0, 0], createMatrix(4)), []);
});

test("a single independent plate is centered directly", () => {
  const matrix = createMatrix(4);
  const solution = solve([2, 0, 0, 0], matrix);
  assert.equal(solution.length, 2);
  assertValidSolution([2, 0, 0, 0], matrix, solution);
});

test("a same-linked pair is solved together", () => {
  const matrix = createMatrix(2);
  matrix[0][1] = LINK.SAME; // moving plate 0 also moves plate 1 the same way
  const start = [-1, -1];
  const solution = solve(start, matrix);
  assert.equal(solution.length, 1);
  assertValidSolution(start, matrix, solution);
});

test("applyMove respects opposite links and bounds detection", () => {
  const matrix = createMatrix(2);
  matrix[0][1] = LINK.OPP;
  assert.deepEqual(applyMove([0, 0], matrix, 0, 1), [1, -1]);
  assert.equal(isInBounds(applyMove([3, 0], matrix, 0, 1)), false);
});

// The Old Camp tower door (6 plates), transcribed from the screenshots.
// Matrix rows = "when I move plate i" (0-indexed: Plate k -> i = k-1).
function oldCampMatrix() {
  const m = createMatrix(6);
  m[5][1] = LINK.SAME; m[5][2] = LINK.OPP; // P6 -> P2 same, P3 opp
  m[4][0] = LINK.OPP;  m[4][5] = LINK.SAME; // P5 -> P1 opp, P6 same
  m[3][1] = LINK.SAME;                       // P4 -> P2 same
  m[2][0] = LINK.OPP;  m[2][5] = LINK.SAME; // P3 -> P1 opp, P6 same
  m[1][0] = LINK.OPP;  m[1][2] = LINK.SAME; // P2 -> P1 opp, P3 same
  m[0][4] = LINK.OPP;                        // P1 -> P5 opp
  return m;
}

test("Old Camp tower door is solved edge-safely", () => {
  const matrix = oldCampMatrix();
  // positions [P1..P6] from screenshot 2
  const start = [-3, -2, 3, 3, 2, 1];
  const solution = solve(start, matrix);
  assertValidSolution(start, matrix, solution);
});
