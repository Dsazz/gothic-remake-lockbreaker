// Composition root: wires store, controllers, and view. Business logic lives in
// the controllers/ modules; this file only bootstraps and connects them. The
// late-bound render dispatch lives in bootstrap/render-bus.js and the deferred
// analytics access in analytics/startup.js, so this file stays pure wiring.

import { createStore } from "./core/store.js";
import { isLockMapped } from "./core/domain.js";
import { getAppElements } from "./bootstrap/app-elements.js";
import { createUiPrefs } from "./storage/prefs.js";
import { resolveLandingType } from "./bootstrap/landing.js";
import { createSolveController } from "./controllers/solve.js";
import { createLockController } from "./controllers/lock.js";
import { createCatalogController } from "./controllers/catalog.js";
import { createKeyboardController } from "./controllers/keyboard.js";
import { createLocaleChromeController } from "./controllers/locale-chrome.js";
import { createAppRenderer } from "./bootstrap/app-renderer.js";
import { createRenderBus } from "./bootstrap/render-bus.js";
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
import { initCampTheme, createCampSelector } from "./controllers/camp.js";
import { createWhatsNewBadges } from "./controllers/whats-new.js";
import { BadgeFeature, attributeBadgeSource } from "./core/feature-badges.js";
import { VERSION } from "./version.js";
import { wireHowToMapImage } from "./bootstrap/how-to-map-image.js";
import { wireInfoModals } from "./controllers/info-modal.js";
import { LandingType, ShortcutsSource } from "./analytics/values.js";
import { resolveStartup, StartupAction } from "./bootstrap/startup.js";
import { createAnalyticsRuntime } from "./analytics/startup.js";

// Deferred so the one-time camp hint never competes with the onboarding tour or
// the solve coachmark on first paint; it settles after the eye has moved on.
const CAMP_HINT_DELAY_MS = 1200;
// Re-show the discovery nudge across visits (at most once per session) until the
// user opens the picker or we've nudged them this many separate sessions. A
// single missed 7-9s window no longer burns the only chance to teach the control.
const CAMP_HINT_MAX_SESSIONS = 3;

