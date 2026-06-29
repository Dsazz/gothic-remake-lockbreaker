import { test } from "node:test";
import assert from "node:assert/strict";
import { StorageKeys, StorageFlag } from "../src/storage/keys.js";

const storage = new Map();
const sessionStorageMap = new Map();

test("createUiPrefs round-trips UI flags", async () => {
  const original = globalThis.localStorage;
  const originalSession = globalThis.sessionStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };
  globalThis.sessionStorage = {
    getItem: (key) => sessionStorageMap.get(key) ?? null,
    setItem: (key, value) => sessionStorageMap.set(key, value),
    removeItem: (key) => sessionStorageMap.delete(key),
    clear: () => sessionStorageMap.clear(),
  };

  try {
    const { createUiPrefs } = await import("../src/storage/prefs.js");
    const prefs = createUiPrefs();

    assert.equal(prefs.hasVisited(), false);
    prefs.markVisited();
    assert.equal(prefs.hasVisited(), true);

    assert.equal(prefs.isHashBannerDismissed(), false);
    prefs.dismissHashBanner();
    assert.equal(prefs.isHashBannerDismissed(), true);

    assert.equal(prefs.isI18nBannerDismissed(), false);
    prefs.dismissI18nBanner();
    assert.equal(prefs.isI18nBannerDismissed(), true);

    assert.equal(prefs.isLocaleSuggestDismissed(), false);
    prefs.dismissLocaleSuggest();
    assert.equal(prefs.isLocaleSuggestDismissed(), true);

    prefs.set(StorageKeys.LOCALE, "de");
    assert.equal(prefs.getStoredLocale(), "de");
    assert.equal(prefs.get(StorageKeys.LOCALE), "de");
    assert.equal(prefs.has(StorageKeys.HAS_VISITED), true);
    prefs.set("custom_key", StorageFlag.SET);
    assert.equal(prefs.has("custom_key"), true);
  } finally {
    globalThis.localStorage = original;
    globalThis.sessionStorage = originalSession;
    storage.clear();
    sessionStorageMap.clear();
  }
});
