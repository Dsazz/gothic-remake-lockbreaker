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

// What does turning `plate` drag, starting from a centered board? Each non-zero
// entry is a coupled plate; centered plates stay at 0, so the result doubles as
// "the drag set" for that plate under the current convention.
function dragsFrom(matrix, plate) {
  return applyMove(new Array(matrix.length).fill(0), matrix, plate, 1);
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
  matrix[1][0] = LINK.SAME; // turning plate 0 drags plate 1 the same way (column 0)
  const start = [-1, -1];
  const solution = solve(start, matrix);
  assert.equal(solution.length, 1);
  assertValidSolution(start, matrix, solution);
});

test("applyMove drags the column (mover) and detects bounds", () => {
  const matrix = createMatrix(2);
  matrix[1][0] = LINK.OPP; // turning plate 0 drags plate 1 the opposite way
  assert.deepEqual(applyMove([0, 0], matrix, 0, 1), [1, -1]);
  assert.equal(isInBounds(applyMove([3, 0], matrix, 0, 1)), false);
});

// Coupling is directional: a link lives in the mover's column, not its row, so
// turning the linked-from plate must NOT drag back. Guards against a re-transpose.
test("coupling is directional, not symmetric", () => {
  const matrix = createMatrix(2);
  matrix[1][0] = LINK.SAME; // turning plate 0 drags plate 1
  assert.deepEqual(applyMove([0, 0], matrix, 0, 1), [1, 1], "plate 0 drags plate 1");
  assert.deepEqual(applyMove([0, 0], matrix, 1, 1), [0, 1], "plate 1 drags nothing");
});

test("5-plate lock with simple coupling solves edge-safely", () => {
  const matrix = createMatrix(5);
  matrix[1][0] = LINK.SAME;
  const start = [2, -1, 0, 0, 0];
  assertValidSolution(start, matrix, solve(start, matrix));
});

test("returns null for out-of-bounds start positions", () => {
  const matrix = createMatrix(4);
  assert.equal(isInBounds([4, 0, 0, 0]), false);
  assert.equal(solve([4, 0, 0, 0], matrix), null);
});

test("reports null when no edge-safe path exists", () => {
  const matrix = createMatrix(2);
  matrix[0][1] = LINK.SAME;
  matrix[1][0] = LINK.SAME; // both plates rigidly move together, same way
  // From opposite walls they can never both reach center without one going OOB.
  assert.equal(solve([3, -3], matrix), null);
});

// The Old Camp tower door (6 plates), transcribed from the screenshots.
// Convention: matrix[reactor][turned] -> the COLUMN of a plate is what it drags.
function oldCampMatrix() {
  const m = createMatrix(6);
  m[5][1] = LINK.SAME; m[5][2] = LINK.OPP;
  m[4][0] = LINK.OPP;  m[4][5] = LINK.SAME;
  m[3][1] = LINK.SAME;
  m[2][0] = LINK.OPP;  m[2][5] = LINK.SAME;
  m[1][0] = LINK.OPP;  m[1][2] = LINK.SAME;
  m[0][4] = LINK.OPP;
  return m;
}

test("Old Camp tower door: verified couplings and edge-safe solve", () => {
  const matrix = oldCampMatrix();
  // Confirmed in-game: turning P1 drags P2/P3/P5 opposite; turning P2 drags P4/P6 same.
  assert.deepEqual(dragsFrom(matrix, 0), [1, -1, -1, 0, -1, 0]);
  assert.deepEqual(dragsFrom(matrix, 1), [0, 1, 0, 1, 0, 1]);

  const start = [-3, -2, 3, 3, 2, 1]; // [P1..P6] from the screenshot
  assertValidSolution(start, matrix, solve(start, matrix));
});

// A second real 6-plate lock, transcribed as displayed (stored cells unchanged).
function towerDoor2Matrix() {
  // Stored exactly as the grid was clicked: matrix[reactor][turned]. So T6
  // (row 5) reacting to T2/T3/T4 means those columns carry the drag, not T6's.
  const m = createMatrix(6);
  m[5][1] = LINK.SAME; m[5][2] = LINK.SAME; m[5][3] = LINK.SAME;
  m[4][1] = LINK.OPP;
  m[3][0] = LINK.OPP;  m[3][1] = LINK.OPP;
  m[2][1] = LINK.SAME;
  m[1][2] = LINK.SAME; m[1][4] = LINK.SAME;
  m[0][1] = LINK.OPP;
  return m;
}

test("Second tower door: T6 independent, T2 drags five, edge-safe solve", () => {
  const matrix = towerDoor2Matrix();
  // Confirmed in-game: turning T6 moves nothing on its own.
  assert.deepEqual(dragsFrom(matrix, 5), [0, 0, 0, 0, 0, 1], "T6 is independent");
  // Turning T2 drags T1, T3, T4, T5, T6 (its column).
  assert.deepEqual(dragsFrom(matrix, 1), [-1, 1, 1, -1, -1, 1]);

  const start = [-2, -3, 1, 0, -1, -3]; // [T1..T6]
  assertValidSolution(start, matrix, solve(start, matrix));
});
