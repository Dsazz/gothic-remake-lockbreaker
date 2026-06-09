// Controller: the only module that knows about both the store and the
// solver/view. Wires DOM events to store mutations, runs the solver, and feeds
// results to the view. Data flow is one-way: event -> store -> re-render.

import { createStore } from "./store.js";
import { solve, statesAlong } from "./solver.js";
import { isLockMapped, isPristineDefault, effectiveMatrix, masteryForId } from "./domain.js";
import { VERSION } from "./version.js";
import * as view from "./view.js";
import { createOnboarding } from "./onboarding.js";
import { oldCampExample } from "./examples.js";
import { advanceMappedTracking } from "./mapped-transition.js";
import {
  installErrorCapture,
  trackExampleLockLoaded,
  trackGuideOpened,
  trackLanding,
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
} from "./analytics/index.js";

const HAS_VISITED_KEY = "has_visited_v1";
const HASH_BANNER_KEY = "hash_banner_dismissed_v1";

const els = {
  controls: document.getElementById("controls"),
  tumblers: document.getElementById("tumblers"),
  tumblersPanel: document.querySelector(".panel--tumblers"),
  sequencePanel: document.querySelector(".panel--sequence"),
  hashBanner: document.getElementById("hash-banner"),
  sharePrompt: document.getElementById("share-prompt"),
  solution: document.getElementById("solution"),
  solveBtn: document.getElementById("solve-btn"),
  guide: document.getElementById("how-to-map"),
  version: document.getElementById("app-version"),
  foot: document.getElementById("app-foot"),
  ariaLive: document.getElementById("aria-live"),
};

const store = createStore();

let landingType = resolveLandingType(store.getState(), store.wasLoadedFromHash);
trackLanding({ landingType });
markVisited();
installErrorCapture();

const onboarding = createOnboarding({
  onStepViewed: ({ stepId }) => trackOnboardingStepViewed({ stepId }),
  onDismissed: ({ completed, stepId, stepIndex, action, totalSteps }) =>
    trackOnboardingDismissed({ completed, stepId, stepIndex, action, totalSteps }),
  onStarted: ({ totalSteps }) => trackTutorStarted({ totalSteps }),
  onNotShown: ({ reason }) => trackTutorNotShown({ reason }),
  onNextClicked: (ctx) => trackTutorNextClicked(ctx),
  onSkipped: (ctx) => trackTutorSkipped(ctx),
  onComplete: () => {
    setTimeout(() => openGuide("onboarding_complete"), 0);
  },
});

// Transient UI state — the solution is derived, not part of the lock definition.
let solution; // undefined | null | Move[]
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
let showMismatchTips = false;

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
  if (wasLoadedFromHash && !isPristineDefault(state)) return "hash";
  if (storageGet(HAS_VISITED_KEY)) return "returning";
  return "cold";
}

function markVisited() {
  storageSet(HAS_VISITED_KEY, "1");
}

function shouldShowHashBanner(state) {
  if (storageGet(HASH_BANNER_KEY)) return false;
  return store.wasLoadedFromHash && !isPristineDefault(state);
}

function openGuide(source = "manual") {
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
    { minimized, blockedMessage, lockReady, showMismatchTips, state },
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

function renderAll(state) {
  const mapped = isLockMapped(state);
  const transition = advanceMappedTracking(wasMapped, mapped);
  wasMapped = transition.wasMapped;

  if (transition.justBecameMapped) {
    flashSolveReady();
    trackLockBecameMappable({ plateCount: state.plateCount });
  }

  view.renderVersionBadge(els.version, VERSION);
  view.renderControls(els.controls, state, handlers);
  view.renderTumblers(els.tumblers, state, handlers, { pulse: tumblersPulse });
  view.renderSolveButton(els.solveBtn, { mapped, justEnabled: solveReadyFlash });
  renderSolutionArea(state);
  view.renderFooter(els.foot, VERSION);
}

function invalidateSolution() {
  solution = undefined;
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
  if (els.ariaLive) els.ariaLive.textContent = "Link copied to clipboard.";
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
    if (!confirm("Wipe the lock? Couplings, pins, mastery, and count will reset.")) return;
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
    } catch {
      if (els.ariaLive) els.ariaLive.textContent = "Could not copy link.";
      trackShareLinkCopyFailed({ plateCount });
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
        direction: delta > 0 ? "forward" : "back",
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
        direction: "jump",
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
      trackWalkthroughUiToggled({ action: "show_all", plateCount: store.getState().plateCount });
    }
    renderSolutionArea(store.getState());
  },
  onMinimizeSequence() {
    sequenceMinimized = true;
    showAllSteps = false;
    trackWalkthroughUiToggled({ action: "minimize", plateCount: store.getState().plateCount });
    renderSolutionArea(store.getState());
  },
  onExpandSequence() {
    sequenceMinimized = false;
    trackWalkthroughUiToggled({ action: "expand", plateCount: store.getState().plateCount });
    renderSolutionArea(store.getState());
    els.sequencePanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },
  onClearSolution() {
    trackWalkthroughUiToggled({ action: "clear_solution", plateCount: store.getState().plateCount });
    invalidateSolution();
    renderAll(store.getState());
  },
  onDismissHashBanner() {
    hashBannerVisible = false;
    storageSet(HASH_BANNER_KEY, "1");
    trackPromptDismissed({ prompt: "hash_banner", plateCount: store.getState().plateCount });
    renderSolutionArea(store.getState());
  },
  onOpenGuide() {
    openGuide("manual");
  },
  async onSharePromptClick() {
    trackSharePromptClicked({ plateCount: store.getState().plateCount });
    await handlers.onCopyShareLink();
    handlers.onDismissSharePrompt();
  },
  onDismissSharePrompt() {
    sharePromptVisible = false;
    trackPromptDismissed({ prompt: "share", plateCount: store.getState().plateCount });
    renderSolutionArea(store.getState());
  },
  onLoadExampleLock(exampleState) {
    invalidateSolution();
    store.loadLock(exampleState);
    trackExampleLockLoaded({ plateCount: exampleState.plateCount });
    onSolve({ auto: true, solveSource: "example" });
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
};

function onSolve({ auto = false, solveSource = "manual" } = {}) {
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
    blockedMessage = "Set each lock's start hole and couplings first.";
    pulseTumblers();
    renderSolutionArea(state);
    return;
  }

  blockedMessage = undefined;
  solution = solve(state.positions, solverMatrix(state));
  trackSolveResult({ plateCount: state.plateCount, solution, landingType, solveSource });
  stepIndex = 0;
  showAllSteps = false;
  maybeShowSharePrompt(state);
  renderSolutionArea(state);

  if (!auto) {
    els.sequencePanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

els.solveBtn.addEventListener("click", () => onSolve());
store.subscribe(renderAll);
renderAll(store.getState());

if (store.wasLoadedFromHash && isLockMapped(store.getState())) {
  onSolve({ auto: true, solveSource: "hash" });
} else if (landingType === "cold") {
  onboarding.start({ skip: false });
} else {
  const skipReason = landingType === "hash" ? "hash_landing" : "returning_user";
  onboarding.start({ skip: true, skipReason });
}

document.getElementById("load-example-lock")?.addEventListener("click", () => {
  handlers.onLoadExampleLock(oldCampExample());
});
