import { StorageKeys, StorageFlag } from "./storage-keys.js";
import { resolveReferrerLocaleHint } from "./referrer-locale-hints.js";
import enCatalog from "../locales/en.json" with { type: "json" };

export const Locale = Object.freeze({
  EN: "en",
  DE: "de",
  PL: "pl",
  UKR: "ukr",
});

export const DEFAULT_LOCALE = Locale.EN;
export const SUPPORTED_LOCALES = Object.freeze([
  Locale.EN,
  Locale.DE,
  Locale.PL,
  Locale.UKR,
]);

export const LocaleSource = Object.freeze({
  QUERY: "query",
  STORAGE: "storage",
  DEFAULT: "default",
  SUGGEST: "suggest",
});

/** Tier B — always read from English catalog (layout-safe compact UI). */
export const FROZEN_KEYS = new Set([
  "coupling.with",
  "coupling.against",
  "coupling.gone",
  "coupling.goneDone",
  "solve.cta",
  "nav.next",
  "nav.back",
  "nav.done",
  "nav.backChevron",
  "nav.nextChevron",
  "mastery.untrained",
  "mastery.trained",
  "mastery.trainedCost",
  "mastery.master",
  "mastery.masterCost",
  "direction.left",
  "direction.right",
]);

const HTML_LANG = Object.freeze({
  [Locale.EN]: "en-GB",
  [Locale.DE]: "de",
  [Locale.PL]: "pl",
  [Locale.UKR]: "uk",
});

/** BCP 47 tags for hreflang. */
const HREFLANG = Object.freeze({
  [Locale.EN]: "en",
  [Locale.DE]: "de",
  [Locale.PL]: "pl",
  [Locale.UKR]: "uk", // ISO 639-1; internal locale id remains Locale.UKR
});

export const SITE_ORIGIN = "https://gothiclockbreaker.com";
const SLAVIC_LOCALES = new Set([Locale.PL, Locale.UKR]);
const catalogs = {
  [Locale.EN]: enCatalog,
  [Locale.DE]: null,
  [Locale.PL]: null,
  [Locale.UKR]: null,
};
let activeLocale = DEFAULT_LOCALE;
let localeSource = LocaleSource.DEFAULT;
const listeners = new Set();

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function isDefaultLocale(locale) {
  return locale === DEFAULT_LOCALE;
}

/** True when init should write resolved locale to storage (query deeplink or suggest accept). */
export function shouldPersistLocaleOnInit(source) {
  return source === LocaleSource.QUERY || source === LocaleSource.SUGGEST;
}

export function localePageUrl(locale, origin = SITE_ORIGIN) {
  return isDefaultLocale(locale) ? `${origin}/` : `${origin}/?lang=${locale}`;
}

/** Path + query for in-app locale URL sync (preserves hash; omits ?lang= for English). */
export function localeBrowserPath(locale, search = "") {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (isDefaultLocale(locale)) {
    params.delete("lang");
  } else {
    params.set("lang", locale);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function syncBrowserLocaleUrl(locale) {
  if (typeof location === "undefined" || typeof history === "undefined") return;
  const nextPath = localeBrowserPath(locale, location.search);
  const nextUrl = `${nextPath}${location.hash}`;
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  if (nextUrl !== currentUrl) {
    history.replaceState(history.state, "", nextUrl);
  }
}

/** Pure resolution for tests and init — query beats storage beats referrer hint beats default. */
export function resolveLocalePreference({
  queryLang,
  storedLocale,
  referrer = "",
  localeSuggestDismissed = false,
}) {
  if (queryLang && SUPPORTED_LOCALES.includes(queryLang)) {
    return { locale: queryLang, source: LocaleSource.QUERY };
  }
  if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) {
    return { locale: storedLocale, source: LocaleSource.STORAGE };
  }
  if (!localeSuggestDismissed) {
    const referrerHint = resolveReferrerLocaleHint(referrer);
    if (referrerHint && SUPPORTED_LOCALES.includes(referrerHint.locale)) {
      return { locale: referrerHint.locale, source: LocaleSource.QUERY };
    }
  }
  return { locale: DEFAULT_LOCALE, source: LocaleSource.DEFAULT };
}

function resolveInitialLocale() {
  const params = new URLSearchParams(location.search);
  const localeSuggestDismissed =
    sessionGet(StorageKeys.LOCALE_SUGGEST_SESSION_DISMISSED) === StorageFlag.SET;
  const { locale, source } = resolveLocalePreference({
    queryLang: params.get("lang"),
    storedLocale: storageGet(StorageKeys.LOCALE),
    referrer: typeof document !== "undefined" ? document.referrer : "",
    localeSuggestDismissed,
  });
  localeSource = source;
  return locale;
}

function lookup(catalog, key) {
  if (!catalog) return undefined;
  const parts = key.split(".");
  let node = catalog;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

function format(template, params = {}) {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = params[name];
    return value === undefined || value === null ? `{${name}}` : String(value);
  });
}

