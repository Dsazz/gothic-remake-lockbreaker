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
  DEFAULT_MASTERY_ID,
  MASTERY,
  createMatrix,
  createPositions,
  createRemovedLinks,
  countRemovedLinks,
  maxBreaksBudget,
  masteryForId,
  isValidMasteryId,
} from "./domain.js";

const STORAGE_KEY = "gothic-lockbreaker-state";

const NEXT_LINK = {
  [LINK.NONE]: LINK.SAME,
  [LINK.SAME]: LINK.OPP,
  [LINK.OPP]: LINK.NONE,
};

const LINK_TO_CHAR = { [LINK.NONE]: "0", [LINK.SAME]: "1", [LINK.OPP]: "2" };
const CHAR_TO_LINK = { "0": LINK.NONE, "1": LINK.SAME, "2": LINK.OPP };

function emptyCatalogMeta() {
  return { catalogId: null, catalogName: null, catalogPlace: null };
}

function defaultState() {
  const plateCount = DEFAULT_PLATES;
  return {
    plateCount,
    matrix: createMatrix(plateCount),
    positions: createPositions(plateCount),
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
    ...emptyCatalogMeta(),
  };
}

function withoutCatalogMeta(state) {
  return { ...state, ...emptyCatalogMeta() };
}

function normalizeState(raw) {
  if (!raw) return null;
  const plateCount = raw.plateCount;
  if (!Number.isInteger(plateCount)) return null;
  if (plateCount < MIN_PLATES || plateCount > MAX_PLATES) return null;

  const masteryLevel = raw.masteryLevel ?? DEFAULT_MASTERY_ID;
  if (!isValidMasteryId(masteryLevel)) return null;

  let breaksBudget = raw.breaksBudget ?? 0;
  if (!Number.isInteger(breaksBudget) || breaksBudget < 0) return null;
  breaksBudget = Math.min(breaksBudget, maxBreaksBudget(plateCount));

  const removedLinks = raw.removedLinks ?? createRemovedLinks(plateCount);
  if (countRemovedLinks(removedLinks) > breaksBudget) return null;

  return {
    plateCount,
    matrix: raw.matrix,
    positions: raw.positions,
    masteryLevel,
    breaksBudget,
    removedLinks,
    catalogId: raw.catalogId ?? null,
    catalogName: raw.catalogName ?? null,
    catalogPlace: raw.catalogPlace ?? null,
  };
}

function encodeRemovedMask(removedLinks, plateCount) {
  let mask = "";
  for (let i = 0; i < plateCount; i++) {
    for (let j = 0; j < plateCount; j++) {
      mask += removedLinks[i][j] ? "1" : "0";
    }
  }
  return mask;
}

function decodeRemovedMask(mask, plateCount) {
  if (mask.length !== plateCount * plateCount) return null;
  const removedLinks = createRemovedLinks(plateCount);
  for (let i = 0; i < plateCount; i++) {
    for (let j = 0; j < plateCount; j++) {
      const ch = mask[i * plateCount + j];
      if (ch !== "0" && ch !== "1") return null;
      removedLinks[i][j] = ch === "1";
    }
  }
  return removedLinks;
}

// --- compact, URL-safe serialization ---
// Legacy: "<n>.<matrixDigits>.<positionDigits>"
// Extended: "...<masteryDigit><breaksDigit>[.<removedMask>]"

export function encodeState(state) {
  const { plateCount, matrix, positions, masteryLevel, breaksBudget, removedLinks } = state;
  let cells = "";
  for (let i = 0; i < plateCount; i++) {
    for (let j = 0; j < plateCount; j++) cells += LINK_TO_CHAR[matrix[i][j]];
  }
  const pins = positions.map((value) => String(value - POS_MIN)).join("");
  let encoded = `${plateCount}.${cells}.${pins}`;

  if (masteryLevel !== DEFAULT_MASTERY_ID || breaksBudget !== 0) {
    encoded += `.${masteryLevel}${breaksBudget}`;
    if (countRemovedLinks(removedLinks) > 0) {
      encoded += `.${encodeRemovedMask(removedLinks, plateCount)}`;
    }
  }
  return encoded;
}

export function decodeState(text) {
  if (!text) return null;
  const parts = text.split(".");
  if (parts.length < 3 || parts.length > 5) return null;

  const [rawCount, cells, pins, meta, mask] = parts;
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

  let masteryLevel = DEFAULT_MASTERY_ID;
  let breaksBudget = 0;
  let removedLinks = createRemovedLinks(plateCount);

  if (meta !== undefined) {
    if (meta.length !== 2) return null;
    masteryLevel = Number(meta[0]);
    breaksBudget = Number(meta[1]);
    if (!Number.isInteger(masteryLevel) || !Number.isInteger(breaksBudget)) return null;
    if (!isValidMasteryId(masteryLevel)) return null;
    if (breaksBudget < 0 || breaksBudget > maxBreaksBudget(plateCount)) return null;

    if (mask !== undefined) {
      const decoded = decodeRemovedMask(mask, plateCount);
      if (!decoded) return null;
      removedLinks = decoded;
      if (countRemovedLinks(removedLinks) > breaksBudget) return null;
    }
  }

  return normalizeState({
    plateCount,
    matrix,
    positions,
    masteryLevel,
    breaksBudget,
    removedLinks,
  });
}

