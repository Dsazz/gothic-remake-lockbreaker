import { solve, statesAlong } from "./solver.js";
import {
  getMappingCompleteness,
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
  MappingCompleteness,
  PromptKind,
  SolveFailureReason,
  SolveSource,
  SupportSource,
} from "./analytics/values.js";
import {
  trackPromptDismissed,
  trackSolveResult,
  trackStepMismatchClicked,
  trackHashBannerShown,
} from "./analytics/index.js";

export function createEmptySession() {
  return {
    solution: undefined,
    solveFailureReason: undefined,
    stepIndex: 0,
    showAllSteps: false,
    sequenceMinimized: false,
    blockedMessage: undefined,
    hashBannerVisible: false,
    hashBannerTracked: false,
    showMismatchTips: false,
    pendingSolveCoachmark: false,
    pendingHashFailureCoachmark: false,
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
  session.showMismatchTips = false;
  session.pendingSolveCoachmark = false;
  session.pendingHashFailureCoachmark = false;
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

  function mappingCompletenessFor(state) {
    return getMappingCompleteness(state);
  }

  function flushPendingCoachmark() {
    if (!session.pendingSolveCoachmark || onboarding.isActive()) return;
    session.pendingSolveCoachmark = false;
    const state = store.getState();
    if (!isLockMapped(state)) return;
    void solveCoachmark.show(els.solveBtn);
  }

  function maybeShowHashFailureCoachmark() {
    if (!session.pendingHashFailureCoachmark || uiPrefs.isHashFailureCoachmarkSeen()) return;
    if (onboarding.isActive()) return;
    session.pendingHashFailureCoachmark = false;
    uiPrefs.markHashFailureCoachmarkSeen();
    void solveCoachmark.show(els.solveBtn, { variant: "hash_failure" });
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
    resetSession(session, {
      dismissCoachmark: () => {
        if (solveCoachmark.isActive()) solveCoachmark.dismissSilent();
      },
    });
  }

  function invalidateOnLockEdit() {
    if (session.solution === null && session.solveFailureReason) {
      session.showMismatchTips = false;
      session.sequenceMinimized = false;
      session.showAllSteps = false;
      session.stepIndex = 0;
      onRerender();
      return;
    }
    invalidate();
    onRerender();
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

  function maybeTrackHashBanner(state, hasMoves) {
    if (!session.hashBannerVisible || !hasMoves || session.hashBannerTracked) return;
    session.hashBannerTracked = true;
    trackHashBannerShown({ plateCount: state.plateCount });
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
    const completeness = mappingCompletenessFor(state);
    const mappingPartial = completeness === MappingCompleteness.PARTIAL;
    const lockReady = completeness === MappingCompleteness.READY;

    view.renderSequencePanel(
      els.sequencePanel,
      session.solution,
      { minimized, lockMapped: isLockMapped(state) },
      handlers,
    );
    maybeTrackHashBanner(state, hasMoves);
    view.renderHashBanner(
      els.hashBanner,
      { visible: session.hashBannerVisible && hasMoves },
      handlers,
    );
    view.renderGratitudePrompt(
      els.gratitudePrompt,
      { visible: hasMoves },
      handlers,
    );
    view.renderMappingWarning(
      els.mappingWarning,
      { visible: mappingPartial && !hasMoves },
    );
    view.renderSolution(
      els.solution,
      session.solution,
      walkthrough,
      {
        minimized,
        blockedMessage: session.blockedMessage,
        lockReady,
        mappingPartial,
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

  function onSolve({ solveSource = SolveSource.MANUAL } = {}) {
    const state = store.getState();
    const completeness = mappingCompletenessFor(state);
    const mapped = completeness !== MappingCompleteness.INSUFFICIENT;

    if (!mapped) {
      session.blockedMessage = t("solution.blocked");
      pulseTumblers();
      onRenderSolutionArea(state);
      return;
    }

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
      mappingCompleteness: completeness,
    });
    session.stepIndex = 0;
    session.showAllSteps = false;

    if (session.solution === null) {
      pulseTumblers();
      announceSolveFailure();
      if (solveSource === SolveSource.HASH && landingType === LandingType.HASH) {
        session.pendingHashFailureCoachmark = true;
        maybeShowHashFailureCoachmark();
      }
    }

    onRenderSolutionArea(state);
    scrollSequencePanel();
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
    onWalk(delta) {
      const total = session.solution?.length ?? 0;
      const prev = session.stepIndex;
      session.stepIndex += delta;
      session.stepIndex = Math.max(0, Math.min(session.stepIndex, total));
      if (session.stepIndex !== prev) {
        session.showMismatchTips = false;
      }
      onRenderSolutionArea(store.getState());
    },
    onJumpTo(index) {
      const total = session.solution?.length ?? 0;
      const prev = session.stepIndex;
      session.stepIndex = Math.max(0, Math.min(index, total));
      if (session.stepIndex !== prev) {
        session.showMismatchTips = false;
      }
      onRenderSolutionArea(store.getState());
    },
    onToggleSteps() {
      session.showAllSteps = !session.showAllSteps;
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
    onGratitudeDonateClick() {
      getHandlers().onSupportClick(SupportSource.SEQUENCE_POST_SOLVE);
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
    invalidateOnLockEdit,
    onSolve,
    renderSolutionArea,
    flushPendingCoachmark,
    maybeShowHashFailureCoachmark,
    onMapped,
    refreshHashBannerVisibility,
    onLocaleChangeRefresh,
    getTumblersPulse: () => tumblersPulse,
    getSolveReadyFlash: () => solveReadyFlash,
    getMappingCompleteness: () => mappingCompletenessFor(store.getState()),
  };
}
