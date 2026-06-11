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
import { createOnboarding } from "./onboarding.js";
import { createSolveCoachmark } from "./solve-coachmark.js";
import { oldCampExample } from "./examples.js";
import { LandingType, SolveSource, TutorNotShownReason } from "./analytics/values.js";
import {
  installErrorCapture,
  trackLanding,
  trackLocaleResolved,
  trackOnboardingDismissed,
  trackTutorNotShown,
  trackTutorSkipped,
  trackTutorStarted,
  installLocaleEngagementTracking,
} from "./analytics/index.js";

const els = getAppElements();
const uiPrefs = createUiPrefs();
const store = createStore();

const landingType = resolveLandingType(
  store.getState(),
  store.wasLoadedFromHash,
  uiPrefs.hasVisited(),
);
uiPrefs.markVisited();
installErrorCapture();

let handlers = {};
const getHandlers = () => handlers;

let renderAll = () => {};
let renderLocaleChrome = () => {};

let locale;
let solve;
let renderer;

const solveCoachmark = createSolveCoachmark({
  onDismissed: (ctx) => {
    trackOnboardingDismissed(ctx);
    renderLocaleChrome();
  },
});

const onboarding = createOnboarding({
  onDismissed: (ctx) => {
    trackOnboardingDismissed(ctx);
    solve.flushPendingCoachmark();
    queueMicrotask(() => {
      renderLocaleChrome();
      renderAll(store.getState());
    });
  },
  onStarted: ({ totalSteps }) => trackTutorStarted({ totalSteps }),
  onNotShown: ({ reason }) => trackTutorNotShown({ reason }),
  onSkipped: (ctx) => trackTutorSkipped(ctx),
  onComplete: () => {
    setTimeout(() => locale.openGuideOnboardingComplete(), 0);
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
    renderAll(store.getState());
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

function wireApp() {
  installLocaleEngagementTracking();
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

async function bootstrap() {
  try {
    await initI18n();
  } catch (err) {
    console.error("Gothic Lock Breaker failed to load translations", err);
    if (els.ariaLive) {
      els.ariaLive.textContent = t("app.bootError");
    }
  }

  const localeCode = getLocale();
  const localeSource = getLocaleSource();
  trackLocaleResolved({ locale: localeCode, localeSource });
  trackLanding({ landingType, locale: localeCode, localeSource });
  locale.setInitialLocale(localeCode);
  applyStaticContent();
  onLocaleChange((code, changeSource) => locale.handleLocaleChange(code, changeSource));
  renderLocaleChrome();
  wireApp();
}

bootstrap().catch((err) => {
  console.error("Gothic Lock Breaker failed to start", err);
  wireApp();
});
