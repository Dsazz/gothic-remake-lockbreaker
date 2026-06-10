import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_LOCALE,
  FROZEN_KEYS,
  Locale,
  LocaleSource,
  SITE_ORIGIN,
  SUPPORTED_LOCALES,
  isDefaultLocale,
  localePageUrl,
  pluralForm,
  resolveLocalePreference,
  shouldPersistLocaleOnInit,
} from "../src/i18n.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadLocale(code) {
  const raw = await readFile(join(root, "locales", `${code}.json`), "utf8");
  return JSON.parse(raw);
}

function flattenKeys(node, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

test("supported locales match Locale constants", () => {
  assert.deepEqual(SUPPORTED_LOCALES, [
    Locale.EN,
    Locale.DE,
    Locale.PL,
    Locale.UKR,
  ]);
});

test("isDefaultLocale identifies English only", () => {
  assert.equal(isDefaultLocale(Locale.EN), true);
  assert.equal(isDefaultLocale(Locale.DE), false);
});

test("resolveLocalePreference prioritizes query over storage over default", () => {
  assert.deepEqual(
    resolveLocalePreference({ queryLang: Locale.DE, storedLocale: Locale.PL }),
    { locale: Locale.DE, source: LocaleSource.QUERY },
  );
  assert.deepEqual(
    resolveLocalePreference({ queryLang: null, storedLocale: Locale.PL }),
    { locale: Locale.PL, source: LocaleSource.STORAGE },
  );
  assert.deepEqual(
    resolveLocalePreference({ queryLang: null, storedLocale: null }),
    { locale: DEFAULT_LOCALE, source: LocaleSource.DEFAULT },
  );
});

test("shouldPersistLocaleOnInit is true only for query source", () => {
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.QUERY), true);
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.STORAGE), false);
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.DEFAULT), false);
});

test("localePageUrl uses root for default locale", () => {
  assert.equal(localePageUrl(Locale.EN), `${SITE_ORIGIN}/`);
  assert.equal(localePageUrl(Locale.DE), `${SITE_ORIGIN}/?lang=de`);
  assert.equal(localePageUrl(Locale.UKR), `${SITE_ORIGIN}/?lang=ukr`);
});

test("frozen keys are defined in English catalog", async () => {
  const en = await loadLocale(Locale.EN);
  const enKeys = new Set(flattenKeys(en));
  for (const key of FROZEN_KEYS) {
    assert.ok(enKeys.has(key), `missing frozen key in en.json: ${key}`);
  }
});

test("Slavic plural forms follow CLDR one/few/many", () => {
  const cases = [
    [1, "one"],
    [2, "few"],
    [4, "few"],
    [5, "many"],
    [11, "many"],
    [12, "many"],
    [21, "many"],
    [22, "few"],
    [24, "few"],
    [25, "many"],
  ];
  for (const [n, expected] of cases) {
    assert.equal(pluralForm(Locale.PL, n), expected, `pl ${n}`);
    assert.equal(pluralForm(Locale.UKR, n), expected, `ukr ${n}`);
  }
  assert.equal(pluralForm(Locale.EN, 1), "one");
  assert.equal(pluralForm(Locale.EN, 2), "many");
  assert.equal(pluralForm(Locale.DE, 1), "one");
  assert.equal(pluralForm(Locale.DE, 2), "many");
});

test("de pl ukr catalogs cover Tier C keys from English", async () => {
  const en = await loadLocale(Locale.EN);
  const translatedLocales = SUPPORTED_LOCALES.filter((code) => code !== Locale.EN);
  const enKeys = flattenKeys(en);
  const tierC = enKeys.filter((key) => !FROZEN_KEYS.has(key));

  for (const code of translatedLocales) {
    const catalogKeys = new Set(flattenKeys(await loadLocale(code)));
    for (const key of tierC) {
      assert.ok(catalogKeys.has(key), `${code}.json missing Tier C key: ${key}`);
    }
  }
});
