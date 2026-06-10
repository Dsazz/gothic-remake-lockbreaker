import { DEFAULT_LOCALE } from "../i18n.js";
import { LocaleChangeDirection } from "./values.js";

export function localeChangeDirection({
  locale,
  previousLocale,
  defaultLocale = DEFAULT_LOCALE,
}) {
  if (locale === previousLocale) return null;
  if (locale === defaultLocale && previousLocale !== defaultLocale) {
    return LocaleChangeDirection.TO_DEFAULT;
  }
  if (locale !== defaultLocale && previousLocale === defaultLocale) {
    return LocaleChangeDirection.TO_TRANSLATION;
  }
  return LocaleChangeDirection.BETWEEN_TRANSLATIONS;
}
