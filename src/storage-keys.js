export const StorageKeys = Object.freeze({
  HAS_VISITED: "has_visited_v1",
  HASH_BANNER_DISMISSED: "hash_banner_dismissed_v1",
  ONBOARDING_DISMISSED_V3: "onboarding_dismissed_v3",
  SOLVE_COACHMARK_SEEN: "solve_coachmark_seen_v1",
  FIRST_SOLVE_TRACKED: "first_solve_tracked_v1",
  LOCALE: "locale_v1",
  I18N_BANNER_DISMISSED: "i18n_banner_dismissed_v1",
  LOCALE_SESSION_END_SENT: "locale_session_end_sent_v1",
  LOCALE_SUGGEST_DISMISSED: "locale_suggest_dismissed_v1",
  LOCALE_SUGGEST_SESSION_DISMISSED: "locale_suggest_session_dismissed_v1",
  GRATITUDE_PROMPT_DISMISSED: "gratitude_prompt_dismissed_v1",
  GRATITUDE_PROMPT_SHOWN: "gratitude_prompt_shown_v1",
  SHARE_PROMPT_SESSION_SHOWN: "share_prompt_session_shown_v1",
  HASH_FAILURE_COACHMARK_SEEN: "hash_failure_coachmark_seen_v1",
  CAMP: "camp_v1",
});

/** Persisted boolean flags — localStorage/sessionStorage value when set. */
export const StorageFlag = Object.freeze({
  SET: "1",
});
