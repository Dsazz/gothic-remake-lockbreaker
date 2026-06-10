// Controller: the only module that knows about both the store and the
// solver/view. Wires DOM events to store mutations, runs the solver, and feeds
// results to the view. Data flow is one-way: event -> store -> re-render.

import { createStore } from "./store.js";
import { solve, statesAlong } from "./solver.js";
import {
  isLockMapped,
  isPristineDefault,
  effectiveMatrix,
  masteryForId,
  isInBounds,
} from "./domain.js";
import { VERSION } from "./version.js";
import * as view from "./view.js";
import { initI18n, onLocaleChange, getLocale, getLocaleSource, DEFAULT_LOCALE, t } from "./i18n.js";
import { applyStaticContent } from "./static-content.js";
import { renderLocaleSwitcher } from "./locale-switcher.js";
import { createOnboarding } from "./onboarding.js";
import { createSolveCoachmark } from "./solve-coachmark.js";
import {
  resolveSolveCoachmarkTrigger,
  SolveCoachmarkTrigger,
} from "./solve-coachmark-schedule.js";
import { oldCampExample } from "./examples.js";
import { advanceMappedTracking } from "./mapped-transition.js";
import { StorageKeys, StorageFlag } from "./storage-keys.js";
import {
  GuideSource,
  LandingType,
  LocaleChangeSource,
  PromptKind,
  SolveFailureReason,
  SolveSource,
  SupportSource,
  TutorNotShownReason,
  WalkthroughDirection,
  WalkthroughUiAction,
} from "./analytics/values.js";
import {
  installErrorCapture,
  trackExampleLockLoaded,
  trackGuideOpened,
  trackLanding,
  trackLocaleResolved,
  trackI18nBannerShown,
  trackLockBecameMappable,
  trackLockCleared,
  trackOnboardingDismissed,
  trackOnboardingStepViewed,
  trackPromptDismissed,
  trackShareLinkCopied,
  trackShareLinkCopyFailed,
  trackSharePromptClicked,
  trackSharePromptShown,
  trackSolveButtonClicked,
  trackSolveResult,
  trackTutorNextClicked,
  trackTutorNotShown,
  trackTutorSkipped,
  trackTutorStarted,
  trackWalkthroughStepChanged,
  trackWalkthroughUiToggled,
  trackMasteryTierChanged,
  trackStepMismatchClicked,
  trackSupportLinkClicked,
  trackLocaleChanged,
  installLocaleEngagementTracking,
} from "./analytics/index.js";

const els = {
  controls: document.getElementById("controls"),
  tumblers: document.getElementById("tumblers"),
  tumblersPanel: document.querySelector(".panel--tumblers"),
  sequencePanel: document.querySelector(".panel--sequence"),
  i18nBanner: document.getElementById("i18n-banner"),
  hashBanner: document.getElementById("hash-banner"),
  sharePrompt: document.getElementById("share-prompt"),
  solution: document.getElementById("solution"),
  solveBtn: document.getElementById("solve-btn"),
  guide: document.getElementById("how-to-map"),
  version: document.getElementById("app-version"),
  headSupport: document.getElementById("app-head-support"),
  headLang: document.getElementById("app-head-lang"),
  foot: document.getElementById("app-foot"),
  ariaLive: document.getElementById("aria-live"),
};

const store = createStore();

let landingType = resolveLandingType(store.getState(), store.wasLoadedFromHash);
markVisited();
installErrorCapture();

const onboarding = createOnboarding({
  onStepViewed: ({ stepId }) => trackOnboardingStepViewed({ stepId }),
  onDismissed: (ctx) => {
    trackOnboardingDismissed(ctx);
    flushPendingSolveCoachmark();
    queueMicrotask(() => {
      renderLocaleChrome();
      renderAll(store.getState());
    });
  },
  onStarted: ({ totalSteps }) => trackTutorStarted({ totalSteps }),
  onNotShown: ({ reason }) => trackTutorNotShown({ reason }),
  onNextClicked: (ctx) => trackTutorNextClicked(ctx),
  onSkipped: (ctx) => trackTutorSkipped(ctx),
  onComplete: () => {
    setTimeout(() => openGuide(GuideSource.ONBOARDING_COMPLETE), 0);
  },
});

