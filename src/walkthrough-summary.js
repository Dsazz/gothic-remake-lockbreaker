/** Aggregates walkthrough navigation per solve; flushed once to cut PostHog volume. */
export function createWalkthroughSummaryTracker({ onFlush }) {
  let stats = null;

  function emptyStats({ totalSteps, plateCount }) {
    return {
      totalSteps,
      plateCount,
      stepsViewedMax: 0,
      forwardClicks: 0,
      backClicks: 0,
      jumpClicks: 0,
      expandedAll: false,
    };
  }

  function hasActivity(s) {
    return (
      s.forwardClicks > 0 ||
      s.backClicks > 0 ||
      s.jumpClicks > 0 ||
      s.expandedAll ||
      s.stepsViewedMax > 0
    );
  }

  return {
    begin({ totalSteps, plateCount }) {
      stats = emptyStats({ totalSteps, plateCount });
    },

    recordStepView(stepIndex) {
      if (!stats) return;
      stats.stepsViewedMax = Math.max(stats.stepsViewedMax, stepIndex + 1);
    },

    recordForward(stepIndex) {
      if (!stats) return;
      stats.forwardClicks += 1;
      this.recordStepView(stepIndex);
    },

    recordBack(stepIndex) {
      if (!stats) return;
      stats.backClicks += 1;
      this.recordStepView(stepIndex);
    },

    recordJump(stepIndex) {
      if (!stats) return;
      stats.jumpClicks += 1;
      this.recordStepView(stepIndex);
    },

    recordExpandedAll() {
      if (!stats) return;
      stats.expandedAll = true;
    },

    flush() {
      if (!stats || !hasActivity(stats)) {
        stats = null;
        return;
      }
      onFlush({ ...stats });
      stats = null;
    },

    clear() {
      stats = null;
    },
  };
}
