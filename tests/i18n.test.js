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
  localeBrowserPath,
  localePageUrl,
  pluralForm,
  resolveLocalePreference,
  resolvePathLocale,
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

test("resolvePathLocale maps prerendered subpaths to their locale", () => {
  assert.equal(resolvePathLocale("/de/"), Locale.DE);
  assert.equal(resolvePathLocale("/de"), Locale.DE);
  assert.equal(resolvePathLocale("/pl/"), Locale.PL);
  assert.equal(resolvePathLocale("/uk/"), Locale.UKR);
  assert.equal(resolvePathLocale("/uk"), Locale.UKR);
  assert.equal(resolvePathLocale("/"), null);
  assert.equal(resolvePathLocale("/ukr/"), null);
  assert.equal(resolvePathLocale("/de/extra"), null);
});

test("resolveLocalePreference lets prerendered path win over query, storage, and referrer", () => {
  assert.deepEqual(
    resolveLocalePreference({
      pathLocale: Locale.DE,
      queryLang: Locale.PL,
      storedLocale: Locale.EN,
      referrer: "https://forum.ithardware.pl/topic/1",
    }),
    { locale: Locale.DE, source: LocaleSource.PATH },
  );
  assert.deepEqual(
    resolveLocalePreference({ pathLocale: null, queryLang: Locale.PL }),
    { locale: Locale.PL, source: LocaleSource.QUERY },
  );
});

test("resolveLocalePreference prioritizes query over storage over referrer over default", () => {
  assert.deepEqual(
    resolveLocalePreference({ queryLang: Locale.DE, storedLocale: Locale.PL }),
    { locale: Locale.DE, source: LocaleSource.QUERY },
  );
  assert.deepEqual(
    resolveLocalePreference({ queryLang: null, storedLocale: Locale.PL }),
    { locale: Locale.PL, source: LocaleSource.STORAGE },
  );
  assert.deepEqual(
    resolveLocalePreference({
      queryLang: null,
      storedLocale: null,
      referrer: "https://www.pcgames.de/article/123",
    }),
    { locale: Locale.DE, source: LocaleSource.QUERY },
  );
  assert.deepEqual(
    resolveLocalePreference({
      queryLang: null,
      storedLocale: null,
      referrer: "https://forum.ithardware.pl/topic/1",
    }),
    { locale: Locale.PL, source: LocaleSource.QUERY },
  );
  assert.deepEqual(
    resolveLocalePreference({ queryLang: null, storedLocale: null, referrer: "" }),
    { locale: DEFAULT_LOCALE, source: LocaleSource.DEFAULT },
  );
  assert.deepEqual(
    resolveLocalePreference({
      queryLang: null,
      storedLocale: null,
      referrer: "https://www.pcgames.de/article/123",
      localeSuggestDismissed: true,
    }),
    { locale: DEFAULT_LOCALE, source: LocaleSource.DEFAULT },
  );
});

test("shouldPersistLocaleOnInit persists path landings, query deeplinks, and suggest accept", () => {
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.PATH), true);
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.QUERY), true);
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.SUGGEST), true);
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.STORAGE), false);
  assert.equal(shouldPersistLocaleOnInit(LocaleSource.DEFAULT), false);
});

test("localePageUrl is path-based for every prerendered locale (ukr → /uk/)", () => {
  assert.equal(localePageUrl(Locale.EN), `${SITE_ORIGIN}/`);
  assert.equal(localePageUrl(Locale.DE), `${SITE_ORIGIN}/de/`);
  assert.equal(localePageUrl(Locale.PL), `${SITE_ORIGIN}/pl/`);
  assert.equal(localePageUrl(Locale.UKR), `${SITE_ORIGIN}/uk/`);
});

test("localeBrowserPath uses the prerendered subpath for every non-English locale", () => {
  assert.equal(localeBrowserPath(Locale.EN), "/");
  assert.equal(localeBrowserPath(Locale.EN, "?lang=de"), "/");
  assert.equal(localeBrowserPath(Locale.DE), "/de/");
  assert.equal(localeBrowserPath(Locale.DE, "?lang=pl"), "/de/");
  assert.equal(localeBrowserPath(Locale.PL, "?foo=1"), "/pl/?foo=1");
  assert.equal(localeBrowserPath(Locale.UKR, "?lang=de"), "/uk/");
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

test("locale catalogs expose footer issues link and FAQ strings", async () => {
  for (const code of SUPPORTED_LOCALES) {
    const catalog = await loadLocale(code);
    assert.ok(catalog.footer?.issues, `${code}.json missing footer.issues`);
    assert.ok(catalog.footer?.faqSummary, `${code}.json missing footer.faqSummary`);
    assert.ok(catalog.footer?.faq?.q1, `${code}.json missing footer.faq.q1`);
  }
});

test("de pl ukr catalogs cover Tier C keys from English", async () => {
  const en = await loadLocale(Locale.EN);
  const translatedLocales = SUPPORTED_LOCALES.filter((code) => code !== Locale.EN);
  const enKeys = flattenKeys(en);
  const tierC = enKeys.filter(
    (key) => !FROZEN_KEYS.has(key) && !key.startsWith("localeSuggest."),
  );

  for (const code of translatedLocales) {
    const catalogKeys = new Set(flattenKeys(await loadLocale(code)));
    for (const key of tierC) {
      assert.ok(catalogKeys.has(key), `${code}.json missing Tier C key: ${key}`);
    }
  }
});