function createApp() {
  // Apply the persisted camp theme before any render to avoid a flash of the
  // neutral palette for returning users who picked a camp.
  const activeCamp = initCampTheme();

  const els = getAppElements();
  const uiPrefs = createUiPrefs();
  const store = createStore();

  const alreadyVisited = uiPrefs.hasVisited();
  const landingType = resolveLandingType(
    store.getState(),
    store.wasLoadedFromHash,
    alreadyVisited,
  );
  // Stamp the "NEW"-badge baseline before marking this visit: first-time visitors
  // anchor to the current version (no badges), returning visitors to the earliest
  // baseline (every current badge counts as new). Must read hasVisited() first.
  uiPrefs.ensureFirstSeenVersion(VERSION, alreadyVisited);
  uiPrefs.markVisited();

  const analytics = createAnalyticsRuntime();
  const bus = createRenderBus();

  let locale;
  let solve;
  let catalog;
  let keyboard;
  let renderer;
  let onboarding;
  let solveCoachmark;
  let whatsNew;
  let campSelector = null;
  // Listener/subscription wiring is not idempotent (addEventListener,
  // store.subscribe). bootstrap() runs wireApp() once; if it throws afterwards,
  // recover() calls wireApp() again — this gate keeps the one-time wiring single
  // while still letting the render/plan pass re-run so recover() repaints.
  let eventsWired = false;

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

  async function loadOnboarding(callbacks) {
    if (landingType !== LandingType.COLD) {
      return createOnboardingStub(callbacks);
    }
    const { createOnboarding } = await import("./onboarding/tour.js");
    return createOnboarding(callbacks);
  }

  function initControllers() {
    whatsNew = createWhatsNewBadges({
      uiPrefs,
      anchors: {
        [BadgeFeature.HOTKEYS]: els.shortcutsHint,
        // Browse button lives inside #controls, which replaceChildren on every
        // render — resolve lazily so apply() always hits the live node.
        [BadgeFeature.BROWSE_LOCKS]: () => els.controls.querySelector("#browse-locks-btn"),
      },
      t,
    });

    solveCoachmark = createSolveCoachmark({
      onDismissed: (ctx) => {
        analytics.when((tracker) => tracker.trackOnboardingDismissed(ctx));
        bus.localeChrome();
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
      getHandlers: bus.getHandlers,
      onRerender: () => bus.all(store.getState()),
      onRenderSolutionArea: (state) =>
        solve.renderSolutionArea(state, bus.getHandlers()),
    });

    locale = createLocaleChromeController({
      store,
      els,
      uiPrefs,
      onboarding,
      solveCoachmark,
      solve,
      onRenderLocaleChrome: () => bus.localeChrome(),
      onRerender: () => bus.all(store.getState()),
    });

    const lock = createLockController({
      store,
      solve,
      onRerender: () => bus.all(store.getState()),
    });

    catalog = createCatalogController({
      store,
      solve,
      onRerender: () => bus.all(store.getState()),
      trackOpened: () => analytics.when((tracker) => tracker.trackCatalogOpened()),
      trackLoaded: (props) =>
        analytics.when((tracker) => tracker.trackCatalogLockLoaded(props)),
    });

    keyboard = createKeyboardController({
      solve,
      getHandlers: bus.getHandlers,
      els,
      onRerender: () => bus.all(store.getState()),
      onShortcutsOpened: () => whatsNew?.dismiss(BadgeFeature.HOTKEYS),
      isCatalogOpen: () => catalog?.isOpen?.() ?? false,
    });

    const handlers = {
      ...lock.handlers,
      ...solve.handlers,
      ...locale.handlers,
      ...catalog.handlers,
      onOpenCatalog: () => {
        whatsNew?.dismiss(BadgeFeature.BROWSE_LOCKS);
        return catalog.handlers.onOpenCatalog();
      },
      onTutorOptInStart() {
        onboarding.startFromOptIn();
        renderer.renderTutorChip();
      },
      onTutorOptInDismiss() {
        onboarding.dismissOptInChip();
        bus.all(store.getState());
        bus.localeChrome();
      },
      onOpenShortcuts: (source) => {
        // Attribute icon-clicks to the badge when it's showing; the `?`-key path
        // keeps its own source (that user already knew the shortcut). Dismissal is
        // handled inside openShortcuts via onShortcutsOpened, for both paths.
        const effectiveSource = attributeBadgeSource({
          badgeActive: Boolean(whatsNew?.isActive(BadgeFeature.HOTKEYS)),
          source,
          organicSource: ShortcutsSource.ICON,
          badgeSource: ShortcutsSource.NEW_BADGE,
        });
        keyboard.openShortcuts(effectiveSource);
      },
      onCloseShortcuts: () => keyboard.closeShortcuts(),
    };

    renderer = createAppRenderer({
      els,
      store,
      solve,
      onboarding,
      catalog,
      onRenderLocaleChrome: () => bus.localeChrome(),
      onControlsRendered: () => whatsNew?.apply(),
      handlers,
      getWipeConfirmVisible: () => lock.isWipeConfirmOpen(),
      getShortcutsVisible: () => keyboard.isShortcutsOpen(),
    });

    // Single late-init seam: hand the bus the real dispatch targets now that the
    // renderer, locale controller, and handler map exist. The locale-chrome
    // composition stays authored here (it owns syncTracking); the bus only owns
    // the late binding.
    bus.connect({
      handlers,
      renderAll: (state) => renderer.render(state),
      renderLocaleChrome: () => {
        const tracking = locale.syncTracking();
        locale.render(bus.getHandlers(), tracking);
      },
    });
  }

  function bindAppEvents() {
    els.solveBtn.addEventListener("click", () => solve.onSolve());
    els.browseLocksHowto?.addEventListener("click", () =>
      bus.getHandlers().onOpenCatalog?.(),
    );
    document.addEventListener("keydown", keyboard.handle);
    store.subscribe((state) => {
      catalog?.onLockEdited?.();
      bus.all(state);
    });
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

  function wireCampSelector() {
    if (campSelector) return;
    campSelector = createCampSelector({
      container: els.campSelector,
      initialCamp: activeCamp,
      onSelect: ({ camp, previousCamp }) =>
        analytics.when((tracker) => tracker.trackCampSelected({ camp, previousCamp })),
      onHintShown: () => analytics.when((tracker) => tracker.trackCampHintShown()),
      onPickerOpened: ({ source, hadCamp }) => {
        uiPrefs.markCampPickerOpened();
        analytics.when((tracker) =>
          tracker.trackCampPickerOpened({ source, hadCamp }),
        );
      },
    });
  }

  async function wireApp() {
    if (!eventsWired) {
      eventsWired = true;
      wireHowToMapImage();
      wireInfoModals();
      wireCampSelector();
      bindAppEvents();
    }

    // ?lock= wins over hash/localStorage (catalog deep link).
    let loadedFromCatalog = false;
    try {
      loadedFromCatalog = await catalog.loadFromQuery();
    } catch (err) {
      console.error("Catalog deep-link load failed", err);
    }

    if (!loadedFromCatalog) {
      const plan = resolveStartup({
        landingType,
        wasLoadedFromHash: store.wasLoadedFromHash,
        mapped: isLockMapped(store.getState()),
      });
      applyOnboardingPlan(plan);
      bus.all(store.getState());
      applyAutoSolve(plan);
    } else {
      bus.all(store.getState());
      // Catalog deep link already auto-solved; still surface cold-landing tour opt-in.
      if (landingType === LandingType.COLD) {
        applyOnboardingPlan({ action: StartupAction.COLD_ENTRY });
      }
    }

    bus.localeChrome();

    // Feature badges: apply after first paint (and again via onControlsRendered
    // for anchors that live inside replaceChildren hosts like #browse-locks-btn).
    whatsNew?.apply();

    // Return visitors get no tour and no solve coachmark on paint, so this is the
    // first quiet moment to surface the camp hint. Cold landings defer it to the
    // tour/coachmark dismissal callbacks instead.
    if (landingType !== LandingType.COLD) maybeShowCampHint();
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
        analytics.when((tracker) => tracker.trackOnboardingDismissed(ctx));
        solve?.flushPendingCoachmark();
        queueMicrotask(() => {
          bus.localeChrome();
          bus.all(store.getState());
        });
        maybeShowCampHint();
      },
      onComplete: () => {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 0);
      },
      onStarted: ({ totalSteps }) =>
        analytics.when((tracker) => tracker.trackTutorStarted({ totalSteps })),
      onNotShown: ({ reason }) =>
        analytics.when((tracker) => tracker.trackTutorNotShown({ reason })),
      onSkipped: (ctx) =>
        analytics.when((tracker) => tracker.trackTutorSkipped(ctx)),
    });

    initControllers();

    const localeCode = getLocale();
    const localeSource = getLocaleSource();
    locale.setInitialLocale(localeCode);
    onLocaleChange((code, changeSource) => locale.handleLocaleChange(code, changeSource));
    await wireApp();

    analytics.deferStartup({ landingType, localeCode, localeSource });
  }

  async function recover() {
    if (!onboarding) {
      onboarding = createOnboardingStub();
      initControllers();
    }
    await wireApp();
  }

  return { bootstrap, recover };
}

const app = createApp();
app.bootstrap().catch((err) => {
  console.error("Gothic Lock Breaker failed to start", err);
  app.recover().catch((recoverErr) => {
    console.error("Gothic Lock Breaker failed to recover", recoverErr);
  });
});
