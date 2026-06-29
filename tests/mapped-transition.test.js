import { test } from "node:test";
import assert from "node:assert/strict";

import { advanceMappedTracking } from "../src/bootstrap/mapped-transition.js";

test("pristine to mapped", () => {
  assert.deepEqual(advanceMappedTracking(false, true), {
    wasMapped: true,
    justBecameMapped: true,
  });
});

test("mapped stays mapped", () => {
  assert.deepEqual(advanceMappedTracking(true, true), {
    wasMapped: true,
    justBecameMapped: false,
  });
});

test("mapped to cleared", () => {
  assert.deepEqual(advanceMappedTracking(true, false), {
    wasMapped: false,
    justBecameMapped: false,
  });
});

test("cleared stays cleared", () => {
  assert.deepEqual(advanceMappedTracking(false, false), {
    wasMapped: false,
    justBecameMapped: false,
  });
});
