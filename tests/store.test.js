import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeState, decodeState } from "../src/store.js";
import {
  LINK,
  MASTERY,
  DEFAULT_MASTERY_ID,
  createMatrix,
  createPositions,
  createRemovedLinks,
} from "../src/domain.js";

function sampleState(overrides = {}) {
  const plateCount = 4;
  const matrix = createMatrix(plateCount);
  matrix[1][0] = LINK.SAME;
  return {
    plateCount,
    matrix,
    positions: [1, 0, -1, 0],
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
    ...overrides,
  };
}

test("legacy 3-part hash decodes as untrained with no removals", () => {
  const legacy = "4.0000000000000000.3210";
  const decoded = decodeState(legacy);
  assert.ok(decoded);
  assert.equal(decoded.masteryLevel, DEFAULT_MASTERY_ID);
  assert.equal(decoded.breaksBudget, 0);
  assert.equal(decoded.positions.join(","), "0,-1,-2,-3");
});

test("encode/decode round-trip without mastery suffix", () => {
  const state = sampleState();
  const encoded = encodeState(state);
  assert.equal(encoded.split(".").length, 3);
  assert.deepEqual(decodeState(encoded), state);
});

test("encode/decode round-trip with mastery and breaks", () => {
  const state = sampleState({
    masteryLevel: MASTERY.TRAINED.id,
    breaksBudget: 2,
  });
  const encoded = encodeState(state);
  assert.match(encoded, /\.12$/);
  assert.deepEqual(decodeState(encoded), state);
});

test("encode/decode round-trip with removed-link mask", () => {
  const removedLinks = createRemovedLinks(4);
  removedLinks[2][1] = true;
  const state = sampleState({
    masteryLevel: MASTERY.MASTER.id,
    breaksBudget: 2,
    removedLinks,
  });
  const encoded = encodeState(state);
  assert.equal(encoded.split(".").length, 5);
  const decoded = decodeState(encoded);
  assert.deepEqual(decoded, state);
});

test("rejects removed count above breaks budget", () => {
  const removedLinks = createRemovedLinks(4);
  removedLinks[1][0] = true;
  removedLinks[2][0] = true;
  const encoded = encodeState({
    ...sampleState({ masteryLevel: MASTERY.MASTER.id, breaksBudget: 1 }),
    removedLinks,
  });
  assert.equal(decodeState(encoded), null);
});

test("rejects hash with too many segments", () => {
  assert.equal(decodeState("4.0000000000000000.3210.00.extra"), null);
});
