import { statesAlong } from "../core/solver.js";
import { solveAsync, cancelSolve } from "../solver/client.js";
import {
  getMappingCompleteness,
  isLockMapped,
  isPristineDefault,
  effectiveMatrix,
  isInBounds,
} from "../core/domain.js";
import * as view from "../view/index.js";
import { t, tCount } from "../i18n/index.js";
import {
  resolveSolveCoachmarkTrigger,
  SolveCoachmarkTrigger,
} from "../onboarding/solve-coachmark-schedule.js";
import {
  LandingType,
  MappingCompleteness,
  PromptKind,
  SolveFailureReason,
  SolveSource,
  SupportSource,
} from "../analytics/values.js";
import {
  trackPromptDismissed,
  trackSolveResult,
  trackStepMismatchClicked,
  trackStepsRevealed,
  trackHashBannerShown,
} from "../analytics/index.js";
import { SolveSession } from "../core/solve-session.js";
import { CoachmarkVariant } from "../onboarding/solve-coachmark.js";

// Localized success copy for the aria-live channel: empty solution means the
// lock was already open, otherwise announce the turn count. Pure so the branch
// can be unit-tested against the bundled English catalog.
export function solveSuccessText(moveCount) {
  return moveCount === 0
    ? t("solution.alreadyOpen")
    : tCount("solution.turnCount", moveCount);
}

