import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { createUiPrefs } from "../src/storage/prefs.js";
import { EARLIEST_BASELINE } from "../src/core/feature-badges.js";

// prefs.js reads the global localStorage at call time, so a memory stub is all
// the backfill/dismissal methods need under node.
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

test("first-time visitor anchors firstSeenVersion to the current version", () => {
  const prefs = createUiPrefs();
  assert.equal(prefs.ensureFirstSeenVersion("1.34.0", false), "1.34.0");
  assert.equal(prefs.firstSeenVersion(), "1.34.0");
});

test("already-visited user backfills firstSeenVersion to the earliest baseline", () => {
  const prefs = createUiPrefs();
  assert.equal(prefs.ensureFirstSeenVersion("1.34.0", true), EARLIEST_BASELINE);
  assert.equal(prefs.firstSeenVersion(), EARLIEST_BASELINE);
});

test("ensureFirstSeenVersion is idempotent — only the first call writes", () => {
  const prefs = createUiPrefs();
  prefs.ensureFirstSeenVersion("1.34.0", true);
  assert.equal(prefs.ensureFirstSeenVersion("2.0.0", false), EARLIEST_BASELINE);
  assert.equal(prefs.firstSeenVersion(), EARLIEST_BASELINE);
});

test("dismissBadge persists ids without duplicates", () => {
  const prefs = createUiPrefs();
  assert.deepEqual(prefs.dismissedBadges(), []);
  prefs.dismissBadge("camp");
  prefs.dismissBadge("camp");
  prefs.dismissBadge("hotkeys");
  assert.deepEqual(prefs.dismissedBadges(), ["camp", "hotkeys"]);
});
