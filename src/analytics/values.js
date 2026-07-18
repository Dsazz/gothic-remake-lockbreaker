export const LandingType = Object.freeze({
  COLD: "cold",
  HASH: "hash",
  RETURNING: "returning",
});

export const SolveSource = Object.freeze({
  MANUAL: "manual",
  HASH: "hash",
  EXAMPLE: "example",
  CATALOG: "catalog",
});

export const SolveFailureReason = Object.freeze({
  OOB_START: "oob_start",
  NO_PATH: "no_path",
});

export const OnboardingStepId = Object.freeze({
  BROWSE_LOCKS: "browse_locks",
  MASTERY_TIER: "mastery_tier",
  PLATE_COUNT: "plate_count",
  START_HOLES: "start_holes",
  COUPLINGS: "couplings",
  SOLVE: "solve",
  SOLVE_COACHMARK: "solve_coachmark",
});

export const MappingCompleteness = Object.freeze({
  INSUFFICIENT: "insufficient",
  PARTIAL: "partial",
  READY: "ready",
});

export const OnboardingAction = Object.freeze({
  SKIP: "skip",
  COMPLETE: "complete",
  SOLVE: "solve",
  BACKDROP: "backdrop",
});

export const TutorNotShownReason = Object.freeze({
  HASH_LANDING: "hash_landing",
  RETURNING_USER: "returning_user",
  PREVIOUSLY_DISMISSED: "previously_dismissed",
});

export const PromptKind = Object.freeze({
  HASH_BANNER: "hash_banner",
  I18N_BANNER: "i18n_banner",
});

export const GuideSource = Object.freeze({
  MANUAL: "manual",
  ONBOARDING_COMPLETE: "onboarding_complete",
  FAILURE_NO_PATH: "failure_no_path",
});

export const SupportSource = Object.freeze({
  HEADER_ORE: "header_ore",
  HEADER_PORTRAIT: "header_portrait",
  HEADER_SLEEPER: "header_sleeper",
  FOOTER_STRIP: "footer_strip",
  I18N_BANNER: "i18n_banner",
  SEQUENCE_POST_SOLVE: "sequence_post_solve",
});

export const LocaleAutoHintSource = Object.freeze({
  REFERRER: "referrer",
  NAVIGATOR: "navigator",
});


export const LocaleChangeSource = Object.freeze({
  SWITCHER: "switcher",
  SUGGEST_BAR: "suggest_bar",
});

export const LocaleSuggestDeclineAction = Object.freeze({
  ENGLISH: "english",
  DISMISS: "dismiss",
});

export const CampId = Object.freeze({
  OLD: "old",
  NEW: "new",
  SWAMP: "swamp",
  NONE: "none",
});

export const CampPickerSource = Object.freeze({
  HINT: "hint",
  MANUAL: "manual",
});

export const ShortcutsSource = Object.freeze({
  ICON: "icon",
  KEY: "key",
  NEW_BADGE: "new_badge",
});

export const KeyboardSurface = Object.freeze({
  WALKTHROUGH: "walkthrough",
  MAPPING: "mapping",
});

export const LocaleChangeDirection = Object.freeze({
  TO_TRANSLATION: "to_translation",
  TO_DEFAULT: "to_default",
  BETWEEN_TRANSLATIONS: "between_translations",
});