export function buildWalkthrough(cursor, state, solverMatrixFn) {
  const { solution, stepIndex, showAllSteps } = cursor;
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
  const session = new SolveSession();
  session.setHashBannerVisible(shouldShowHashBanner());

  let pulseTimer;
  let flashTimer;
  let tumblersPulse = false;
  let solveReadyFlash = false;
  let stepsRevealedTracked = false;
  // Monotonic id for the latest solve request. A result is applied only if its
  // token still matches — lock edits and re-solves bump it, so a stale worker
  // result (or one for an edited board) is silently discarded.
  let solveToken = 0;

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
    session.clearPendingSolveCoachmark();
    const state = store.getState();
    if (!isLockMapped(state)) return;
    void solveCoachmark.show(els.solveBtn);
  }

  function maybeShowHashFailureCoachmark() {
    if (!session.pendingHashFailureCoachmark || uiPrefs.isHashFailureCoachmarkSeen()) return;
    if (onboarding.isActive()) return;
    session.clearPendingHashFailureCoachmark();
    uiPrefs.markHashFailureCoachmarkSeen();
    void solveCoachmark.show(els.solveBtn, { variant: CoachmarkVariant.HASH_FAILURE });
  }

  function handleSolveCoachmarkOnMapped(state) {
    const trigger = resolveSolveCoachmarkTrigger({
      landingCold: landingType === LandingType.COLD,
      justBecameMapped: true,
      tourActive: onboarding.isActive(),
      mapped: isLockMapped(state),
    });
    if (trigger === SolveCoachmarkTrigger.DEFER) {
      session.deferSolveCoachmark();
      return;
    }
    if (trigger === SolveCoachmarkTrigger.SHOW) {
      void solveCoachmark.show(els.solveBtn);
    }
  }

  function invalidate() {
    // Abandon any in-flight solve so its result can't land on a stale board.
    solveToken++;
    cancelSolve();
    if (solveCoachmark.isActive()) solveCoachmark.dismissSilent();
    session.reset();
  }

  function invalidateOnLockEdit() {
    if (session.solveFailed) {
      session.clearWalkthroughView();
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

  function announceSolveSuccess() {
    if (!els.ariaLive) return;
    const moveCount = Array.isArray(session.solution) ? session.solution.length : 0;
    els.ariaLive.textContent = solveSuccessText(moveCount);
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

  function maybeTrackStepsRevealed() {
    if (stepsRevealedTracked) return;
    const moveCount = Array.isArray(session.solution) ? session.solution.length : 0;
    if (moveCount === 0) return;
    stepsRevealedTracked = true;
    trackStepsRevealed({
      plateCount: store.getState().plateCount,
      moveCount,
      stepIndex: session.stepIndex,
    });
  }

  function maybeTrackHashBanner(state, hasMoves) {
    if (!session.hashBannerVisible || !hasMoves || session.hashBannerTracked) return;
    session.markHashBannerTracked();
    trackHashBannerShown({ plateCount: state.plateCount });
  }

  function renderSolutionArea(state, handlers) {
    const built = buildWalkthrough(
      {
        solution: session.solution,
        stepIndex: session.stepIndex,
        showAllSteps: session.showAllSteps,
      },
      state,
      solverMatrix,
    );
    if (built) session.clampStepIndexTo(built.clampedStepIndex);
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
        gratitudeRevealed: session.gratitudeRevealed,
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

  // Applies a finished solve result (success or failure) to the session: tracks
  // analytics, announces, and renders. Shared by the out-of-bounds short-circuit
  // and the async worker path so both branches behave identically.
  function applySolveResult(state, completeness, solveSource) {
    trackSolveResult({
      plateCount: state.plateCount,
      solution: session.solution,
      landingType,
      solveSource,
      failureReason: session.solveFailureReason,
      mappingCompleteness: completeness,
    });

    if (session.solution === null) {
      pulseTumblers();
      announceSolveFailure();
      if (solveSource === SolveSource.HASH && landingType === LandingType.HASH) {
        session.deferHashFailureCoachmark();
        maybeShowHashFailureCoachmark();
      }
    } else {
      announceSolveSuccess();
    }

    onRerender();
    scrollSequencePanel();
  }

  async function onSolve({ solveSource = SolveSource.MANUAL } = {}) {
    const state = store.getState();
    const completeness = mappingCompletenessFor(state);
    const mapped = completeness !== MappingCompleteness.INSUFFICIENT;

    if (!mapped) {
      session.setBlockedMessage(t("solution.blocked"));
      pulseTumblers();
      onRenderSolutionArea(state);
      return;
    }

    session.setBlockedMessage(undefined);

    // Out-of-bounds is decidable without the solver — short-circuit synchronously.
    if (!isInBounds(state.positions)) {
      session.applySolution(null, SolveFailureReason.OOB_START);
      applySolveResult(state, completeness, solveSource);
      return;
    }

    // Run the (potentially heavy) BFS off the main thread. Show the spinner,
    // keep the page interactive, then apply the result only if not superseded.
    const token = ++solveToken;
    session.beginSolve();
    onRerender();

    let solution;
    try {
      solution = await solveAsync(state.positions, solverMatrix(state));
    } catch {
      // Worker crashed unexpectedly: surface as "no path" rather than hanging.
      solution = null;
    }

    if (token !== solveToken) return; // superseded by an edit or a newer solve

    const failureReason = solution === null ? SolveFailureReason.NO_PATH : undefined;
    session.applySolution(solution, failureReason);
    applySolveResult(state, completeness, solveSource);
  }

  function onMapped(state) {
    flashSolveReady();
    handleSolveCoachmarkOnMapped(state);
  }

  function refreshHashBannerVisibility() {
    session.setHashBannerVisible(shouldShowHashBanner());
  }

  function onLocaleChangeRefresh() {
    session.refreshBlockedMessage(t("solution.blocked"));
  }

  const handlers = {
    onWalk(delta) {
      session.walk(delta);
      onRenderSolutionArea(store.getState());
    },
    onJumpTo(index) {
      session.jumpTo(index);
      onRenderSolutionArea(store.getState());
    },
    onToggleSteps() {
      if (session.toggleSteps()) maybeTrackStepsRevealed();
      onRenderSolutionArea(store.getState());
    },
    onMinimizeSequence() {
      session.minimizeSequence();
      onRenderSolutionArea(store.getState());
    },
    onExpandSequence() {
      session.expandSequence();
      onRenderSolutionArea(store.getState());
      scrollSequencePanel();
    },
    onClearSolution() {
      invalidate();
      onRerender();
    },
    onDismissHashBanner() {
      session.setHashBannerVisible(false);
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
      session.toggleMismatchTips();
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
    getSolving: () => session.solving,
    hasActiveSolution: () =>
      session.solveFailed ||
      (Array.isArray(session.solution) && session.solution.length > 0),
    // Whether `←/→` should step the walkthrough: a non-empty solution is on
    // screen and not collapsed. False while solving (solution is undefined).
    canWalk: () =>
      Array.isArray(session.solution) &&
      session.solution.length > 0 &&
      !session.sequenceMinimized,
    getMappingCompleteness: () => mappingCompletenessFor(store.getState()),
  };
}
