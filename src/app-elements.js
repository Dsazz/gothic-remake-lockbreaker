/** DOM references for the app shell. Single query site — controllers receive `els`. */
export function getAppElements() {
  return {
    controls: document.getElementById("controls"),
    tumblers: document.getElementById("tumblers"),
    tumblersPanel: document.querySelector(".panel--tumblers"),
    sequencePanel: document.querySelector(".panel--sequence"),
    localeSuggest: document.getElementById("locale-suggest"),
    tutorOptIn: document.getElementById("tutor-opt-in"),
    i18nBanner: document.getElementById("i18n-banner"),
    hashBanner: document.getElementById("hash-banner"),
    sharePrompt: document.getElementById("share-prompt"),
    solution: document.getElementById("solution"),
    solveBtn: document.getElementById("solve-btn"),
    guide: document.getElementById("how-to-map"),
    loadExampleLock: document.getElementById("load-example-lock"),
    version: document.getElementById("app-version"),
    headSupport: document.getElementById("app-head-support"),
    headSleeper: document.getElementById("app-head-sleeper"),
    headLang: document.getElementById("app-head-lang"),
    foot: document.getElementById("app-foot"),
    ariaLive: document.getElementById("aria-live"),
  };
}
