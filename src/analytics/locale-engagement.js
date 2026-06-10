import { VERSION } from "../version.js";
import { getLocale, getLocaleSource, isDefaultLocale } from "../i18n.js";
import { StorageKeys, StorageFlag } from "../storage-keys.js";
import { Events } from "./events.js";
import { LocaleChangeDirection } from "./values.js";
import { sendOnPageHide } from "./transport.js";

const SESSION_END_SENT_KEY = StorageKeys.LOCALE_SESSION_END_SENT;

let initialLocale;
let initialLocaleSource;
let localeSwitchCount = 0;
let everUsedTranslation = false;
let everRevertedToDefault = false;
let installed = false;

export function recordLocaleSwitch({ locale, changeDirection }) {
  localeSwitchCount += 1;
  if (!isDefaultLocale(locale)) {
    everUsedTranslation = true;
  }
  if (changeDirection === LocaleChangeDirection.TO_DEFAULT) {
    everRevertedToDefault = true;
  }
}

export function seedLocaleEngagement({ locale, localeSource }) {
  initialLocale = locale;
  initialLocaleSource = localeSource;
  if (!isDefaultLocale(locale)) {
    everUsedTranslation = true;
  }
}

export function trackLocaleSessionEnd() {
  const finalLocale = getLocale();
  sendOnPageHide(Events.LOCALE_SESSION_END, {
    initial_locale: initialLocale ?? finalLocale,
    initial_locale_source: initialLocaleSource ?? getLocaleSource(),
    final_locale: finalLocale,
    locale_switch_count: localeSwitchCount,
    ever_used_translation: everUsedTranslation,
    ever_reverted_to_default: everRevertedToDefault,
    staying_on_translation: !isDefaultLocale(finalLocale),
    reverted_to_default: everRevertedToDefault,
    app_version: VERSION,
  });
}

function sessionEndAlreadySent() {
  try {
    return sessionStorage.getItem(SESSION_END_SENT_KEY) === StorageFlag.SET;
  } catch {
    return false;
  }
}

function markSessionEndSent() {
  try {
    sessionStorage.setItem(SESSION_END_SENT_KEY, StorageFlag.SET);
  } catch {
    // ignore
  }
}

function clearSessionEndSent() {
  try {
    sessionStorage.removeItem(SESSION_END_SENT_KEY);
  } catch {
    // ignore
  }
}

export function installLocaleEngagementTracking() {
  if (installed) return;
  installed = true;

  window.addEventListener("pagehide", () => {
    if (sessionEndAlreadySent()) return;
    markSessionEndSent();
    trackLocaleSessionEnd();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      clearSessionEndSent();
    }
  });
}
