// Pure domain layer: constants and side-effect-free helpers.
// Depends on nothing. No DOM, no storage, no globals.

export const POS_MIN = -3;
export const POS_MAX = 3;
export const CENTER = 0;

// A pin AT a wall (EDGE) breaks the pick if pushed further; NEAR_EDGE is one
// nudge from the wall. Used for danger highlighting in the view.
export const EDGE = POS_MAX;
export const NEAR_EDGE = POS_MAX - 1;

export const MIN_PLATES = 4;
export const MAX_PLATES = 7;
export const DEFAULT_PLATES = 6;

// How moving one plate affects another (and the visual cell state).
export const LINK = Object.freeze({ NONE: 0, SAME: 1, OPP: -1 });

// A single nudge direction. +1 moves a pin toward POS_MAX, -1 toward POS_MIN.
export const DIR = Object.freeze({ LEFT: -1, RIGHT: 1 });

/** @typedef {{ plate: number, dir: number }} Move */
/** @typedef {{ plateCount: number, matrix: number[][], positions: number[] }} LockState */

export function createMatrix(plateCount) {
  return Array.from({ length: plateCount }, () =>
    new Array(plateCount).fill(LINK.NONE),
  );
}

export function createPositions(plateCount) {
  return new Array(plateCount).fill(CENTER);
}

// Result of nudging `plate` by `dir`. The moved plate always shifts by `dir`;
// every other plate `i` shifts by `dir` times its link to the moved plate.
// Convention: matrix[i][j] = how plate `i` reacts when plate `j` is turned, so
// the COLUMN of the moved plate holds its drag effects. Pure: returns a new array.
export function applyMove(state, matrix, plate, dir) {
  const next = state.slice();
  for (let i = 0; i < next.length; i++) {
    const effect = i === plate ? dir : dir * matrix[i][plate];
    next[i] += effect;
  }
  return next;
}

export function isInBounds(state) {
  return state.every((pos) => pos >= POS_MIN && pos <= POS_MAX);
}

export function isSolved(state) {
  return state.every((pos) => pos === CENTER);
}

export function hasCoupling(matrix) {
  return matrix.some((row, i) => row.some((cell, j) => i !== j && cell !== LINK.NONE));
}

export function hasNonCenterPin(positions) {
  return positions.some((pos) => pos !== CENTER);
}

/** Default plate count, all pins at notch, no couplings set. */
export function isPristineDefault({ plateCount, matrix, positions }) {
  if (plateCount !== DEFAULT_PLATES) return false;
  return !hasCoupling(matrix) && !hasNonCenterPin(positions);
}

/** User has set at least one coupling or moved a pin off center. Plate count alone does not count. */
export function isLockMapped({ matrix, positions }) {
  return hasCoupling(matrix) || hasNonCenterPin(positions);
}
