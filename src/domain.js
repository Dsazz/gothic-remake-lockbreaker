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

export const MASTERY = Object.freeze({
  UNTRAINED: {
    id: 0,
    key: "untrained",
    label: "Untrained",
    mistakes: 2,
    resetOnBreak: true,
    simplifiesOnBreak: false,
  },
  TRAINED: {
    id: 1,
    key: "trained",
    label: "Trained",
    mistakes: 4,
    resetOnBreak: false,
    simplifiesOnBreak: false,
  },
  MASTER: {
    id: 2,
    key: "master",
    label: "Master",
    mistakes: 6,
    resetOnBreak: false,
    simplifiesOnBreak: true,
  },
});

export const MASTERY_BY_ID = Object.freeze({
  [MASTERY.UNTRAINED.id]: MASTERY.UNTRAINED,
  [MASTERY.TRAINED.id]: MASTERY.TRAINED,
  [MASTERY.MASTER.id]: MASTERY.MASTER,
});

export const DEFAULT_MASTERY_ID = MASTERY.UNTRAINED.id;

/** @typedef {{ plate: number, dir: number }} Move */
/** @typedef {{ plateCount: number, matrix: number[][], positions: number[], masteryLevel: number, breaksBudget: number, removedLinks: boolean[][] }} LockState */

export function createMatrix(plateCount) {
  return Array.from({ length: plateCount }, () =>
    new Array(plateCount).fill(LINK.NONE),
  );
}

export function createPositions(plateCount) {
  return new Array(plateCount).fill(CENTER);
}

export function createRemovedLinks(plateCount) {
  return Array.from({ length: plateCount }, () => new Array(plateCount).fill(false));
}

export function masteryForId(id) {
  return MASTERY_BY_ID[id] ?? MASTERY.UNTRAINED;
}

export function isValidMasteryId(id) {
  return id in MASTERY_BY_ID;
}

export function maxBreaksBudget(plateCount) {
  return plateCount;
}

export function countRemovedLinks(removedLinks) {
  let count = 0;
  for (let i = 0; i < removedLinks.length; i++) {
    for (let j = 0; j < removedLinks[i].length; j++) {
      if (i !== j && removedLinks[i][j]) count++;
    }
  }
  return count;
}

/** Matrix fed to the solver: removed couplings behave as LINK.NONE. */
export function effectiveMatrix(matrix, removedLinks) {
  if (!removedLinks?.length) return matrix;
  return matrix.map((row, i) =>
    row.map((cell, j) => (removedLinks[i][j] ? LINK.NONE : cell)),
  );
}

export function canMarkLinkRemoved(state, reactor, turned) {
  if (reactor === turned) return false;
  if (masteryForId(state.masteryLevel).id !== MASTERY.MASTER.id) return false;
  if (state.breaksBudget <= 0) return false;
  if (state.removedLinks[reactor][turned]) return true;
  if (state.matrix[reactor][turned] === LINK.NONE) return false;
  return countRemovedLinks(state.removedLinks) < state.breaksBudget;
}

export function isDefaultMastery({ masteryLevel, breaksBudget, removedLinks }) {
  if (masteryLevel !== DEFAULT_MASTERY_ID) return false;
  if (breaksBudget !== 0) return false;
  return countRemovedLinks(removedLinks) === 0;
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

/** Default plate count, all pins at notch, no couplings set, untrained mastery. */
export function isPristineDefault(state) {
  const { plateCount, matrix, positions } = state;
  if (plateCount !== DEFAULT_PLATES) return false;
  if (!isDefaultMastery(state)) return false;
  return !hasCoupling(matrix) && !hasNonCenterPin(positions);
}

/** User has set at least one coupling or moved a pin off center. Plate count alone does not count. */
export function isLockMapped({ matrix, positions }) {
  return hasCoupling(matrix) || hasNonCenterPin(positions);
}

export function countCouplings(matrix) {
  let count = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (i !== j && matrix[i][j] !== LINK.NONE) count++;
    }
  }
  return count;
}

export function countNonCenterPins(positions) {
  return positions.filter((pos) => pos !== CENTER).length;
}

/** @returns {"insufficient" | "partial" | "ready"} */
export function getMappingCompleteness({ matrix, positions, plateCount }) {
  const couplings = countCouplings(matrix);
  const movedPins = countNonCenterPins(positions);
  if (couplings === 0 && movedPins === 0) return "insufficient";
  const ready =
    couplings >= plateCount - 1 || movedPins >= Math.ceil(plateCount / 2);
  return ready ? "ready" : "partial";
}

export function isLockReadyToSolve(state) {
  return getMappingCompleteness(state) === "ready";
}
