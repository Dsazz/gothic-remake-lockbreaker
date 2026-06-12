import { isDefaultLocale, Locale, LocaleSource } from "./i18n.js";
import {
  parseReferrerHost,
  REFERRER_LOCALE_HINTS,
  resolveReferrerLocaleHint as resolveReferrerLocaleHintRaw,
} from "./referrer-locale-hints.js";

export { REFERRER_LOCALE_HINTS, parseReferrerHost };

export const LocaleHintSource = Object.freeze({
  REFERRER: "referrer",
  GEO: "geo",
});

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

/** @param {string} [referrer] */
export function resolveReferrerLocaleHint(referrer = "") {
  const hint = resolveReferrerLocaleHintRaw(referrer);
  if (!hint) return null;
  return { locale: hint.locale, hintSource: LocaleHintSource.REFERRER };
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
  activeLocale,
}) {
  if (localeSource !== LocaleSource.DEFAULT) return false;
  if (storedLocale) return false;
  if (dismissed) return false;
  if (!isDefaultLocale(activeLocale)) return false;
  return true;
}
