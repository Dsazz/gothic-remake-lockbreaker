import { VERSION } from "../version.js";
import { isDefaultLocale } from "../i18n.js";
import { StorageKeys, StorageFlag } from "../storage-keys.js";
import { Events } from "./events.js";
import { recordLocaleSwitch, seedLocaleEngagement } from "./locale-engagement.js";
import { localeChangeDirection } from "./locale-metrics.js";
import { LocaleChangeDirection, OnboardingAction } from "./values.js";
import { readLandingAttribution } from "./attribution.js";
import { registerSessionProperties, runWhenPostHogReady, send } from "./transport.js";

function baseProps(plateCount) {
  return { plate_count: plateCount, app_version: VERSION };
}

function solveProps(plateCount, landingType, solveSource) {
  return { ...baseProps(plateCount), landing_type: landingType, solve_source: solveSource };
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
    // ignore
  }
}

function firstSolveProps() {
  if (storageGet(StorageKeys.FIRST_SOLVE_TRACKED)) return {};
  storageSet(StorageKeys.FIRST_SOLVE_TRACKED, StorageFlag.SET);
  return { is_first_solve: true };
}

export function trackLanding({ landingType, locale, localeSource }) {
  const attribution = readLandingAttribution();
  const props = {
    landing_type: landingType,
    locale,
    locale_source: localeSource,
    app_version: VERSION,
    ...attribution,
  };
  const sessionProps = {
    landing_type: landingType,
    locale,
    app_version: VERSION,
    ...attribution,
  };
  runWhenPostHogReady(() => {
    send(Events.LANDING, props);
    registerSessionProperties(sessionProps);
  });
}

export function trackLocaleResolved({ locale, localeSource }) {
  send(Events.LOCALE_RESOLVED, {
    locale,
    locale_source: localeSource,
    app_version: VERSION,
  });
  seedLocaleEngagement({ locale, localeSource });
  const sessionProps = {
    initial_locale: locale,
    initial_locale_source: localeSource,
    locale,
    app_version: VERSION,
  };
  if (!isDefaultLocale(locale)) {
    sessionProps.ever_used_translation = true;
  }
  registerSessionProperties(sessionProps);
}

export function trackI18nBannerShown({ locale }) {
  send(Events.I18N_BANNER_SHOWN, { locale, app_version: VERSION });
}

export function trackLocaleSuggestShown({ suggestedLocale, hintSource }) {
  send(Events.LOCALE_SUGGEST_SHOWN, {
    suggested_locale: suggestedLocale,
    hint_source: hintSource,
    app_version: VERSION,
  });
}

export function trackLocaleSuggestAccepted({ suggestedLocale, hintSource }) {
  send(Events.LOCALE_SUGGEST_ACCEPTED, {
    suggested_locale: suggestedLocale,
    hint_source: hintSource,
    app_version: VERSION,
  });
}

export function trackLocaleSuggestDeclined({ suggestedLocale, hintSource, declineAction }) {
  send(Events.LOCALE_SUGGEST_DECLINED, {
    suggested_locale: suggestedLocale,
    hint_source: hintSource,
    decline_action: declineAction,
    app_version: VERSION,
  });
}

export function trackSolveButtonClicked({ plateCount, lockReady, landingType }) {
  send(Events.SOLVE_BUTTON_CLICKED, {
    ...baseProps(plateCount),
    lock_ready: lockReady,
    landing_type: landingType,
  });
}

export function trackSolveResult({
  plateCount,
  solution,
  landingType,
  solveSource,
  failureReason,
}) {
  const props = solveProps(plateCount, landingType, solveSource);
  if (solution === null) {
    send(Events.LOCK_NO_SOLUTION, { ...props, failure_reason: failureReason });
    return;
  }
  if (solution.length === 0) {
    send(Events.LOCK_ALREADY_SOLVED, props);
    return;
  }
  send(Events.LOCK_SOLVED, { ...props, ...firstSolveProps(), move_count: solution.length });
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

export function trackWalkthroughSessionSummary({
  plateCount,
  totalSteps,
  stepsViewedMax,
  forwardClicks,
  backClicks,
  jumpClicks,
  expandedAll,
}) {
  send(Events.WALKTHROUGH_SESSION_SUMMARY, {
    ...baseProps(plateCount),
    total_steps: totalSteps,
    steps_viewed_max: stepsViewedMax,
    forward_clicks: forwardClicks,
    back_clicks: backClicks,
    jump_clicks: jumpClicks,
    expanded_all: expandedAll,
  });
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

export function trackOnboardingDismissed({ completed, stepId, stepIndex, action, totalSteps }) {
  send(Events.ONBOARDING_DISMISSED, {
    completed,
    step_id: stepId,
    step_index: stepIndex,
    action: action ?? (completed ? OnboardingAction.COMPLETE : OnboardingAction.SKIP),
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


export function trackLocaleChanged({ locale, previousLocale, source, switchCount }) {
  const change_direction = localeChangeDirection({ locale, previousLocale });
  send(Events.LOCALE_CHANGED, {
    locale,
    previous_locale: previousLocale,
    source,
    change_direction,
    locale_switch_count: switchCount,
    is_revert_to_default: change_direction === LocaleChangeDirection.TO_DEFAULT,
    app_version: VERSION,
  });
  recordLocaleSwitch({ locale, changeDirection: change_direction });
  const sessionPatch = { locale, app_version: VERSION };
  if (change_direction === LocaleChangeDirection.TO_DEFAULT) {
    sessionPatch.ever_reverted_to_default = true;
  }
  if (!isDefaultLocale(locale)) {
    sessionPatch.ever_used_translation = true;
  }
  registerSessionProperties(sessionPatch);
}
