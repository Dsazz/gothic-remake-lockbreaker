import {
  DEFAULT_MASTERY_ID,
  MIN_PLATES,
  MAX_PLATES,
  POS_MIN,
  POS_MAX,
  LINK,
  createRemovedLinks,
} from "../core/domain.js";
import { parseFullSetup } from "./notation.js";

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   place: string,
 *   plateCount: number,
 *   positions: number[],
 *   matrix: number[][],
 *   k1: string | null,
 *   k2: string | null,
 * }} CatalogEntry
 */

const LINK_VALUES = new Set([LINK.NONE, LINK.SAME, LINK.OPP]);

/** @param {unknown} entry @returns {entry is CatalogEntry} */
export function isValidCatalogEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  const row = /** @type {Record<string, unknown>} */ (entry);
  if (typeof row.id !== "string" || !row.id) return false;
  if (typeof row.name !== "string" || !row.name) return false;
  if (typeof row.place !== "string" || !row.place) return false;
  if (
    !Number.isInteger(row.plateCount) ||
    /** @type {number} */ (row.plateCount) < MIN_PLATES ||
    /** @type {number} */ (row.plateCount) > MAX_PLATES
  ) {
    return false;
  }
  const plateCount = /** @type {number} */ (row.plateCount);
  if (!Array.isArray(row.positions) || row.positions.length !== plateCount) return false;
  if (
    !row.positions.every((pos) => Number.isInteger(pos) && pos >= POS_MIN && pos <= POS_MAX)
  ) {
    return false;
  }
  if (!Array.isArray(row.matrix) || row.matrix.length !== plateCount) return false;
  for (const cells of row.matrix) {
    if (!Array.isArray(cells) || cells.length !== plateCount) return false;
    if (!cells.every((cell) => LINK_VALUES.has(cell))) return false;
  }
  return true;
}

/** @param {unknown} rawEntries @returns {CatalogEntry[]} */
export function normalizeCatalogEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries.filter(isValidCatalogEntry);
}

/**
 * @param {{
 *   lockId: string,
 *   name: string,
 *   description: string,
 *   fullSetup: string,
 *   k1?: string,
 *   k2?: string,
 * }} remote
 * @returns {CatalogEntry}
 */
export function catalogEntryFromRemote(remote) {
  const parsed = parseFullSetup(remote.fullSetup);
  return {
    id: remote.lockId,
    name: remote.name,
    place: remote.description,
    plateCount: parsed.plateCount,
    positions: parsed.positions,
    matrix: parsed.matrix,
    k1: remote.k1 ?? null,
    k2: remote.k2 ?? null,
  };
}

/**
 * @param {CatalogEntry[]} entries
 * @param {{ query?: string, place?: string }} [filters]
 * @returns {CatalogEntry[]}
 */
export function filterCatalog(entries, filters = {}) {
  const query = (filters.query || "").trim().toLowerCase();
  const place = (filters.place || "").trim();

  return entries.filter((entry) => {
    if (place && entry.place !== place) return false;
    if (!query) return true;
    return entry.name.toLowerCase().includes(query) || entry.place.toLowerCase().includes(query);
  });
}

/** @param {CatalogEntry[]} entries */
export function catalogPlaces(entries) {
  const places = [];
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.place)) continue;
    seen.add(entry.place);
    places.push(entry.place);
  }
  return places.sort((a, b) => a.localeCompare(b));
}

/** @param {CatalogEntry[]} entries @param {string} id */
export function findCatalogEntry(entries, id) {
  return entries.find((entry) => entry.id === id) ?? null;
}

/**
 * Lock state for store.loadLock — full couplings; mastery defaults; k1/k2 not applied.
 * @param {CatalogEntry} entry
 */
export function catalogEntryToLockState(entry) {
  return {
    plateCount: entry.plateCount,
    positions: entry.positions.slice(),
    matrix: entry.matrix.map((row) => row.slice()),
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(entry.plateCount),
    catalogId: entry.id,
    catalogName: entry.name,
    catalogPlace: entry.place,
  };
}
