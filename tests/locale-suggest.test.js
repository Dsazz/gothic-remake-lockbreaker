import { test } from "node:test";
import assert from "node:assert/strict";

import { Locale, LocaleSource } from "../src/i18n.js";
import {
  LocaleHintSource,
  isLocaleSuggestEligible,
  localeSuggestPromptKey,
  parseReferrerHost,
  resolveGeoLocaleHint,
  resolveReferrerLocaleHint,
} from "../src/locale-suggest.js";

test("parseReferrerHost extracts hostname", () => {
  assert.equal(parseReferrerHost("https://www.pcgames.de/foo"), "www.pcgames.de");
  assert.equal(parseReferrerHost(""), null);
  assert.equal(parseReferrerHost("not-a-url"), null);
});

test("resolveReferrerLocaleHint matches German and Polish press domains", () => {
  assert.deepEqual(resolveReferrerLocaleHint("https://www.pcgames.de/article"), {
    locale: Locale.DE,
    hintSource: LocaleHintSource.REFERRER,
  });
  assert.deepEqual(resolveReferrerLocaleHint("https://buffed.de/news"), {
    locale: Locale.DE,
    hintSource: LocaleHintSource.REFERRER,
  });
  assert.deepEqual(resolveReferrerLocaleHint("https://forum.ithardware.pl/topic"), {
    locale: Locale.PL,
    hintSource: LocaleHintSource.REFERRER,
  });
  assert.equal(resolveReferrerLocaleHint("https://www.google.com/"), null);
});

test("resolveGeoLocaleHint maps DACH and Poland", () => {
  assert.deepEqual(resolveGeoLocaleHint("DE"), {
    locale: Locale.DE,
    hintSource: LocaleHintSource.GEO,
  });
  assert.deepEqual(resolveGeoLocaleHint("at"), {
    locale: Locale.DE,
    hintSource: LocaleHintSource.GEO,
  });
  assert.deepEqual(resolveGeoLocaleHint("PL"), {
    locale: Locale.PL,
    hintSource: LocaleHintSource.GEO,
  });
  assert.equal(resolveGeoLocaleHint("US"), null);
  assert.equal(resolveGeoLocaleHint(null), null);
});

test("localeSuggestPromptKey returns keys for DE and PL only", () => {
  assert.equal(localeSuggestPromptKey(Locale.DE), "localeSuggest.promptDe");
  assert.equal(localeSuggestPromptKey(Locale.PL), "localeSuggest.promptPl");
  assert.equal(localeSuggestPromptKey(Locale.UKR), null);
});

test("isLocaleSuggestEligible requires default English cold path", () => {
  const base = {
    localeSource: LocaleSource.DEFAULT,
    storedLocale: null,
    dismissed: false,
    activeLocale: Locale.EN,
  };
  assert.equal(isLocaleSuggestEligible(base), true);

  assert.equal(isLocaleSuggestEligible({ ...base, localeSource: LocaleSource.QUERY }), false);
  assert.equal(isLocaleSuggestEligible({ ...base, storedLocale: Locale.DE }), false);
  assert.equal(isLocaleSuggestEligible({ ...base, dismissed: true }), false);
  assert.equal(isLocaleSuggestEligible({ ...base, activeLocale: Locale.DE }), false);
});