const solveCoachmark = createSolveCoachmark({
  onStepViewed: ({ stepId }) => trackOnboardingStepViewed({ stepId }),
  onDismissed: (ctx) => {
    trackOnboardingDismissed(ctx);
    renderLocaleChrome();
  },
});

// Transient UI state — the solution is derived, not part of the lock definition.
let solution; // undefined | null | Move[]
let solveFailureReason;
let stepIndex = 0;
let showAllSteps = false;
let sequenceMinimized = false;
let copyCopied = false;
let copyTimer;
let blockedMessage;
let tumblersPulse = false;
let pulseTimer;
let solveReadyFlash = false;
let flashTimer;
let wasMapped = isLockMapped(store.getState());
let hashBannerVisible = shouldShowHashBanner(store.getState());
let sharePromptVisible = false;
let sharePromptTracked = false;
let i18nBannerTracked = false;
let lastI18nBannerVisible = null;
let lastRenderedLocale = null;
let localeSwitchCount = 0;
let showMismatchTips = false;
let pendingSolveCoachmark = false;

function flushPendingSolveCoachmark() {
  if (!pendingSolveCoachmark || onboarding.isActive()) return;
  pendingSolveCoachmark = false;
  const state = store.getState();
  if (!isLockMapped(state)) return;
  void solveCoachmark.show(els.solveBtn);
}

function handleSolveCoachmarkOnMapped(state) {
  const trigger = resolveSolveCoachmarkTrigger({
    landingCold: landingType === LandingType.COLD,
    justBecameMapped: true,
    tourActive: onboarding.isActive(),
    mapped: isLockMapped(state),
  });
  if (trigger === SolveCoachmarkTrigger.DEFER) {
    pendingSolveCoachmark = true;
    return;
  }
  if (trigger === SolveCoachmarkTrigger.SHOW) {
    void solveCoachmark.show(els.solveBtn);
  }
}

function solverMatrix(state) {
  return effectiveMatrix(state.matrix, state.removedLinks);
}

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

function resolveLandingType(state, wasLoadedFromHash) {
  if (wasLoadedFromHash && !isPristineDefault(state)) return LandingType.HASH;
  if (storageGet(StorageKeys.HAS_VISITED)) return LandingType.RETURNING;
  return LandingType.COLD;
}

function markVisited() {
  storageSet(StorageKeys.HAS_VISITED, StorageFlag.SET);
}

function shouldShowHashBanner(state) {
  if (storageGet(StorageKeys.HASH_BANNER_DISMISSED)) return false;
  return store.wasLoadedFromHash && !isPristineDefault(state);
}

function shouldShowI18nBanner() {
  if (storageGet(StorageKeys.I18N_BANNER_DISMISSED)) return false;
  if (onboarding.isActive()) return false;
  if (solveCoachmark.isActive()) return false;
  return true;
}

function openGuide(source = GuideSource.MANUAL) {
  if (!els.guide) return;
  els.guide.open = true;
  trackGuideOpened({ source });
  const block = window.matchMedia("(max-width: 768px)").matches ? "start" : "nearest";
  els.guide.scrollIntoView({ behavior: "smooth", block });
}

function pulseTumblers() {
  tumblersPulse = true;
  renderAll(store.getState());
  clearTimeout(pulseTimer);
  pulseTimer = setTimeout(() => {
    tumblersPulse = false;
    renderAll(store.getState());
  }, 1200);
}

function flashSolveReady() {
  solveReadyFlash = true;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    solveReadyFlash = false;
    renderAll(store.getState());
  }, 900);
}

