import { StorageKeys, StorageFlag } from "./keys.js";
import { EARLIEST_BASELINE } from "../core/feature-badges.js";

const BADGE_SEPARATOR = ",";

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
    // ignore blocked storage
  }
}

function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore blocked storage
  }
}

function readCampHintCount() {
  return Number.parseInt(storageGet(StorageKeys.CAMP_HINT_SHOWN_COUNT) ?? "0", 10) || 0;
}

/** UI flag persistence — banners, visit marker, locale suggest dismiss. */
export function createUiPrefs() {
  return {
    get(key) {
      return storageGet(key);
    },
    set(key, value) {
      storageSet(key, value);
    },
    has(key) {
      return storageGet(key) === StorageFlag.SET;
    },
    hasVisited() {
      return storageGet(StorageKeys.HAS_VISITED) === StorageFlag.SET;
    },
    markVisited() {
      storageSet(StorageKeys.HAS_VISITED, StorageFlag.SET);
    },
    isHashBannerDismissed() {
      return storageGet(StorageKeys.HASH_BANNER_DISMISSED) === StorageFlag.SET;
    },
    dismissHashBanner() {
      storageSet(StorageKeys.HASH_BANNER_DISMISSED, StorageFlag.SET);
    },
    isI18nBannerDismissed() {
      return storageGet(StorageKeys.I18N_BANNER_DISMISSED) === StorageFlag.SET;
    },
    dismissI18nBanner() {
      storageSet(StorageKeys.I18N_BANNER_DISMISSED, StorageFlag.SET);
    },
    isLocaleSuggestDismissed() {
      return sessionGet(StorageKeys.LOCALE_SUGGEST_SESSION_DISMISSED) === StorageFlag.SET;
    },
    dismissLocaleSuggest() {
      sessionSet(StorageKeys.LOCALE_SUGGEST_SESSION_DISMISSED, StorageFlag.SET);
    },
    getStoredLocale() {
      return storageGet(StorageKeys.LOCALE);
    },
    isGratitudePromptDismissed() {
      return storageGet(StorageKeys.GRATITUDE_PROMPT_DISMISSED) === StorageFlag.SET;
    },
    dismissGratitudePrompt() {
      storageSet(StorageKeys.GRATITUDE_PROMPT_DISMISSED, StorageFlag.SET);
    },
    wasGratitudePromptShown() {
      return storageGet(StorageKeys.GRATITUDE_PROMPT_SHOWN) === StorageFlag.SET;
    },
    markGratitudePromptShown() {
      storageSet(StorageKeys.GRATITUDE_PROMPT_SHOWN, StorageFlag.SET);
    },
    isHashFailureCoachmarkSeen() {
      return storageGet(StorageKeys.HASH_FAILURE_COACHMARK_SEEN) === StorageFlag.SET;
    },
    markHashFailureCoachmarkSeen() {
      storageSet(StorageKeys.HASH_FAILURE_COACHMARK_SEEN, StorageFlag.SET);
    },
    isCampPickerOpened() {
      return storageGet(StorageKeys.CAMP_PICKER_OPENED) === StorageFlag.SET;
    },
    markCampPickerOpened() {
      storageSet(StorageKeys.CAMP_PICKER_OPENED, StorageFlag.SET);
    },
    campHintShownCount() {
      return readCampHintCount();
    },
    wasCampHintShownThisSession() {
      return sessionGet(StorageKeys.CAMP_HINT_SESSION_SHOWN) === StorageFlag.SET;
    },
    // One increment per session: bumps the lifetime count and marks the session
    // so the gate fires the hint at most once per visit until the cap is hit.
    recordCampHintShown() {
      sessionSet(StorageKeys.CAMP_HINT_SESSION_SHOWN, StorageFlag.SET);
      storageSet(StorageKeys.CAMP_HINT_SHOWN_COUNT, String(readCampHintCount() + 1));
    },
    firstSeenVersion() {
      return storageGet(StorageKeys.FIRST_SEEN_VERSION);
    },
    // Stamps the "NEW"-badge baseline once. Already-visited users get the
    // earliest baseline so every current badge counts as new to them; first-time
    // visitors get the current version, suppressing badges for features they are
    // meeting for the first time anyway. Idempotent — only the first call writes.
    ensureFirstSeenVersion(currentVersion, alreadyVisited) {
      const existing = storageGet(StorageKeys.FIRST_SEEN_VERSION);
      if (existing) return existing;
      const baseline = alreadyVisited ? EARLIEST_BASELINE : currentVersion;
      storageSet(StorageKeys.FIRST_SEEN_VERSION, baseline);
      return baseline;
    },
    dismissedBadges() {
      const raw = storageGet(StorageKeys.BADGES_DISMISSED);
      return raw ? raw.split(BADGE_SEPARATOR).filter(Boolean) : [];
    },
    dismissBadge(id) {
      const current = this.dismissedBadges();
      if (current.includes(id)) return;
      current.push(id);
      storageSet(StorageKeys.BADGES_DISMISSED, current.join(BADGE_SEPARATOR));
    },
  };
}
