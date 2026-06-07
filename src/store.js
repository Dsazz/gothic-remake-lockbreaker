// Single source of truth for the lock definition + a hidden persistence adapter.
// No other module reads/writes storage directly. Mutations are immutable and
// notify subscribers. Depends only on the domain layer.

import {
  LINK,
  POS_MIN,
  POS_MAX,
  MIN_PLATES,
  MAX_PLATES,
  DEFAULT_PLATES,
  createMatrix,
  createPositions,
} from "./domain.js";

const STORAGE_KEY = "gothic-lockbreaker-state";

const NEXT_LINK = {
  [LINK.NONE]: LINK.SAME,
  [LINK.SAME]: LINK.OPP,
  [LINK.OPP]: LINK.NONE,
};

const LINK_TO_CHAR = { [LINK.NONE]: "0", [LINK.SAME]: "1", [LINK.OPP]: "2" };
const CHAR_TO_LINK = { "0": LINK.NONE, "1": LINK.SAME, "2": LINK.OPP };

function defaultState() {
  return {
    plateCount: DEFAULT_PLATES,
    matrix: createMatrix(DEFAULT_PLATES),
    positions: createPositions(DEFAULT_PLATES),
  };
}

// --- compact, URL-safe serialization: "<n>.<matrixDigits>.<positionDigits>" ---

function encodeState({ plateCount, matrix, positions }) {
  let cells = "";
  for (let i = 0; i < plateCount; i++) {
    for (let j = 0; j < plateCount; j++) cells += LINK_TO_CHAR[matrix[i][j]];
  }
  const pins = positions.map((value) => String(value - POS_MIN)).join("");
  return `${plateCount}.${cells}.${pins}`;
}

function decodeState(text) {
  if (!text) return null;
  const [rawCount, cells, pins, extra] = text.split(".");
  if (extra !== undefined) return null;

  const plateCount = Number(rawCount);
  if (!Number.isInteger(plateCount)) return null;
  if (plateCount < MIN_PLATES || plateCount > MAX_PLATES) return null;
  if (cells?.length !== plateCount * plateCount) return null;
  if (pins?.length !== plateCount) return null;

  const matrix = [];
  for (let i = 0; i < plateCount; i++) {
    const row = [];
    for (let j = 0; j < plateCount; j++) {
      const link = CHAR_TO_LINK[cells[i * plateCount + j]];
      if (link === undefined) return null;
      row.push(link);
    }
    matrix.push(row);
  }

  const positions = [];
  for (let k = 0; k < plateCount; k++) {
    const value = Number(pins[k]) + POS_MIN;
    if (!Number.isInteger(value) || value < POS_MIN || value > POS_MAX) {
      return null;
    }
    positions.push(value);
  }

  return { plateCount, matrix, positions };
}

// --- storage adapter (browser only; silently no-ops elsewhere) ---

function loadState() {
  try {
    const fromHash = decodeState(globalThis.location?.hash?.slice(1));
    if (fromHash) return fromHash;
  } catch {
    // ignore malformed hash
  }
  try {
    const fromLocal = decodeState(globalThis.localStorage?.getItem(STORAGE_KEY));
    if (fromLocal) return fromLocal;
  } catch {
    // ignore unavailable/blocked storage
  }
  return null;
}

function saveState(state) {
  const encoded = encodeState(state);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, encoded);
  } catch {
    // ignore unavailable/blocked storage
  }
  try {
    globalThis.history?.replaceState?.(null, "", `#${encoded}`);
  } catch {
    // ignore environments without history API
  }
}

// --- resizing helpers ---

function resizeMatrix(matrix, oldCount, newCount) {
  const next = createMatrix(newCount);
  const overlap = Math.min(oldCount, newCount);
  for (let i = 0; i < overlap; i++) {
    for (let j = 0; j < overlap; j++) next[i][j] = matrix[i][j];
  }
  return next;
}

function resizePositions(positions, newCount) {
  const next = createPositions(newCount);
  const overlap = Math.min(positions.length, newCount);
  for (let i = 0; i < overlap; i++) next[i] = positions[i];
  return next;
}

export function createStore() {
  const listeners = new Set();
  let state = loadState() ?? defaultState();

  function commit(nextState) {
    state = nextState;
    saveState(state);
    for (const listener of listeners) listener(state);
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setPlateCount(plateCount) {
      if (plateCount < MIN_PLATES || plateCount > MAX_PLATES) return;
      if (plateCount === state.plateCount) return;
      commit({
        plateCount,
        matrix: resizeMatrix(state.matrix, state.plateCount, plateCount),
        positions: resizePositions(state.positions, plateCount),
      });
    },

    cycleMatrixCell(row, col) {
      if (row === col) return; // diagonal is "Self", not editable
      const matrix = state.matrix.map((cells) => cells.slice());
      matrix[row][col] = NEXT_LINK[matrix[row][col]];
      commit({ ...state, matrix });
    },

    setPosition(plate, value) {
      if (value < POS_MIN || value > POS_MAX) return;
      const positions = state.positions.slice();
      positions[plate] = value;
      commit({ ...state, positions });
    },

    resetPositions() {
      commit({ ...state, positions: createPositions(state.plateCount) });
    },

    clearAll() {
      commit(defaultState());
    },
  };
}
