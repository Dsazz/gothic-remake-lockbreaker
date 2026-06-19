export const LandingType = Object.freeze({
  COLD: "cold",
  HASH: "hash",
  RETURNING: "returning",
});

export const SolveSource = Object.freeze({
  MANUAL: "manual",
  HASH: "hash",
  EXAMPLE: "example",
});

export const SolveFailureReason = Object.freeze({
  OOB_START: "oob_start",
  NO_PATH: "no_path",
});

export const ShareTrigger = Object.freeze({
  LONG_SOLUTION: "long_solution",
  RECOVERED_NO_SOLUTION: "recovered_no_solution",
});

export const OnboardingStepId = Object.freeze({
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
  SHARE: "share",
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
  SEQUENCE_MINIBAR: "sequence_minibar",
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

export const LocaleChangeDirection = Object.freeze({
  TO_TRANSLATION: "to_translation",
  TO_DEFAULT: "to_default",
  BETWEEN_TRANSLATIONS: "between_translations",
});

