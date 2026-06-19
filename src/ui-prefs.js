import { StorageKeys, StorageFlag } from "./storage-keys.js";

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
    wasSharePromptShownThisSession() {
      return sessionGet(StorageKeys.SHARE_PROMPT_SESSION_SHOWN) === StorageFlag.SET;
    },
    markSharePromptShownThisSession() {
      sessionSet(StorageKeys.SHARE_PROMPT_SESSION_SHOWN, StorageFlag.SET);
    },
    isHashFailureCoachmarkSeen() {
      return storageGet(StorageKeys.HASH_FAILURE_COACHMARK_SEEN) === StorageFlag.SET;
    },
    markHashFailureCoachmarkSeen() {
      storageSet(StorageKeys.HASH_FAILURE_COACHMARK_SEEN, StorageFlag.SET);
    },
  };
}
