/** Lazy catalog loader — fetch once, cache in memory. */

import {
  catalogPlaces,
  filterCatalog,
  findCatalogEntry,
  normalizeCatalogEntries,
} from "./entries.js";

const CATALOG_URL = "/assets/catalog/locks.json";

/** @type {import("./entries.js").CatalogEntry[] | null} */
let cachedEntries = null;
/** @type {Promise<import("./entries.js").CatalogEntry[]> | null} */
let loadPromise = null;

/**
 * @param {{ fetch?: typeof fetch, url?: string }} [deps]
 * @returns {Promise<import("./entries.js").CatalogEntry[]>}
 */
export async function loadCatalog(deps = {}) {
  if (cachedEntries) return cachedEntries;
  if (loadPromise) return loadPromise;

  const fetchFn = deps.fetch ?? globalThis.fetch;
  const url = deps.url ?? CATALOG_URL;

  loadPromise = (async () => {
    const response = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Could not load lock catalog (${response.status}).`);
    }
    const payload = await response.json();
    const raw = payload?.entries;
    const entries = normalizeCatalogEntries(raw);
    if (Array.isArray(raw) && raw.length > 0 && entries.length === 0) {
      throw new Error("Catalog data is invalid.");
    }
    cachedEntries = entries;
    return entries;
  })();

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

/** Test helper — clears the in-memory cache. */
export function resetCatalogCache() {
  cachedEntries = null;
  loadPromise = null;
}

export { catalogPlaces, filterCatalog, findCatalogEntry, CATALOG_URL };
