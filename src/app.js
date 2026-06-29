// Composition root: wires store, controllers, and view. Business logic lives in
// the controllers/ modules; this file only bootstraps and connects them.

import { createStore } from "./core/store.js";
import { isLockMapped } from "./core/domain.js";
import { getAppElements } from "./bootstrap/app-elements.js";
import { createUiPrefs } from "./storage/prefs.js";
import { resolveLandingType } from "./bootstrap/landing.js";
import { createSolveController } from "./controllers/solve.js";
import { createLockController } from "./controllers/lock.js";
import { createLocaleChromeController } from "./controllers/locale-chrome.js";
import { createAppRenderer } from "./bootstrap/app-renderer.js";
import {
  initI18n,
  onLocaleChange,
  getLocale,
  getLocaleSource,
  t,
} from "./i18n/index.js";
import { applyStaticContent } from "./i18n/static-content.js";
import { createOnboardingStub } from "./onboarding/stub.js";
import { createSolveCoachmark } from "./onboarding/solve-coachmark.js";
import { oldCampExample } from "./core/examples.js";
import { initCampTheme, createCampSelector } from "./controllers/camp.js";
import { wireHowToMapImage } from "./bootstrap/how-to-map-image.js";
import { wireInfoModals } from "./controllers/info-modal.js";
import { LandingType, LocaleAutoHintSource } from "./analytics/values.js";
import { resolveStartup, StartupAction } from "./bootstrap/startup.js";
import { LocaleSource, DEFAULT_LOCALE } from "./i18n/index.js";

// Apply the persisted camp theme before any render to avoid a flash of the
// neutral palette for returning users who picked a camp.
const activeCamp = initCampTheme();

const els = getAppElements();
const uiPrefs = createUiPrefs();
const store = createStore();

const landingType = resolveLandingType(
  store.getState(),
  store.wasLoadedFromHash,
  uiPrefs.hasVisited(),
);
uiPrefs.markVisited();

let handlers = {};
const getHandlers = () => handlers;

let renderAll = () => {};
let renderLocaleChrome = () => {};

let locale;
let solve;
let renderer;
let onboarding;
let solveCoachmark;
const analyticsPromise = import("./analytics/index.js");

// Deferred so the one-time camp hint never competes with the onboarding tour or
// the solve coachmark on first paint; it settles after the eye has moved on.
const CAMP_HINT_DELAY_MS = 1200;
// Re-show the discovery nudge across visits (at most once per session) until the
// user opens the picker or we've nudged them this many separate sessions. A
// single missed 7-9s window no longer burns the only chance to teach the control.
const CAMP_HINT_MAX_SESSIONS = 3;

// Nudge that the neutral banner is a clickable camp switcher. Gated to the
// neutral state and to quiet moments (no tour, no coachmark). Idempotent:
// persisting only a real render (once per session) lets every quiet-moment call
// site fire it safely without burning a session/count on a no-op.
function maybeShowCampHint() {
  if (!canShowCampHint()) return;
  setTimeout(() => {
    if (!canShowCampHint()) return;
    if (campSelector.showHint()) uiPrefs.recordCampHintShown();
  }, CAMP_HINT_DELAY_MS);
}

function canShowCampHint() {
  if (uiPrefs.isCampPickerOpened()) return false;
  if (uiPrefs.wasCampHintShownThisSession()) return false;
  if (uiPrefs.campHintShownCount() >= CAMP_HINT_MAX_SESSIONS) return false;
  if (!campSelector || campSelector.getCamp() !== null) return false;
  if (solveCoachmark?.isActive()) return false;
  if (onboarding?.isActive?.()) return false;
  return true;
}

function whenAnalytics(run) {
  analyticsPromise.then(run).catch((err) => {
    console.error("Gothic Lock Breaker analytics callback failed", err);
  });
}

async function loadOnboarding(callbacks) {
  if (landingType !== LandingType.COLD) {
    return createOnboardingStub(callbacks);
  }
  const { createOnboarding } = await import("./onboarding/tour.js");
  return createOnboarding(callbacks);
}

function initControllers() {
  solveCoachmark = createSolveCoachmark({
    onDismissed: (ctx) => {
      whenAnalytics((analytics) => analytics.trackOnboardingDismissed(ctx));
      renderLocaleChrome();
      maybeShowCampHint();
    },
  });

  solve = createSolveController({
    store,
    els,
    uiPrefs,
    onboarding,
    solveCoachmark,
    landingType,
    wasLoadedFromHash: store.wasLoadedFromHash,
    getHandlers,
    onRerender: () => renderAll(store.getState()),
    onRenderSolutionArea: (state) => solve.renderSolutionArea(state, getHandlers()),
  });

  locale = createLocaleChromeController({
    store,
    els,
    uiPrefs,
    onboarding,
    solveCoachmark,
    solve,
    onRenderLocaleChrome: () => renderLocaleChrome(),
    onRerender: () => renderAll(store.getState()),
  });

  const lock = createLockController({
    store,
    solve,
    onRerender: () => renderAll(store.getState()),
  });

  handlers = {
    ...lock.handlers,
    ...solve.handlers,
    ...locale.handlers,
    onLoadExampleFromFailure() {
      lock.handlers.onLoadExampleLock(oldCampExample());
    },
    onTutorOptInStart() {
      onboarding.startFromOptIn();
      renderer.renderTutorChip();
    },
    onTutorOptInDismiss() {
      onboarding.dismissOptInChip();
      renderAll(store.getState());
      renderLocaleChrome();
    },
  };

  renderLocaleChrome = () => {
    const tracking = locale.syncTracking();
    locale.render(getHandlers(), tracking);
  };

  renderer = createAppRenderer({
    els,
    store,
    solve,
    onboarding,
    onRenderLocaleChrome: () => renderLocaleChrome(),
    handlers,
    getWipeConfirmVisible: () => lock.isWipeConfirmOpen(),
  });
  renderAll = (state) => renderer.render(state);
}

