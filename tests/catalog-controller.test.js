import { test } from "node:test";
import assert from "node:assert/strict";

import { createCatalogController } from "../src/controllers/catalog.js";
import { loadCatalog, resetCatalogCache } from "../src/catalog/load.js";

function createStoreStub(initial = {}) {
  let state = {
    catalogId: null,
    catalogName: null,
    catalogPlace: null,
    plateCount: 6,
    matrix: [],
    positions: [],
    masteryLevel: 0,
    breaksBudget: 0,
    removedLinks: [],
    ...initial,
  };
  return {
    getState: () => state,
    setState(next) {
      state = { ...state, ...next };
    },
    loadLock(next) {
      state = {
        ...state,
        catalogId: next.catalogId ?? null,
        catalogName: next.catalogName ?? null,
        catalogPlace: next.catalogPlace ?? null,
      };
      return true;
    },
  };
}

function withUrl(href, run) {
  const hrefs = [];
  const location = {
    href,
    get pathname() {
      return new URL(this.href).pathname;
    },
    get search() {
      return new URL(this.href).search;
    },
    get hash() {
      return new URL(this.href).hash;
    },
  };
  const history = {
    replaceState(_s, _t, url) {
      hrefs.push(url);
      location.href = `https://example.com${url}`;
    },
  };
  const saved = { location: globalThis.location, history: globalThis.history };
  globalThis.location = location;
  globalThis.history = history;
  try {
    return run({ hrefs, location });
  } finally {
    globalThis.location = saved.location;
    globalThis.history = saved.history;
  }
}

test("onLockEdited clears ?lock= only after catalog identity is gone", () => {
  withUrl("https://example.com/?lock=OC_Chest_Armory_01_Lock", ({ hrefs }) => {
    const store = createStoreStub({ catalogId: "OC_Chest_Armory_01_Lock" });
    const catalog = createCatalogController({
      store,
      solve: { invalidate() {}, onSolve() {}, hasActiveSolution: () => false },
      onRerender() {},
    });

    catalog.onLockEdited();
    assert.equal(
      hrefs.length,
      0,
      "must not strip ?lock= while the loaded lock still has catalog identity",
    );

    store.setState({ catalogId: null, catalogName: null, catalogPlace: null });
    catalog.onLockEdited();
    assert.ok(
      hrefs.some((url) => !url.includes("lock=")),
      "must strip ?lock= after catalog identity is cleared",
    );
  });
});

test("onCatalogPlace is a plain setter without toggle-off", async () => {
  resetCatalogCache();
  await loadCatalog({
    url: "/fake-place",
    fetch: async () => ({
      ok: true,
      async json() {
        return {
          entries: [
            {
              id: "a",
              name: "A",
              place: "Old Camp",
              plateCount: 4,
              positions: [0, 0, 0, 0],
              matrix: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
              ],
            },
          ],
        };
      },
    }),
  });

  const catalog = createCatalogController({
    store: createStoreStub(),
    solve: { invalidate() {}, onSolve() {}, hasActiveSolution: () => false },
    onRerender() {},
  });
  await catalog.handlers.onOpenCatalog();

  catalog.handlers.onCatalogPlace("Old Camp");
  assert.equal(catalog.getUiState().place, "Old Camp");
  catalog.handlers.onCatalogPlace("Old Camp");
  assert.equal(catalog.getUiState().place, "Old Camp", "re-selecting same place must not clear");

  catalog.handlers.onCatalogQuery("zzz");
  catalog.handlers.onClearCatalogFilters();
  assert.equal(catalog.getUiState().query, "");
  assert.equal(catalog.getUiState().place, "");

  resetCatalogCache();
});

test("onRetryCatalogLoad recovers after a failed open", async () => {
  resetCatalogCache();
  let calls = 0;
  const failingThenOk = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: false, status: 500, async json() { return {}; } };
    }
    return {
      ok: true,
      async json() {
        return {
          entries: [
            {
              id: "a",
              name: "A",
              place: "Old Camp",
              plateCount: 4,
              positions: [0, 0, 0, 0],
              matrix: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
              ],
            },
          ],
        };
      },
    };
  };

  // Seed cache path: controller uses loadCatalog() with default URL.
  // Override via first failed ensure by mocking global fetch.
  const prevFetch = globalThis.fetch;
  globalThis.fetch = failingThenOk;

  try {
    const catalog = createCatalogController({
      store: createStoreStub(),
      solve: { invalidate() {}, onSolve() {}, hasActiveSolution: () => false },
      onRerender() {},
    });

    await catalog.handlers.onOpenCatalog();
    assert.ok(catalog.getUiState().loadError);

    await catalog.handlers.onRetryCatalogLoad();
    assert.equal(catalog.getUiState().loadError, null);
    assert.equal(catalog.getUiState().entries.length, 1);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = prevFetch;
    resetCatalogCache();
  }
});

test("applyEntry does not sync URL or track when loadLock fails", async () => {
  resetCatalogCache();
  await loadCatalog({
    url: "/fake-apply",
    fetch: async () => ({
      ok: true,
      async json() {
        return {
          entries: [
            {
              id: "ok",
              name: "Ok",
              place: "Old Camp",
              plateCount: 4,
              positions: [0, 0, 0, 0],
              matrix: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
              ],
            },
          ],
        };
      },
    }),
  });

  await withUrl("https://example.com/", async ({ hrefs }) => {
    let tracked = 0;
    let solved = 0;
    const store = createStoreStub();
    store.loadLock = () => false;

    const catalog = createCatalogController({
      store,
      solve: {
        invalidate() {},
        onSolve() {
          solved += 1;
        },
        hasActiveSolution: () => false,
      },
      onRerender() {},
      trackLoaded() {
        tracked += 1;
      },
    });

    await catalog.handlers.onOpenCatalog();
    catalog.handlers.onSelectCatalogLock("ok");

    assert.equal(tracked, 0);
    assert.equal(solved, 0);
    assert.equal(hrefs.length, 0);
    assert.equal(catalog.isOpen(), true);
  });

  resetCatalogCache();
});
