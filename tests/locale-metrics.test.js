import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_LOCALE, Locale } from "../src/i18n/index.js";
import { localeChangeDirection } from "../src/analytics/locale-metrics.js";
import { LocaleChangeDirection } from "../src/analytics/values.js";

test("localeChangeDirection detects revert to default", () => {
  assert.equal(
    localeChangeDirection({ locale: Locale.EN, previousLocale: Locale.DE }),
    LocaleChangeDirection.TO_DEFAULT,
  );
});

test("localeChangeDirection detects switch to translation", () => {
  assert.equal(
    localeChangeDirection({ locale: Locale.DE, previousLocale: Locale.EN }),
    LocaleChangeDirection.TO_TRANSLATION,
  );
});

test("localeChangeDirection detects between translations", () => {
  assert.equal(
    localeChangeDirection({ locale: Locale.PL, previousLocale: Locale.DE }),
    LocaleChangeDirection.BETWEEN_TRANSLATIONS,
  );
});

test("localeChangeDirection returns null when locale unchanged", () => {
  assert.equal(
    localeChangeDirection({ locale: Locale.DE, previousLocale: Locale.DE }),
    null,
  );
});

test("localeChangeDirection uses DEFAULT_LOCALE as default", () => {
  assert.equal(
    localeChangeDirection({ locale: DEFAULT_LOCALE, previousLocale: Locale.UKR }),
    LocaleChangeDirection.TO_DEFAULT,
  );
});