function bindAppEvents() {
  els.solveBtn.addEventListener("click", () => solve.onSolve());
  els.loadExampleLock?.addEventListener("click", () =>
    handlers.onLoadExampleLock(oldCampExample()),
  );
  store.subscribe(renderAll);
}

function applyOnboardingPlan(plan) {
  if (plan.action === StartupAction.COLD_ENTRY) {
    onboarding.enterColdLanding();
    return;
  }
  if (plan.action === StartupAction.SKIP) {
    onboarding.start({ skip: true, skipReason: plan.skipReason });
  }
}

function applyAutoSolve(plan) {
  if (plan.action !== StartupAction.AUTO_SOLVE) return;
  solve.onSolve({ auto: true, solveSource: plan.solveSource });
}

let campSelector = null;
function wireCampSelector() {
  if (campSelector) return;
  campSelector = createCampSelector({
    container: els.campSelector,
    initialCamp: activeCamp,
    onSelect: ({ camp, previousCamp }) =>
      whenAnalytics((analytics) => analytics.trackCampSelected({ camp, previousCamp })),
    onHintShown: () => whenAnalytics((analytics) => analytics.trackCampHintShown()),
    onPickerOpened: ({ source, hadCamp }) => {
      uiPrefs.markCampPickerOpened();
      whenAnalytics((analytics) => analytics.trackCampPickerOpened({ source, hadCamp }));
    },
  });
}

function wireApp() {
  wireHowToMapImage();
  wireInfoModals();
  wireCampSelector();
  bindAppEvents();

  const plan = resolveStartup({
    landingType,
    wasLoadedFromHash: store.wasLoadedFromHash,
    mapped: isLockMapped(store.getState()),
  });

  applyOnboardingPlan(plan);
  renderAll(store.getState());
  applyAutoSolve(plan);

  renderLocaleChrome();

  // Return visitors get no tour and no solve coachmark on paint, so this is the
  // first quiet moment to surface the camp hint. Cold landings defer it to the
  // tour/coachmark dismissal callbacks instead.
  if (landingType !== LandingType.COLD) maybeShowCampHint();
}

function deferAnalyticsStartup({ localeCode, localeSource }) {
  const run = async () => {
    const [{ initPostHog }, analytics] = await Promise.all([
      import("./analytics/posthog-init.js"),
      analyticsPromise,
    ]);
    initPostHog();
    analytics.installErrorCapture();
    analytics.installLocaleEngagementTracking();
    analytics.trackLocaleResolved({ locale: localeCode, localeSource });
    analytics.trackLanding({ landingType, locale: localeCode, localeSource });
    const queryLang = new URLSearchParams(location.search).get("lang");
    if (
      localeSource === LocaleSource.QUERY &&
      !queryLang &&
      localeCode !== DEFAULT_LOCALE
    ) {
      analytics.trackLocaleAutoApplied({
        locale: localeCode,
        hintSource: LocaleAutoHintSource.REFERRER,
      });
    }
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      run().catch((err) => console.error("Gothic Lock Breaker analytics failed to start", err));
    }, { timeout: 3000 });
  } else {
    queueMicrotask(() => {
      run().catch((err) => console.error("Gothic Lock Breaker analytics failed to start", err));
    });
  }
}

async function bootstrap() {
  try {
    await initI18n();
  } catch (err) {
    console.error("Gothic Lock Breaker failed to load translations", err);
    if (els.ariaLive) {
      els.ariaLive.textContent = t("app.bootError");
    }
  }

  applyStaticContent();

  onboarding = await loadOnboarding({
    onDismissed: (ctx) => {
      whenAnalytics((analytics) => analytics.trackOnboardingDismissed(ctx));
      solve?.flushPendingCoachmark();
      queueMicrotask(() => {
        renderLocaleChrome();
        renderAll(store.getState());
      });
      maybeShowCampHint();
    },
    onComplete: () => {
      setTimeout(() => {
        if (window.matchMedia("(min-width: 900px)").matches) return;
        els.solveBtn?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 0);
    },
    onStarted: ({ totalSteps }) =>
      whenAnalytics((analytics) => analytics.trackTutorStarted({ totalSteps })),
    onNotShown: ({ reason }) =>
      whenAnalytics((analytics) => analytics.trackTutorNotShown({ reason })),
    onSkipped: (ctx) => whenAnalytics((analytics) => analytics.trackTutorSkipped(ctx)),
  });

  initControllers();

  const localeCode = getLocale();
  const localeSource = getLocaleSource();
  locale.setInitialLocale(localeCode);
  onLocaleChange((code, changeSource) => locale.handleLocaleChange(code, changeSource));
  wireApp();

  deferAnalyticsStartup({ localeCode, localeSource });
}

bootstrap().catch(async (err) => {
  console.error("Gothic Lock Breaker failed to start", err);
  if (!onboarding) {
    onboarding = createOnboardingStub();
    initControllers();
  }
  wireApp();
});
