import { test } from "node:test";
import assert from "node:assert/strict";

import { resetCatalogCache, loadCatalog, findCatalogEntry } from "../src/catalog/load.js";
import { catalogEntryToLockState } from "../src/catalog/entries.js";
import { DEFAULT_MASTERY_ID, createRemovedLinks } from "../src/core/domain.js";

test("loadCatalog fetches once and caches entries", async () => {
  resetCatalogCache();
  let calls = 0;
  const sample = {
    entries: [
      {
        id: "X",
        name: "X",
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
  const fetchFn = async () => {
    calls += 1;
    return {
      ok: true,
      async json() {
        return sample;
      },
    };
  };

  const first = await loadCatalog({ fetch: fetchFn, url: "/fake" });
  const second = await loadCatalog({ fetch: fetchFn, url: "/fake" });
  assert.equal(calls, 1);
  assert.equal(first.length, 1);
  assert.equal(second[0].id, "X");
  assert.equal(findCatalogEntry(first, "X")?.name, "X");
  resetCatalogCache();
});

test("loadCatalog drops invalid entries and rejects all-invalid payloads", async () => {
  resetCatalogCache();
  const fetchFn = async () => ({
    ok: true,
    async json() {
      return {
        entries: [
          { id: "bad" },
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
  });
  const entries = await loadCatalog({ fetch: fetchFn, url: "/fake-mixed" });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "ok");
  resetCatalogCache();

  await assert.rejects(
    () =>
      loadCatalog({
        fetch: async () => ({
          ok: true,
          async json() {
            return { entries: [{ id: "nope" }] };
          },
        }),
        url: "/fake-bad",
      }),
    /invalid/i,
  );
  resetCatalogCache();
});

test("catalogEntryToLockState uses default mastery and keeps catalog id", () => {
  const entry = {
    id: "OC_Chest_Armory_01_Lock",
    name: "Armory 01 Chest",
    place: "Old Camp",
    plateCount: 5,
    positions: [3, 3, -2, 3, 0],
    matrix: Array.from({ length: 5 }, () => new Array(5).fill(0)),
  };
  const state = catalogEntryToLockState(entry);
  assert.equal(state.plateCount, 5);
  assert.equal(state.masteryLevel, DEFAULT_MASTERY_ID);
  assert.equal(state.breaksBudget, 0);
  assert.deepEqual(state.removedLinks, createRemovedLinks(5));
  assert.equal(state.catalogId, "OC_Chest_Armory_01_Lock");
  assert.equal(state.catalogName, "Armory 01 Chest");
  assert.equal(state.catalogPlace, "Old Camp");
});
