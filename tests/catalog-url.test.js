import { test } from "node:test";
import assert from "node:assert/strict";

import { readLockQueryId } from "../src/catalog/url.js";

test("readLockQueryId reads lock from search string", () => {
  assert.equal(readLockQueryId("?lock=OC_Chest_Armory_01_Lock"), "OC_Chest_Armory_01_Lock");
  assert.equal(readLockQueryId("?lang=de"), null);
  assert.equal(readLockQueryId(""), null);
});
