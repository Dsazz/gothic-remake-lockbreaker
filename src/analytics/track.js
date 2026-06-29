import { VERSION } from "../version.js";
import { isDefaultLocale } from "../i18n/index.js";
import { StorageKeys, StorageFlag } from "../storage/keys.js";
import { Events } from "./events.js";
import { recordLocaleSwitch, seedLocaleEngagement } from "./locale-engagement.js";
import { localeChangeDirection } from "./locale-metrics.js";
import { LocaleChangeDirection, OnboardingAction } from "./values.js";
import { readLandingAttribution } from "./attribution.js";
import { registerSessionProperties, runWhenPostHogReady, send } from "./transport.js";

function baseProps(plateCount) {
  return { plate_count: plateCount, app_version: VERSION };
}

function supportProps({ source, plateCount, locale }) {
  return {
    source,
    app_version: VERSION,
    ...(plateCount != null ? { plate_count: plateCount } : {}),
    ...(locale ? { locale } : {}),
  };
}

function solveProps(plateCount, landingType, solveSource, mappingCompleteness) {
  return {
    ...baseProps(plateCount),
    landing_type: landingType,
    solve_source: solveSource,
    ...(mappingCompleteness ? { mapping_completeness: mappingCompleteness } : {}),
  };
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

export function trackSolveResult({
  plateCount,
  solution,
  landingType,
  solveSource,
  failureReason,
  mappingCompleteness,
}) {
  const props = solveProps(plateCount, landingType, solveSource, mappingCompleteness);
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

export function trackPromptDismissed({ prompt, plateCount }) {
  send(Events.PROMPT_DISMISSED, { ...baseProps(plateCount), prompt });
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

export function trackStepMismatchClicked({ stepIndex, plateCount }) {
  send(Events.STEP_MISMATCH_CLICKED, {
    ...baseProps(plateCount),
    step_index: stepIndex,
  });
}

export function trackStepsRevealed({ plateCount, moveCount, stepIndex }) {
  send(Events.STEPS_REVEALED, {
    ...baseProps(plateCount),
    move_count: moveCount,
    step_index: stepIndex,
  });
}

export function trackSupportLinkClicked({ source, plateCount, locale }) {
  send(Events.SUPPORT_LINK_CLICKED, supportProps({ source, plateCount, locale }));
}

export function trackHashBannerShown({ plateCount }) {
  send(Events.HASH_BANNER_SHOWN, baseProps(plateCount));
}

export function trackTranslationFeedbackClicked({ locale }) {
  send(Events.TRANSLATION_FEEDBACK_CLICKED, { locale, app_version: VERSION });
}

export function trackLocaleAutoApplied({ locale, hintSource }) {
  send(Events.LOCALE_AUTO_APPLIED, {
    locale,
    hint_source: hintSource,
    app_version: VERSION,
  });
}

export function trackCampSelected({ camp, previousCamp }) {
  send(Events.CAMP_SELECTED, {
    camp,
    previous_camp: previousCamp,
    app_version: VERSION,
  });
}

export function trackCampHintShown() {
  send(Events.CAMP_HINT_SHOWN, { app_version: VERSION });
}

export function trackCampPickerOpened({ source, hadCamp }) {
  send(Events.CAMP_PICKER_OPENED, {
    source,
    had_camp: hadCamp,
    app_version: VERSION,
  });
}

export function trackShortcutsOpened({ source }) {
  send(Events.SHORTCUTS_OPENED, { source, app_version: VERSION });
}

export function trackKeyboardNavUsed({ surface }) {
  send(Events.KEYBOARD_NAV_USED, { surface, app_version: VERSION });
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
