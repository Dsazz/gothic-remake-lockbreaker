import { LandingType, SolveSource, TutorNotShownReason } from "../analytics/values.js";

export const StartupAction = {
  AUTO_SOLVE: "auto_solve",
  COLD_ENTRY: "cold_entry",
  SKIP: "skip",
};

export function resolveStartup({ landingType, wasLoadedFromHash, mapped }) {
  if (wasLoadedFromHash && mapped) {
    return { action: StartupAction.AUTO_SOLVE, solveSource: SolveSource.HASH };
  }
  if (landingType === LandingType.COLD) {
    return { action: StartupAction.COLD_ENTRY };
  }
  return {
    action: StartupAction.SKIP,
    skipReason:
      landingType === LandingType.HASH
        ? TutorNotShownReason.HASH_LANDING
        : TutorNotShownReason.RETURNING_USER,
  };
}
