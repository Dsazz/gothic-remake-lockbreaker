import { VERSION } from "../version.js";
import { Events } from "./events.js";
import { registerSessionProperties, send } from "./transport.js";

function baseProps(plateCount) {
  return { plate_count: plateCount, app_version: VERSION };
}

function solveProps(plateCount, landingType, solveSource) {
  return { ...baseProps(plateCount), landing_type: landingType, solve_source: solveSource };
}

export function trackLanding({ landingType }) {
  send(Events.LANDING, { landing_type: landingType, app_version: VERSION });
  registerSessionProperties({ landing_type: landingType, app_version: VERSION });
}

export function trackSolveButtonClicked({ plateCount, lockReady, landingType }) {
  send(Events.SOLVE_BUTTON_CLICKED, {
    ...baseProps(plateCount),
    lock_ready: lockReady,
    landing_type: landingType,
  });
}

export function trackSolveResult({ plateCount, solution, landingType, solveSource = "manual" }) {
  const props = solveProps(plateCount, landingType, solveSource);
  if (solution === null) {
    send(Events.LOCK_NO_SOLUTION, props);
    return;
  }
  if (solution.length === 0) {
    send(Events.LOCK_ALREADY_SOLVED, props);
    return;
  }
  send(Events.LOCK_SOLVED, { ...props, move_count: solution.length });
}

export function trackLockBecameMappable({ plateCount }) {
  send(Events.LOCK_BECAME_MAPPABLE, baseProps(plateCount));
}

export function trackExampleLockLoaded({ plateCount }) {
  send(Events.EXAMPLE_LOCK_LOADED, baseProps(plateCount));
}

export function trackGuideOpened({ source }) {
  send(Events.GUIDE_OPENED, { source, app_version: VERSION });
}

export function trackWalkthroughStepChanged({ direction, stepIndex, totalSteps, plateCount }) {
  send(Events.WALKTHROUGH_STEP_CHANGED, {
    ...baseProps(plateCount),
    direction,
    step_index: stepIndex,
    total_steps: totalSteps,
  });
}

export function trackWalkthroughUiToggled({ action, plateCount }) {
  send(Events.WALKTHROUGH_UI_TOGGLED, { ...baseProps(plateCount), action });
}

export function trackPromptDismissed({ prompt, plateCount }) {
  send(Events.PROMPT_DISMISSED, { ...baseProps(plateCount), prompt });
}

export function trackShareLinkCopied({ plateCount }) {
  send(Events.SHARE_LINK_COPIED, baseProps(plateCount));
}

export function trackShareLinkCopyFailed({ plateCount }) {
  send(Events.SHARE_LINK_COPY_FAILED, baseProps(plateCount));
}

export function trackSharePromptShown({ plateCount }) {
  send(Events.SHARE_PROMPT_SHOWN, baseProps(plateCount));
}

export function trackSharePromptClicked({ plateCount }) {
  send(Events.SHARE_PROMPT_CLICKED, baseProps(plateCount));
}

export function trackLockCleared() {
  send(Events.LOCK_CLEARED, { app_version: VERSION });
}

export function trackOnboardingStepViewed({ stepId }) {
  send(Events.ONBOARDING_STEP_VIEWED, { step_id: stepId, app_version: VERSION });
}

export function trackOnboardingDismissed({ completed, stepId, stepIndex, action, totalSteps }) {
  send(Events.ONBOARDING_DISMISSED, {
    completed,
    step_id: stepId,
    step_index: stepIndex,
    action: action ?? (completed ? "complete" : "skip"),
    total_steps: totalSteps,
    app_version: VERSION,
  });
}

export function trackTutorStarted({ totalSteps }) {
  send(Events.TUTOR_STARTED, { total_steps: totalSteps, app_version: VERSION });
}

export function trackTutorNotShown({ reason }) {
  send(Events.TUTOR_NOT_SHOWN, { reason, app_version: VERSION });
}

export function trackTutorNextClicked({ stepId, stepIndex, totalSteps, isFinal }) {
  send(Events.TUTOR_NEXT_CLICKED, {
    step_id: stepId,
    step_index: stepIndex,
    total_steps: totalSteps,
    is_final: isFinal,
    app_version: VERSION,
  });
}

export function trackTutorSkipped({ stepId, stepIndex, totalSteps }) {
  send(Events.TUTOR_SKIPPED, {
    step_id: stepId,
    step_index: stepIndex,
    total_steps: totalSteps,
    app_version: VERSION,
  });
}

export function trackMasteryTierChanged({ tier }) {
  send(Events.MASTERY_TIER_CHANGED, { tier, app_version: VERSION });
}

export function trackStepMismatchClicked({ stepIndex, plateCount }) {
  send(Events.STEP_MISMATCH_CLICKED, {
    ...baseProps(plateCount),
    step_index: stepIndex,
  });
}

export function trackSupportLinkClicked({ source }) {
  send(Events.SUPPORT_LINK_CLICKED, { source, app_version: VERSION });
}
