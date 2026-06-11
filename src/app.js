// Composition root: wires store, controllers, and view. Business logic lives in
// *-controller modules; this file only bootstraps and connects them.

import { createStore } from "./store.js";
import { isLockMapped } from "./domain.js";
import { getAppElements } from "./app-elements.js";
import { createUiPrefs } from "./ui-prefs.js";
import { resolveLandingType } from "./landing.js";
import { createSolveController } from "./solve-controller.js";
import { createLockController } from "./lock-controller.js";
import { createLocaleChromeController } from "./locale-chrome-controller.js";
import { createAppRenderer } from "./app-renderer.js";
import {
  initI18n,
  onLocaleChange,
  getLocale,
  getLocaleSource,
  t,
} from "./i18n.js";
import { applyStaticContent } from "./static-content.js";
import { createOnboardingStub } from "./onboarding-stub.js";
import { createSolveCoachmark } from "./solve-coachmark.js";
import { oldCampExample } from "./examples.js";
import { wireHowToMapImage } from "./how-to-map-image.js";
import { LandingType, SolveSource, TutorNotShownReason } from "./analytics/values.js";

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
const analyticsPromise = import("./analytics/index.js");

function whenAnalytics(run) {
  analyticsPromise.then(run).catch((err) => {
    console.error("Gothic Lock Breaker analytics callback failed", err);
  });
}

async function loadOnboarding(callbacks) {
  if (landingType !== LandingType.COLD) {
    return createOnboardingStub(callbacks);
  }
  const { createOnboarding } = await import("./onboarding.js");
  return createOnboarding(callbacks);
}

function initControllers() {
  const solveCoachmark = createSolveCoachmark({
    onDismissed: (ctx) => {
      whenAnalytics((analytics) => analytics.trackOnboardingDismissed(ctx));
      renderLocaleChrome();
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

  const lock = createLockController({ store, solve });

  handlers = {
    ...lock.handlers,
    ...solve.handlers,
    ...locale.handlers,
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
  });
  renderAll = (state) => renderer.render(state);
}

function wireApp() {
  wireHowToMapImage();
  window.addEventListener("pagehide", () => solve.flushWalkthroughSummary());
  els.solveBtn.addEventListener("click", () => solve.onSolve());
  store.subscribe(renderAll);
  renderAll(store.getState());

  if (store.wasLoadedFromHash && isLockMapped(store.getState())) {
    solve.onSolve({ auto: true, solveSource: SolveSource.HASH });
  } else if (landingType === LandingType.COLD) {
    if (!onboarding.showOptInChip()) {
      onboarding.start({ skip: true, skipReason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
    }
    renderAll(store.getState());
  } else {
    const skipReason =
      landingType === LandingType.HASH
        ? TutorNotShownReason.HASH_LANDING
        : TutorNotShownReason.RETURNING_USER;
    onboarding.start({ skip: true, skipReason });
  }

  document.getElementById("load-example-lock")?.addEventListener("click", () => {
    handlers.onLoadExampleLock(oldCampExample());
  });

  renderLocaleChrome();
}

function deferAnalyticsStartup({ localeCode, localeSource }) {
  const run = async () => {
    const [{ initPostHog }, analytics] = await Promise.all([
      import("./analytics/posthog-init.js"),
      analyticsPromise,
    ]);
    initPostHog();
    analytics.installErrorCapture();
    analytics.installWebAnalyticsPresence();
    analytics.installLocaleEngagementTracking();
    analytics.trackLocaleResolved({ locale: localeCode, localeSource });
    analytics.trackLanding({ landingType, locale: localeCode, localeSource });
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
    },
    onComplete: () => {
      setTimeout(() => locale?.openGuideOnboardingComplete(), 0);
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
