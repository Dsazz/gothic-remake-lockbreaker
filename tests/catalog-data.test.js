import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { findCatalogEntry, filterCatalog } from "../src/catalog/entries.js";
import { solve } from "../src/core/solver.js";

const catalogPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/catalog/locks.json",
);

test("shipped catalog has 345 entries and Armory 01 solves", async () => {
  const raw = JSON.parse(await readFile(catalogPath, "utf8"));
  assert.equal(raw.entries.length, 345);

  const armory = findCatalogEntry(raw.entries, "OC_Chest_Armory_01_Lock");
  assert.ok(armory);
  assert.equal(armory.place, "Old Camp");
  const path = solve(armory.positions, armory.matrix);
  assert.ok(Array.isArray(path) && path.length > 0);

  assert.ok(filterCatalog(raw.entries, { place: "Old Camp" }).length > 50);
});
