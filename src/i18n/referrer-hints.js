/** Press-referrer locale hints — no i18n import (used at init before catalogs load). */

export const ReferrerHintSource = Object.freeze({
  REFERRER: "referrer",
});

export const REFERRER_LOCALE_HINTS = Object.freeze([
  { pattern: /(^|\.)pcgames\.de$/i, locale: "de" },
  { pattern: /(^|\.)buffed\.de$/i, locale: "de" },
  { pattern: /(^|\.)gamestar\.de$/i, locale: "de" },
  { pattern: /(^|\.)ithardware\.pl$/i, locale: "pl" },
]);

/** @param {string} referrer */
export function parseReferrerHost(referrer) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** @param {string} [referrer] */
export function resolveReferrerLocaleHint(referrer = "") {
  const host = parseReferrerHost(referrer);
  if (!host) return null;
  for (const { pattern, locale } of REFERRER_LOCALE_HINTS) {
    if (pattern.test(host)) {
      return { locale, hintSource: ReferrerHintSource.REFERRER };
    }
  }
  return null;
}