function scrollSequencePanel() {
  els.sequencePanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function scrollSharePromptIntoView() {
  els.sharePrompt?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function buildWalkthrough(state) {
  if (!solution || solution.length === 0) return null;
  const matrix = solverMatrix(state);
  const states = statesAlong(state.positions, matrix, solution);
  const clamped = Math.min(stepIndex, states.length - 1);
  stepIndex = clamped;
  return { states, stepIndex: clamped, move: solution[clamped] ?? null, showAll: showAllSteps };
}

function maybeShowSharePrompt(state) {
  if (!Array.isArray(solution) || solution.length === 0) return;
  sharePromptVisible = true;
  if (!sharePromptTracked) {
    sharePromptTracked = true;
    trackSharePromptShown({ plateCount: state.plateCount });
  }
}

function renderSolutionArea(state) {
  const walkthrough = buildWalkthrough(state);
  const hasMoves = Array.isArray(solution) && solution.length > 0;
  const minimized = sequenceMinimized && hasMoves;
  const lockReady = isLockMapped(state);
  view.renderSequencePanel(els.sequencePanel, solution, { minimized }, handlers);
  view.renderHashBanner(els.hashBanner, { visible: hashBannerVisible && hasMoves }, handlers);
  view.renderSharePrompt(
    els.sharePrompt,
    { visible: sharePromptVisible && hasMoves, copyCopied },
    handlers,
  );
  view.renderSolution(
    els.solution,
    solution,
    walkthrough,
    { minimized, blockedMessage, lockReady, showMismatchTips, state, failureReason: solveFailureReason },
    handlers,
  );
  view.renderHelpOverlay(
    {
      visible: showMismatchTips && hasMoves && !minimized && Boolean(walkthrough?.move),
      state,
    },
    handlers,
  );
}

function renderLocaleChrome() {
  view.renderVersionBadge(els.version, VERSION);
  view.renderHeadSupport(els.headSupport, handlers);
  renderLocaleSwitcher(els.headLang);
  view.renderFooter(els.foot, VERSION, handlers);

  const locale = getLocale();
  const i18nBannerVisible = shouldShowI18nBanner();
  const bannerDirty =
    i18nBannerVisible !== lastI18nBannerVisible || locale !== lastRenderedLocale;

  if (i18nBannerVisible && !i18nBannerTracked) {
    i18nBannerTracked = true;
    trackI18nBannerShown({ locale });
  }

  if (bannerDirty) {
    lastI18nBannerVisible = i18nBannerVisible;
    lastRenderedLocale = locale;
    view.renderI18nBanner(els.i18nBanner, { visible: i18nBannerVisible }, handlers);
  }
}

function renderAll(state) {
  const mapped = isLockMapped(state);
  const transition = advanceMappedTracking(wasMapped, mapped);
  wasMapped = transition.wasMapped;

  if (transition.justBecameMapped) {
    flashSolveReady();
    trackLockBecameMappable({ plateCount: state.plateCount });
    handleSolveCoachmarkOnMapped(state);
    renderLocaleChrome();
  }

  view.renderControls(els.controls, state, handlers);
  view.renderTumblers(els.tumblers, state, handlers, { pulse: tumblersPulse });
  view.renderSolveButton(els.solveBtn, { mapped, justEnabled: solveReadyFlash });
  renderSolutionArea(state);
}

function invalidateSolution() {
  pendingSolveCoachmark = false;
  if (solveCoachmark.isActive()) solveCoachmark.dismissSilent();
  solution = undefined;
  solveFailureReason = undefined;
  stepIndex = 0;
  showAllSteps = false;
  sequenceMinimized = false;
  blockedMessage = undefined;
  sharePromptVisible = false;
  sharePromptTracked = false;
  showMismatchTips = false;
}

async function copyShareUrl(url) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }
  const area = document.createElement("textarea");
  area.value = url;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

function showCopyFeedback() {
  copyCopied = true;
  if (els.ariaLive) els.ariaLive.textContent = t("aria.copyOk");
  renderAll(store.getState());
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyCopied = false;
    if (els.ariaLive) els.ariaLive.textContent = "";
    renderAll(store.getState());
  }, 2000);
}

