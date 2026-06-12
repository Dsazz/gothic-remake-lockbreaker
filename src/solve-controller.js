import { solve, statesAlong } from "./solver.js";
import {
  isLockMapped,
  isPristineDefault,
  effectiveMatrix,
  isInBounds,
} from "./domain.js";
import * as view from "./view.js";
import { t } from "./i18n.js";
import {
  resolveSolveCoachmarkTrigger,
  SolveCoachmarkTrigger,
} from "./solve-coachmark-schedule.js";
import {
  LandingType,
  PromptKind,
  SolveFailureReason,
  SolveSource,
} from "./analytics/values.js";
import {
  trackPromptDismissed,
  trackShareLinkCopied,
  trackShareLinkCopyFailed,
  trackSharePromptClicked,
  trackSharePromptShown,
  trackSolveButtonClicked,
  trackSolveResult,
  trackWalkthroughSessionSummary,
  trackStepMismatchClicked,
} from "./analytics/index.js";
import { createWalkthroughSummaryTracker } from "./walkthrough-summary.js";

export function createEmptySession() {
  return {
    solution: undefined,
    solveFailureReason: undefined,
    stepIndex: 0,
    showAllSteps: false,
    sequenceMinimized: false,
    copyCopied: false,
    blockedMessage: undefined,
    hashBannerVisible: false,
    sharePromptVisible: false,
    sharePromptTracked: false,
    showMismatchTips: false,
    pendingSolveCoachmark: false,
  };
}

export function buildWalkthrough(session, state, solverMatrixFn) {
  const { solution, stepIndex, showAllSteps } = session;
  if (!solution || solution.length === 0) return null;
  const matrix = solverMatrixFn(state);
  const states = statesAlong(state.positions, matrix, solution);
  const clamped = Math.min(stepIndex, states.length - 1);
  return {
    states,
    stepIndex: clamped,
    move: solution[clamped] ?? null,
    showAll: showAllSteps,
    clampedStepIndex: clamped,
  };
}

export function resetSession(session, { dismissCoachmark } = {}) {
  if (dismissCoachmark) dismissCoachmark();
  session.solution = undefined;
  session.solveFailureReason = undefined;
  session.stepIndex = 0;
  session.showAllSteps = false;
  session.sequenceMinimized = false;
  session.blockedMessage = undefined;
  session.sharePromptVisible = false;
  session.sharePromptTracked = false;
  session.showMismatchTips = false;
  session.pendingSolveCoachmark = false;
}

