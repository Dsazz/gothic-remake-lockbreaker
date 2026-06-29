import { isDefaultLocale, Locale, LocaleSource } from "./index.js";
import {
  parseReferrerHost,
  REFERRER_LOCALE_HINTS,
  resolveReferrerLocaleHint as resolveReferrerLocaleHintRaw,
} from "./referrer-hints.js";

export { REFERRER_LOCALE_HINTS, parseReferrerHost };

export const LocaleHintSource = Object.freeze({
  REFERRER: "referrer",
  GEO: "geo",
  NAVIGATOR: "navigator",
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

/** Early DE hint from browser language before geo resolves. */
export function resolveNavigatorLocaleHint() {
  if (typeof navigator === "undefined") return null;
  const lang = (navigator.language ?? "").toLowerCase();
  if (!lang.startsWith("de")) return null;
  return { locale: Locale.DE, hintSource: LocaleHintSource.NAVIGATOR };
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
