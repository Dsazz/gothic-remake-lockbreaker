// Pure domain layer: constants and side-effect-free helpers.
// Depends on nothing. No DOM, no storage, no globals.

export const POS_MIN = -3;
export const POS_MAX = 3;
export const CENTER = 0;

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
// every other plate shifts by `dir` times its link value. Pure: returns a new array.
export function applyMove(state, matrix, plate, dir) {
  const next = state.slice();
  const row = matrix[plate];
  for (let j = 0; j < next.length; j++) {
    const effect = j === plate ? dir : dir * row[j];
    next[j] += effect;
  }
  return next;
}

export function isInBounds(state) {
  return state.every((pos) => pos >= POS_MIN && pos <= POS_MAX);
}

export function isSolved(state) {
  return state.every((pos) => pos === CENTER);
}
