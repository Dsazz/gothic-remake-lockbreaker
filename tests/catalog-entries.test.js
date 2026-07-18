import { test } from "node:test";
import assert from "node:assert/strict";

import { filterCatalog } from "../src/catalog/entries.js";
import { LINK } from "../src/core/domain.js";

const ARMORY = {
  id: "OC_Chest_Armory_01_Lock",
  name: "Armory 01 Chest",
  place: "Old Camp",
  plateCount: 5,
  positions: [3, 3, -2, 3, 0],
  matrix: Array.from({ length: 5 }, () => new Array(5).fill(LINK.NONE)),
};

const GORN = {
  id: "NC_Chest_Gorn_Lock",
  name: "Gorn Chest",
  place: "New Camp",
  plateCount: 4,
  positions: [0, 0, 0, 0],
  matrix: Array.from({ length: 4 }, () => new Array(4).fill(LINK.NONE)),
};

test("filterCatalog matches name substring and place", () => {
  const entries = [ARMORY, GORN];

  assert.equal(filterCatalog(entries, { query: "armory" }).length, 1);
  assert.equal(filterCatalog(entries, { place: "New Camp" })[0].id, "NC_Chest_Gorn_Lock");
  assert.equal(filterCatalog(entries, { query: "chest", place: "Old Camp" }).length, 1);
});
