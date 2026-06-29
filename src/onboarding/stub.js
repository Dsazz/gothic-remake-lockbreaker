import { TutorNotShownReason } from "../analytics/values.js";

export function createOnboardingStub({ onNotShown } = {}) {
  return {
    isActive: () => false,
    isChipVisible: () => false,
    refreshStep() {},
    showOptInChip: () => false,
    enterColdLanding() {
      onNotShown?.({ reason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
    },
    hideOptInChip() {},
    dismissOptInChip() {
      onNotShown?.({ reason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
    },
    startFromOptIn() {},
    start({ skip = false, skipReason = TutorNotShownReason.RETURNING_USER } = {}) {
      if (skip) {
        onNotShown?.({ reason: skipReason });
      }
    },
  };
}