// --- storage adapter (browser only; silently no-ops elsewhere) ---

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

function resizeRemovedLinks(removedLinks, oldCount, newCount) {
  const next = createRemovedLinks(newCount);
  const overlap = Math.min(oldCount, newCount);
  for (let i = 0; i < overlap; i++) {
    for (let j = 0; j < overlap; j++) next[i][j] = removedLinks[i][j];
  }
  return next;
}

function clearMasteryProgress(state) {
  return {
    ...state,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(state.plateCount),
  };
}

export function createStore() {
  const listeners = new Set();
  let wasLoadedFromHash = false;
  let state;

  try {
    const fromHash = decodeState(globalThis.location?.hash?.slice(1));
    if (fromHash) {
      state = fromHash;
      wasLoadedFromHash = true;
    }
  } catch {
    // ignore malformed hash
  }

  if (!state) {
    try {
      const fromLocal = decodeState(globalThis.localStorage?.getItem(STORAGE_KEY));
      if (fromLocal) state = fromLocal;
    } catch {
      // ignore unavailable/blocked storage
    }
  }

  state ??= defaultState();

  function commit(nextState) {
    state = normalizeState(nextState) ?? nextState;
    saveState(state);
    for (const listener of listeners) listener(state);
  }

  return {
    get wasLoadedFromHash() {
      return wasLoadedFromHash;
    },

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
      const oldCount = state.plateCount;
      let breaksBudget = Math.min(state.breaksBudget, maxBreaksBudget(plateCount));
      let removedLinks = resizeRemovedLinks(state.removedLinks, oldCount, plateCount);
      while (countRemovedLinks(removedLinks) > breaksBudget && breaksBudget > 0) {
        breaksBudget--;
      }
      if (countRemovedLinks(removedLinks) > breaksBudget) {
        removedLinks = createRemovedLinks(plateCount);
        breaksBudget = 0;
      }
      commit(
        withoutCatalogMeta({
          plateCount,
          matrix: resizeMatrix(state.matrix, oldCount, plateCount),
          positions: resizePositions(state.positions, plateCount),
          masteryLevel: state.masteryLevel,
          breaksBudget,
          removedLinks,
        }),
      );
    },

    setMasteryLevel(masteryLevel) {
      if (!isValidMasteryId(masteryLevel)) return;
      if (masteryLevel === state.masteryLevel) return;
      let next = { ...state, masteryLevel };
      if (masteryLevel !== MASTERY.MASTER.id) {
        next = clearMasteryProgress(next);
      }
      commit(next);
    },

    adjustBreaksBudget(delta) {
      if (masteryForId(state.masteryLevel).id !== MASTERY.MASTER.id) return;
      const max = maxBreaksBudget(state.plateCount);
      const nextBudget = state.breaksBudget + delta;
      if (nextBudget < 0 || nextBudget > max) return;
      if (nextBudget < state.breaksBudget && countRemovedLinks(state.removedLinks) > nextBudget) {
        return;
      }
      commit({ ...state, breaksBudget: nextBudget });
    },

    cycleMatrixCell(row, col) {
      if (row === col) return;
      const matrix = state.matrix.map((cells) => cells.slice());
      matrix[row][col] = NEXT_LINK[matrix[row][col]];
      const removedLinks = state.removedLinks.map((cells) => cells.slice());
      removedLinks[row][col] = false;
      commit(withoutCatalogMeta({ ...state, matrix, removedLinks }));
    },

    toggleLinkRemoved(reactor, turned) {
      if (reactor === turned) return;
      if (masteryForId(state.masteryLevel).id !== MASTERY.MASTER.id) return;
      if (state.breaksBudget <= 0) return;

      const removedLinks = state.removedLinks.map((cells) => cells.slice());
      if (removedLinks[reactor][turned]) {
        removedLinks[reactor][turned] = false;
        commit(withoutCatalogMeta({ ...state, removedLinks }));
        return;
      }
      if (state.matrix[reactor][turned] === LINK.NONE) return;
      if (countRemovedLinks(removedLinks) >= state.breaksBudget) return;
      removedLinks[reactor][turned] = true;
      commit(withoutCatalogMeta({ ...state, removedLinks }));
    },

    setPosition(plate, value) {
      if (value < POS_MIN || value > POS_MAX) return;
      const positions = state.positions.slice();
      positions[plate] = value;
      commit(withoutCatalogMeta({ ...state, positions }));
    },

    resetPositions() {
      commit(withoutCatalogMeta({ ...state, positions: createPositions(state.plateCount) }));
    },

    clearAll() {
      commit(defaultState());
    },

    loadLock(nextState) {
      const normalized = normalizeState({
        ...defaultState(),
        ...nextState,
        removedLinks:
          nextState.removedLinks ?? createRemovedLinks(nextState.plateCount ?? DEFAULT_PLATES),
      });
      if (!normalized) return false;
      commit(normalized);
      return true;
    },
  };
}