async function loadCatalog(locale) {
  if (catalogs[locale]) return catalogs[locale];
  const response = await fetch(`locales/${locale}.json`);
  if (!response.ok) throw new Error(`Failed to load locale ${locale}`);
  catalogs[locale] = await response.json();
  return catalogs[locale];
}

function setLinkHref(rel, href) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.append(link);
  }
  link.href = href;
}

function ensureHreflangLinks() {
  const head = document.head;
  for (const locale of SUPPORTED_LOCALES) {
    const id = `hreflang-${locale}`;
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "alternate";
      head.append(link);
    }
    link.hreflang = HREFLANG[locale] ?? locale;
    link.href = localePageUrl(locale);
  }
  let defaultLink = document.getElementById("hreflang-x-default");
  if (!defaultLink) {
    defaultLink = document.createElement("link");
    defaultLink.id = "hreflang-x-default";
    defaultLink.rel = "alternate";
    defaultLink.hreflang = "x-default";
    head.append(defaultLink);
  }
  defaultLink.href = localePageUrl(DEFAULT_LOCALE);
}

function setMetaContent(selector, value) {
  const node = document.querySelector(selector);
  if (node && value) node.setAttribute("content", value);
}

export function applyDocumentLocale(locale = activeLocale) {
  const catalog = catalogs[locale] ?? catalogs[Locale.EN];
  document.documentElement.lang = HTML_LANG[locale] ?? HTML_LANG[Locale.EN];

  const title = lookup(catalog, "seo.title") ?? lookup(catalogs[Locale.EN], "seo.title");
  const description =
    lookup(catalog, "seo.description") ?? lookup(catalogs[Locale.EN], "seo.description");
  const ogAlt =
    lookup(catalog, "seo.ogImageAlt") ?? lookup(catalogs[Locale.EN], "seo.ogImageAlt");

  if (title) document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[property="og:image:alt"]', ogAlt);

  const pageUrl = localePageUrl(locale);
  setLinkHref("canonical", pageUrl);
  setMetaContent('meta[property="og:url"]', pageUrl);

  ensureHreflangLinks();
}

export function getLocale() {
  return activeLocale;
}

export function getLocaleSource() {
  return localeSource;
}

function resolveLocaleForKey(key) {
  return FROZEN_KEYS.has(key) ? DEFAULT_LOCALE : activeLocale;
}

function resolveTemplate(key, locale = activeLocale) {
  return lookup(catalogs[locale], key) ?? lookup(catalogs[Locale.EN], key);
}

/** CLDR-style one / few / many for Slavic locales; English-style one / many elsewhere. */
export function pluralForm(locale, count) {
  const n = Math.abs(Number(count));
  if (!Number.isFinite(n)) return "many";
  if (!SLAVIC_LOCALES.has(locale)) return n === 1 ? "one" : "many";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
  return "many";
}

const PLURAL_FALLBACK_SUFFIX = Object.freeze({
  one: ["One", "Many"],
  few: ["Few", "Many"],
  many: ["Many"],
});

/** Pick turnCountOne / turnCountFew / turnCountMany (or showAll*) from `count`. */
export function tCount(keyBase, count, params = {}) {
  const locale = resolveLocaleForKey(keyBase);
  const form = pluralForm(locale, count);
  const merged = { n: count, count, ...params };

  for (const suffix of PLURAL_FALLBACK_SUFFIX[form]) {
    const key = `${keyBase}${suffix}`;
    const template = resolveTemplate(key, locale);
    if (template) return format(template, merged);
  }

  const bare = resolveTemplate(keyBase, locale);
  if (bare) return format(bare, merged);
  return format(keyBase, merged);
}

export function t(key, params) {
  const locale = resolveLocaleForKey(key);
  const template = resolveTemplate(key, locale) ?? key;
  return format(template, params);
}

export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyLocaleChange(locale, changeSource) {
  for (const listener of listeners) {
    listener(locale, changeSource);
  }
}

export async function initI18n() {
  activeLocale = resolveInitialLocale();

  if (shouldPersistLocaleOnInit(localeSource)) {
    storageSet(StorageKeys.LOCALE, activeLocale);
  }

  if (!isDefaultLocale(activeLocale)) {
    try {
      await loadCatalog(activeLocale);
    } catch {
      activeLocale = DEFAULT_LOCALE;
      localeSource = LocaleSource.DEFAULT;
    }
  }

  applyDocumentLocale(activeLocale);
  return activeLocale;
}

export async function setLocale(locale, { changeSource, localeSource: nextSource } = {}) {
  if (!SUPPORTED_LOCALES.includes(locale) || locale === activeLocale) return activeLocale;
  try {
    if (!catalogs[locale]) await loadCatalog(locale);
  } catch {
    return activeLocale;
  }
  activeLocale = locale;
  if (nextSource) localeSource = nextSource;
  storageSet(StorageKeys.LOCALE, locale);
  applyDocumentLocale(locale);
  syncBrowserLocaleUrl(locale);
  notifyLocaleChange(locale, changeSource);
  return activeLocale;
}
