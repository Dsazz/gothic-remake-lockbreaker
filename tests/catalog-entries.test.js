import { test } from "node:test";
import assert from "node:assert/strict";

import { catalogEntryFromRemote, filterCatalog } from "../src/catalog/entries.js";

const ARMORY = {
  lockId: "OC_Chest_Armory_01_Lock",
  name: "Armory 01 Chest",
  description: "Old Camp",
  fullSetup: "P5=4 P4=7 P3=2 P2=7 P1=7 P5>P1-,P2-,P3,P4 P4>P2,P5- P3>P4- P2>P1- P1>P2-,P3-",
  k1: "P4>P5-",
  k2: "P2>P1-",
};

test("catalogEntryFromRemote keeps id/name/place and dormant k1/k2 with domain lock", () => {
  const entry = catalogEntryFromRemote(ARMORY);
  assert.equal(entry.id, "OC_Chest_Armory_01_Lock");
  assert.equal(entry.name, "Armory 01 Chest");
  assert.equal(entry.place, "Old Camp");
  assert.equal(entry.k1, "P4>P5-");
  assert.equal(entry.k2, "P2>P1-");
  assert.equal(entry.plateCount, 5);
  assert.equal(entry.positions.length, 5);
  assert.equal(entry.matrix.length, 5);
});

test("filterCatalog matches name substring and place", () => {
  const entries = [
    catalogEntryFromRemote(ARMORY),
    catalogEntryFromRemote({
      ...ARMORY,
      lockId: "NC_Chest_Gorn_Lock",
      name: "Gorn Chest",
      description: "New Camp",
    }),
  ];

  assert.equal(filterCatalog(entries, { query: "armory" }).length, 1);
  assert.equal(filterCatalog(entries, { place: "New Camp" })[0].id, "NC_Chest_Gorn_Lock");
  assert.equal(filterCatalog(entries, { query: "chest", place: "Old Camp" }).length, 1);
});