export function createSolveController({
  store,
  els,
  uiPrefs,
  onboarding,
  solveCoachmark,
  landingType,
  wasLoadedFromHash,
  onRerender,
  onRenderSolutionArea,
  getHandlers,
}) {
  const session = createEmptySession();
  session.hashBannerVisible = shouldShowHashBanner();

  const walkthroughSummary = createWalkthroughSummaryTracker({
    onFlush: (stats) => trackWalkthroughSessionSummary(stats),
  });

  let copyTimer;
  let pulseTimer;
  let flashTimer;
  let tumblersPulse = false;
  let solveReadyFlash = false;

  function shouldShowHashBanner() {
    if (uiPrefs.isHashBannerDismissed()) return false;
    return wasLoadedFromHash && !isPristineDefault(store.getState());
  }

  function solverMatrix(state) {
    return effectiveMatrix(state.matrix, state.removedLinks);
  }

  function flushPendingCoachmark() {
    if (!session.pendingSolveCoachmark || onboarding.isActive()) return;
    session.pendingSolveCoachmark = false;
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
      session.pendingSolveCoachmark = true;
      return;
    }
    if (trigger === SolveCoachmarkTrigger.SHOW) {
      void solveCoachmark.show(els.solveBtn);
    }
  }

  function invalidate() {
    walkthroughSummary.flush();
    resetSession(session, {
      dismissCoachmark: () => {
        if (solveCoachmark.isActive()) solveCoachmark.dismissSilent();
      },
    });
  }

  function beginWalkthroughSummary(state) {
    const totalSteps = session.solution?.length ?? 0;
    if (totalSteps === 0) return;
    walkthroughSummary.begin({ totalSteps, plateCount: state.plateCount });
    walkthroughSummary.recordStepView(0);
  }

  function announceSolveFailure() {
    if (!els.ariaLive) return;
    const isOob = session.solveFailureReason === SolveFailureReason.OOB_START;
    els.ariaLive.textContent = isOob ? t("solution.oob") : t("solution.noPath");
  }

  function pulseTumblers() {
    tumblersPulse = true;
    onRerender();
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => {
      tumblersPulse = false;
      onRerender();
    }, 1200);
  }

  function flashSolveReady() {
    solveReadyFlash = true;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      solveReadyFlash = false;
      onRerender();
    }, 900);
  }

  function scrollSequencePanel() {
    els.sequencePanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function scrollSharePromptIntoView() {
    els.sharePrompt?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function maybeShowSharePrompt(state) {
    if (shouldShowHashBanner()) return;
    if (!Array.isArray(session.solution) || session.solution.length === 0) return;
    session.sharePromptVisible = true;
    if (!session.sharePromptTracked) {
      session.sharePromptTracked = true;
      trackSharePromptShown({ plateCount: state.plateCount });
    }
  }

  function renderSolutionArea(state, handlers) {
    const built = buildWalkthrough(session, state, solverMatrix);
    if (built) session.stepIndex = built.clampedStepIndex;
    const walkthrough = built
      ? {
          states: built.states,
          stepIndex: built.stepIndex,
          move: built.move,
          showAll: built.showAll,
        }
      : null;
    const hasMoves = Array.isArray(session.solution) && session.solution.length > 0;
    const minimized = session.sequenceMinimized && hasMoves;
    const lockReady = isLockMapped(state);
    view.renderSequencePanel(els.sequencePanel, session.solution, { minimized }, handlers);
    view.renderHashBanner(
      els.hashBanner,
      { visible: session.hashBannerVisible && hasMoves },
      handlers,
    );
    view.renderSharePrompt(
      els.sharePrompt,
      { visible: session.sharePromptVisible && hasMoves, copyCopied: session.copyCopied },
      handlers,
    );
    view.renderSolution(
      els.solution,
      session.solution,
      walkthrough,
      {
        minimized,
        blockedMessage: session.blockedMessage,
        lockReady,
        showMismatchTips: session.showMismatchTips,
        state,
        failureReason: session.solveFailureReason,
      },
      handlers,
    );
    view.renderHelpOverlay(
      {
        visible:
          session.showMismatchTips && hasMoves && !minimized && Boolean(walkthrough?.move),
        state,
      },
      handlers,
    );
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
    session.copyCopied = true;
    if (els.ariaLive) els.ariaLive.textContent = t("aria.copyOk");
    onRerender();
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      session.copyCopied = false;
      if (els.ariaLive) els.ariaLive.textContent = "";
      onRerender();
    }, 2000);
  }

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
      session.blockedMessage = t("solution.blocked");
      pulseTumblers();
      onRenderSolutionArea(state);
      return;
    }

    walkthroughSummary.flush();
    session.blockedMessage = undefined;
    if (!isInBounds(state.positions)) {
      session.solution = null;
      session.solveFailureReason = SolveFailureReason.OOB_START;
    } else {
      session.solution = solve(state.positions, solverMatrix(state));
      session.solveFailureReason =
        session.solution === null ? SolveFailureReason.NO_PATH : undefined;
    }

    trackSolveResult({
      plateCount: state.plateCount,
      solution: session.solution,
      landingType,
      solveSource,
      failureReason: session.solveFailureReason,
    });
    session.stepIndex = 0;
    session.showAllSteps = false;

    if (session.solution === null) {
      pulseTumblers();
      announceSolveFailure();
    } else if (Array.isArray(session.solution) && session.solution.length > 0) {
      beginWalkthroughSummary(state);
    } else {
      walkthroughSummary.clear();
    }

    maybeShowSharePrompt(state);
    onRenderSolutionArea(state);
    scrollSequencePanel();

    if (session.sharePromptVisible && Array.isArray(session.solution) && session.solution.length > 0) {
      scrollSharePromptIntoView();
    }
  }

  function onMapped(state) {
    flashSolveReady();
    handleSolveCoachmarkOnMapped(state);
  }

  function refreshHashBannerVisibility() {
    session.hashBannerVisible = shouldShowHashBanner();
  }

  function onLocaleChangeRefresh() {
    if (session.blockedMessage) session.blockedMessage = t("solution.blocked");
  }

  const handlers = {
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
      const total = session.solution?.length ?? 0;
      const prev = session.stepIndex;
      session.stepIndex += delta;
      session.stepIndex = Math.max(0, Math.min(session.stepIndex, total));
      if (session.stepIndex !== prev) {
        session.showMismatchTips = false;
        if (delta > 0) walkthroughSummary.recordForward(session.stepIndex);
        else walkthroughSummary.recordBack(session.stepIndex);
      }
      onRenderSolutionArea(store.getState());
    },
    onJumpTo(index) {
      const total = session.solution?.length ?? 0;
      const prev = session.stepIndex;
      session.stepIndex = Math.max(0, Math.min(index, total));
      if (session.stepIndex !== prev) {
        session.showMismatchTips = false;
        walkthroughSummary.recordJump(session.stepIndex);
      }
      onRenderSolutionArea(store.getState());
    },
    onToggleSteps() {
      session.showAllSteps = !session.showAllSteps;
      if (session.showAllSteps) walkthroughSummary.recordExpandedAll();
      onRenderSolutionArea(store.getState());
    },
    onMinimizeSequence() {
      session.sequenceMinimized = true;
      session.showAllSteps = false;
      onRenderSolutionArea(store.getState());
    },
    onExpandSequence() {
      session.sequenceMinimized = false;
      onRenderSolutionArea(store.getState());
      scrollSequencePanel();
    },
    onClearSolution() {
      invalidate();
      onRerender();
    },
    onDismissHashBanner() {
      session.hashBannerVisible = false;
      uiPrefs.dismissHashBanner();
      trackPromptDismissed({
        prompt: PromptKind.HASH_BANNER,
        plateCount: store.getState().plateCount,
      });
      onRenderSolutionArea(store.getState());
    },
    async onSharePromptClick() {
      trackSharePromptClicked({ plateCount: store.getState().plateCount });
      const copied = await handlers.onCopyShareLink();
      if (copied) getHandlers().onDismissSharePrompt();
    },
    onDismissSharePrompt() {
      session.sharePromptVisible = false;
      trackPromptDismissed({
        prompt: PromptKind.SHARE,
        plateCount: store.getState().plateCount,
      });
      onRenderSolutionArea(store.getState());
    },
    onStepMismatch() {
      session.showMismatchTips = !session.showMismatchTips;
      trackStepMismatchClicked({
        stepIndex: session.stepIndex,
        plateCount: store.getState().plateCount,
      });
      onRenderSolutionArea(store.getState());
    },
  };

  return {
    handlers,
    invalidate,
    onSolve,
    renderSolutionArea,
    flushPendingCoachmark,
    onMapped,
    refreshHashBannerVisibility,
    onLocaleChangeRefresh,
    getTumblersPulse: () => tumblersPulse,
    getSolveReadyFlash: () => solveReadyFlash,
    flushWalkthroughSummary: () => walkthroughSummary.flush(),
  };
}
