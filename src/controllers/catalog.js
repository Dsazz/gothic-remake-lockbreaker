import { SolveSource } from "../analytics/values.js";
import {
  loadCatalog,
  filterCatalog,
  findCatalogEntry,
  catalogPlaces,
} from "../catalog/load.js";
import { catalogEntryToLockState } from "../catalog/entries.js";
import { shouldConfirmCatalogReplace } from "../catalog/replace.js";
import { readLockQueryId, writeLockQueryId, clearLockQueryId } from "../catalog/url.js";

export function createCatalogController({
  store,
  solve,
  onRerender,
  trackOpened,
  trackLoaded,
}) {
  let open = false;
  let entries = null;
  let loadError = null;
  let loading = false;
  let query = "";
  let place = "";
  let pendingEntry = null;
  let replaceConfirmOpen = false;

  function hasSolutionSession() {
    return Boolean(solve.hasActiveSolution?.());
  }

  function syncLockQuery(catalogId) {
    if (catalogId) writeLockQueryId(catalogId);
    else clearLockQueryId();
  }

  function applyEntry(entry) {
    solve.invalidate();
    const loaded = store.loadLock(catalogEntryToLockState(entry));
    if (!loaded) return false;
    syncLockQuery(entry.id);
    trackLoaded?.({ place: entry.place, plateCount: entry.plateCount });
    solve.onSolve({ auto: true, solveSource: SolveSource.CATALOG });
    open = false;
    replaceConfirmOpen = false;
    pendingEntry = null;
    onRerender();
    return true;
  }

  async function ensureLoaded() {
    if (entries) return entries;
    loading = true;
    loadError = null;
    onRerender();
    try {
      entries = await loadCatalog();
      return entries;
    } catch (error) {
      loadError = error?.message || "Could not load lock catalog.";
      throw error;
    } finally {
      loading = false;
      onRerender();
    }
  }

  const handlers = {
    async onOpenCatalog() {
      open = true;
      trackOpened?.();
      onRerender();
      try {
        await ensureLoaded();
      } catch {
        // loadError surfaced via getUiState
      }
    },

    onCloseCatalog() {
      open = false;
      replaceConfirmOpen = false;
      pendingEntry = null;
      onRerender();
    },

    onCatalogQuery(value) {
      query = value;
      onRerender();
    },

    onCatalogPlace(value) {
      place = value;
      onRerender();
    },

    onClearCatalogFilters() {
      query = "";
      place = "";
      onRerender();
    },

    async onRetryCatalogLoad() {
      entries = null;
      loadError = null;
      try {
        await ensureLoaded();
      } catch {
        // loadError surfaced via getUiState
      }
    },

    onSelectCatalogLock(entryId) {
      const entry = findCatalogEntry(entries || [], entryId);
      if (!entry) return;
      if (shouldConfirmCatalogReplace(store.getState(), hasSolutionSession())) {
        pendingEntry = entry;
        replaceConfirmOpen = true;
        onRerender();
        return;
      }
      applyEntry(entry);
    },

    onConfirmCatalogReplace() {
      if (!pendingEntry) return;
      applyEntry(pendingEntry);
    },

    onCancelCatalogReplace() {
      replaceConfirmOpen = false;
      pendingEntry = null;
      onRerender();
    },
  };

  async function loadFromQuery() {
    const id = readLockQueryId();
    if (!id) return false;
    const list = await ensureLoaded();
    const entry = findCatalogEntry(list, id);
    if (!entry) {
      clearLockQueryId();
      return false;
    }
    applyEntry(entry);
    return Boolean(store.getState().catalogId);
  }

  function onLockEdited() {
    // Keep ?lock= while catalog identity is intact; strip it once edits clear meta.
    if (store.getState().catalogId) return;
    clearLockQueryId();
  }

  return {
    handlers,
    loadFromQuery,
    onLockEdited,
    isOpen: () => open,
    getUiState() {
      const list = entries || [];
      return {
        open,
        loading,
        loadError,
        query,
        place,
        places: catalogPlaces(list),
        entries: filterCatalog(list, { query, place }),
        replaceConfirmOpen,
        pendingName: pendingEntry?.name ?? null,
      };
    },
  };
}
