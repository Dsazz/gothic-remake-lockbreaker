import { test } from "node:test";
import assert from "node:assert/strict";

import { createWalkthroughSummaryTracker } from "../src/walkthrough-summary.js";

test("walkthrough summary flushes aggregated navigation once", () => {
  const flushed = [];
  const tracker = createWalkthroughSummaryTracker({
    onFlush: (stats) => flushed.push(stats),
  });

  tracker.begin({ totalSteps: 5, plateCount: 6 });
  tracker.recordForward(1);
  tracker.recordForward(2);
  tracker.recordJump(4);
  tracker.recordExpandedAll();
  tracker.flush();

  assert.equal(flushed.length, 1);
  assert.deepEqual(flushed[0], {
    totalSteps: 5,
    plateCount: 6,
    stepsViewedMax: 5,
    forwardClicks: 2,
    backClicks: 0,
    jumpClicks: 1,
    expandedAll: true,
  });

  tracker.flush();
  assert.equal(flushed.length, 1);
});

test("walkthrough summary skips flush with no activity", () => {
  const flushed = [];
  const tracker = createWalkthroughSummaryTracker({
    onFlush: (stats) => flushed.push(stats),
  });

  tracker.begin({ totalSteps: 3, plateCount: 4 });
  tracker.flush();
  assert.equal(flushed.length, 0);
});
