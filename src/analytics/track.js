import { VERSION } from "../version.js";
import { Events } from "./events.js";
import { send } from "./transport.js";

function baseProps(plateCount) {
  return { plate_count: plateCount, app_version: VERSION };
}

export function trackLanding({ landingType }) {
  send(Events.LANDING, { landing_type: landingType, app_version: VERSION });
}

export function trackSolveButtonClicked({ plateCount, lockReady, landingType }) {
  send(Events.SOLVE_BUTTON_CLICKED, {
    ...baseProps(plateCount),
    lock_ready: lockReady,
    landing_type: landingType,
  });
}

export function trackSolveBlocked({ plateCount, landingType }) {
  send(Events.LOCK_SOLVE_BLOCKED, { ...baseProps(plateCount), landing_type: landingType });
}

export function trackSolveResult({ plateCount, solution, landingType }) {
  if (solution === null) {
    send(Events.LOCK_NO_SOLUTION, { ...baseProps(plateCount), landing_type: landingType });
    return;
  }
  if (solution.length === 0) {
    send(Events.LOCK_ALREADY_SOLVED, { ...baseProps(plateCount), landing_type: landingType });
    return;
  }
  send(Events.LOCK_SOLVED, {
    ...baseProps(plateCount),
    move_count: solution.length,
    landing_type: landingType,
  });
}

export function trackShareLinkCopied({ plateCount }) {
  send(Events.SHARE_LINK_COPIED, baseProps(plateCount));
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

export function trackOnboardingDismissed({ completed }) {
  send(Events.ONBOARDING_DISMISSED, { completed, app_version: VERSION });
}
