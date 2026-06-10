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

export const OnboardingStepId = Object.freeze({
  MASTERY_TIER: "mastery_tier",
  PLATE_COUNT: "plate_count",
  START_HOLES: "start_holes",
  COUPLINGS: "couplings",
  SOLVE_COACHMARK: "solve_coachmark",
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
});

export const SupportSource = Object.freeze({
  HEADER_ORE: "header_ore",
  FOOTER_STRIP: "footer_strip",
  I18N_BANNER: "i18n_banner",
});

export const LocaleChangeSource = Object.freeze({
  SWITCHER: "switcher",
});

export const LocaleChangeDirection = Object.freeze({
  TO_TRANSLATION: "to_translation",
  TO_DEFAULT: "to_default",
  BETWEEN_TRANSLATIONS: "between_translations",
});

export const WalkthroughDirection = Object.freeze({
  FORWARD: "forward",
  BACK: "back",
  JUMP: "jump",
});

export const WalkthroughUiAction = Object.freeze({
  SHOW_ALL: "show_all",
  MINIMIZE: "minimize",
  EXPAND: "expand",
  CLEAR_SOLUTION: "clear_solution",
});
