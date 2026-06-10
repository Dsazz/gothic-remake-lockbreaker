import { isDefaultLocale, Locale, LocaleSource } from "./i18n.js";

export const LocaleHintSource = Object.freeze({
  REFERRER: "referrer",
  GEO: "geo",
});

export const REFERRER_LOCALE_HINTS = Object.freeze([
  { pattern: /(^|\.)pcgames\.de$/i, locale: Locale.DE },
  { pattern: /(^|\.)buffed\.de$/i, locale: Locale.DE },
  { pattern: /(^|\.)gamestar\.de$/i, locale: Locale.DE },
  { pattern: /(^|\.)ithardware\.pl$/i, locale: Locale.PL },
]);

export const GEO_COUNTRY_LOCALE = Object.freeze({
  DE: Locale.DE,
  AT: Locale.DE,
  CH: Locale.DE,
  PL: Locale.PL,
});

const LOCALE_PROMPT_KEYS = Object.freeze({
  [Locale.DE]: "localeSuggest.promptDe",
  [Locale.PL]: "localeSuggest.promptPl",
});

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
      return { locale, hintSource: LocaleHintSource.REFERRER };
    }
  }
  return null;
}

/** @param {string | null | undefined} countryCode */
export function resolveGeoLocaleHint(countryCode) {
  if (!countryCode || typeof countryCode !== "string") return null;
  const locale = GEO_COUNTRY_LOCALE[countryCode.toUpperCase()];
  if (!locale) return null;
  return { locale, hintSource: LocaleHintSource.GEO };
}

export function localeSuggestPromptKey(locale) {
  return LOCALE_PROMPT_KEYS[locale] ?? null;
}

export function isLocaleSuggestEligible({
  localeSource,
  storedLocale,
  dismissed,
  onboardingActive,
  coachmarkActive,
  activeLocale,
}) {
  if (localeSource !== LocaleSource.DEFAULT) return false;
  if (storedLocale) return false;
  if (dismissed) return false;
  if (onboardingActive) return false;
  if (coachmarkActive) return false;
  if (!isDefaultLocale(activeLocale)) return false;
  return true;
}