const handlers = {
  onSetPlateCount(n) {
    invalidateSolution();
    store.setPlateCount(n);
  },
  onCycleCell(mover, affected) {
    invalidateSolution();
    store.cycleMatrixCell(mover, affected);
  },
  onSetPosition(plate, value) {
    invalidateSolution();
    store.setPosition(plate, value);
  },
  onClearAll() {
    if (!confirm(t("confirm.wipe"))) return;
    invalidateSolution();
    store.clearAll();
    hashBannerVisible = shouldShowHashBanner(store.getState());
    trackLockCleared();
  },
  async onCopyShareLink() {
    const plateCount = store.getState().plateCount;
    try {
      await copyShareUrl(location.href);
      showCopyFeedback();
      trackShareLinkCopied({ plateCount });
      return true;
    } catch {
      if (els.ariaLive) els.ariaLive.textContent = t("aria.copyFail");
      trackShareLinkCopyFailed({ plateCount });
      return false;
    }
  },
  onWalk(delta) {
    const total = solution?.length ?? 0;
    const prev = stepIndex;
    stepIndex += delta;
    stepIndex = Math.max(0, Math.min(stepIndex, total));
    if (stepIndex !== prev) {
      showMismatchTips = false;
      trackWalkthroughStepChanged({
        direction: delta > 0 ? WalkthroughDirection.FORWARD : WalkthroughDirection.BACK,
        stepIndex,
        totalSteps: total,
        plateCount: store.getState().plateCount,
      });
    }
    renderSolutionArea(store.getState());
  },
  onJumpTo(index) {
    const total = solution?.length ?? 0;
    const prev = stepIndex;
    stepIndex = Math.max(0, Math.min(index, total));
    if (stepIndex !== prev) {
      showMismatchTips = false;
      trackWalkthroughStepChanged({
        direction: WalkthroughDirection.JUMP,
        stepIndex,
        totalSteps: total,
        plateCount: store.getState().plateCount,
      });
    }
    renderSolutionArea(store.getState());
  },
  onToggleSteps() {
    showAllSteps = !showAllSteps;
    if (showAllSteps) {
      trackWalkthroughUiToggled({
        action: WalkthroughUiAction.SHOW_ALL,
        plateCount: store.getState().plateCount,
      });
    }
    renderSolutionArea(store.getState());
  },
  onMinimizeSequence() {
    sequenceMinimized = true;
    showAllSteps = false;
    trackWalkthroughUiToggled({
      action: WalkthroughUiAction.MINIMIZE,
      plateCount: store.getState().plateCount,
    });
    renderSolutionArea(store.getState());
  },
  onExpandSequence() {
    sequenceMinimized = false;
    trackWalkthroughUiToggled({
      action: WalkthroughUiAction.EXPAND,
      plateCount: store.getState().plateCount,
    });
    renderSolutionArea(store.getState());
    scrollSequencePanel();
  },
  onClearSolution() {
    trackWalkthroughUiToggled({
      action: WalkthroughUiAction.CLEAR_SOLUTION,
      plateCount: store.getState().plateCount,
    });
    invalidateSolution();
    renderAll(store.getState());
  },
  onDismissHashBanner() {
    hashBannerVisible = false;
    storageSet(StorageKeys.HASH_BANNER_DISMISSED, StorageFlag.SET);
    trackPromptDismissed({ prompt: PromptKind.HASH_BANNER, plateCount: store.getState().plateCount });
    renderSolutionArea(store.getState());
  },
  onDismissI18nBanner() {
    storageSet(StorageKeys.I18N_BANNER_DISMISSED, StorageFlag.SET);
    trackPromptDismissed({ prompt: PromptKind.I18N_BANNER, plateCount: store.getState().plateCount });
    renderLocaleChrome();
  },
  onOpenGuide() {
    openGuide(GuideSource.MANUAL);
  },
  async onSharePromptClick() {
    trackSharePromptClicked({ plateCount: store.getState().plateCount });
    const copied = await handlers.onCopyShareLink();
    if (copied) handlers.onDismissSharePrompt();
  },
  onDismissSharePrompt() {
    sharePromptVisible = false;
    trackPromptDismissed({ prompt: PromptKind.SHARE, plateCount: store.getState().plateCount });
    renderSolutionArea(store.getState());
  },
  onLoadExampleLock(exampleState) {
    invalidateSolution();
    store.loadLock(exampleState);
    trackExampleLockLoaded({ plateCount: exampleState.plateCount });
    onSolve({ auto: true, solveSource: SolveSource.EXAMPLE });
  },
  onSetMasteryLevel(level) {
    invalidateSolution();
    store.setMasteryLevel(level);
    trackMasteryTierChanged({ tier: masteryForId(level).key });
  },
  onAdjustBreaksBudget(delta) {
    invalidateSolution();
    store.adjustBreaksBudget(delta);
  },
  onToggleLinkRemoved(reactor, turned) {
    invalidateSolution();
    store.toggleLinkRemoved(reactor, turned);
  },
  onStepMismatch() {
    showMismatchTips = !showMismatchTips;
    trackStepMismatchClicked({
      stepIndex,
      plateCount: store.getState().plateCount,
    });
    renderSolutionArea(store.getState());
  },
  onSupportClick(source = SupportSource.FOOTER_STRIP) {
    trackSupportLinkClicked({ source });
  },
};

