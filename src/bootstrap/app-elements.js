/** DOM references for the app shell. Single query site — controllers receive `els`. */
export function getAppElements() {
  return {
    controls: document.getElementById("controls"),
    campSelector: document.getElementById("camp-selector"),
    tumblers: document.getElementById("tumblers"),
    shortcutsHint: document.getElementById("shortcuts-hint"),
    tumblersPanel: document.querySelector(".panel--tumblers"),
    sequencePanel: document.querySelector(".panel--sequence"),
    localeSuggest: document.getElementById("locale-suggest"),
    tutorOptIn: document.getElementById("tutor-opt-in"),
    i18nBanner: document.getElementById("i18n-banner"),
    hashBanner: document.getElementById("hash-banner"),
    mappingWarning: document.getElementById("mapping-warning"),
    solution: document.getElementById("solution"),
    solveBtn: document.getElementById("solve-btn"),
    guide: document.getElementById("how-to-map"),
    catalogBadge: document.getElementById("catalog-badge"),
    browseLocksHowto: document.getElementById("browse-locks-howto"),
    version: document.getElementById("app-version"),
    headSupport: document.getElementById("app-head-support"),
    headPortrait: document.getElementById("app-head-portrait"),
    headSleeper: document.getElementById("app-head-sleeper"),
    headLang: document.getElementById("app-head-lang"),
    foot: document.getElementById("app-foot"),
    ariaLive: document.getElementById("aria-live"),
  };
}