function onSolve({ auto = false, solveSource = SolveSource.MANUAL } = {}) {
  const state = store.getState();
  const mapped = isLockMapped(state);

  if (!auto) {
    trackSolveButtonClicked({
      plateCount: state.plateCount,
      lockReady: mapped,
      landingType,
    });
  }

  if (!mapped) {
    blockedMessage = t("solution.blocked");
    pulseTumblers();
    renderSolutionArea(state);
    return;
  }

  blockedMessage = undefined;
  if (!isInBounds(state.positions)) {
    solution = null;
    solveFailureReason = SolveFailureReason.OOB_START;
  } else {
    solution = solve(state.positions, solverMatrix(state));
    solveFailureReason = solution === null ? SolveFailureReason.NO_PATH : undefined;
  }

  trackSolveResult({
    plateCount: state.plateCount,
    solution,
    landingType,
    solveSource,
    failureReason: solveFailureReason,
  });
  stepIndex = 0;
  showAllSteps = false;

  if (solution === null) {
    pulseTumblers();
  }

  maybeShowSharePrompt(state);
  renderSolutionArea(state);

  if (Array.isArray(solution) && solution.length > 0) {
    scrollSharePromptIntoView();
  }

  if (!auto || (Array.isArray(solution) && solution.length > 0)) {
    scrollSequencePanel();
  }
}

let previousLocale = DEFAULT_LOCALE;

function handleLocaleChange(locale) {
  localeSwitchCount += 1;
  trackLocaleChanged({
    locale,
    previousLocale,
    source: LocaleChangeSource.SWITCHER,
    switchCount: localeSwitchCount,
  });
  previousLocale = locale;
  if (blockedMessage) blockedMessage = t("solution.blocked");
  applyStaticContent();
  onboarding.refreshStep();
  solveCoachmark.refreshCopy();
  renderLocaleChrome();
  renderAll(store.getState());
}

function wireApp() {
  installLocaleEngagementTracking();
  els.solveBtn.addEventListener("click", () => onSolve());
  store.subscribe(renderAll);
  renderAll(store.getState());

  if (store.wasLoadedFromHash && isLockMapped(store.getState())) {
    onSolve({ auto: true, solveSource: SolveSource.HASH });
  } else if (landingType === LandingType.COLD) {
    onboarding.start({ skip: false });
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

  const locale = getLocale();
  const localeSource = getLocaleSource();
  trackLocaleResolved({ locale, localeSource });
  trackLanding({ landingType, locale, localeSource });
  previousLocale = locale;
  applyStaticContent();
  onLocaleChange(handleLocaleChange);
  renderLocaleChrome();
  wireApp();
}

bootstrap().catch((err) => {
  console.error("Gothic Lock Breaker failed to start", err);
  wireApp();
});
