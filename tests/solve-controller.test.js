import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MASTERY_ID,
  DEFAULT_PLATES,
  LINK,
  createMatrix,
  createPositions,
  createRemovedLinks,
  effectiveMatrix,
} from "../src/domain.js";
import {
  buildWalkthrough,
  createEmptySession,
  resetSession,
} from "../src/solve-controller.js";

function sampleState() {
  const plateCount = 4;
  const matrix = createMatrix(plateCount);
  matrix[1][0] = LINK.SAME;
  return {
    plateCount,
    matrix,
    positions: [1, 0, -1, 0],
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
  };
}

test("resetSession clears all solve session fields", () => {
  const session = createEmptySession();
  session.solution = [{ plate: 0, dir: 1 }];
  session.solveFailureReason = "no_path";
  session.stepIndex = 3;
  session.showAllSteps = true;
  session.sequenceMinimized = true;
  session.blockedMessage = "blocked";
  session.sequenceSupportTracked = true;
  session.showMismatchTips = true;
  session.pendingSolveCoachmark = true;
  session.pendingHashFailureCoachmark = true;
  session.showShareOffer = true;

  let dismissed = false;
  resetSession(session, { dismissCoachmark: () => { dismissed = true; } });

  assert.equal(dismissed, true);
  assert.equal(session.solution, undefined);
  assert.equal(session.solveFailureReason, undefined);
  assert.equal(session.stepIndex, 0);
  assert.equal(session.showAllSteps, false);
  assert.equal(session.sequenceMinimized, false);
  assert.equal(session.blockedMessage, undefined);
  assert.equal(session.sequenceSupportTracked, false);
  assert.equal(session.showMismatchTips, false);
  assert.equal(session.pendingSolveCoachmark, false);
  assert.equal(session.pendingHashFailureCoachmark, false);
  assert.equal(session.showShareOffer, false);
});

test("buildWalkthrough clamps step index to available states", () => {
  const session = createEmptySession();
  session.solution = [
    { plate: 0, dir: 1 },
    { plate: 1, dir: 1 },
  ];
  session.stepIndex = 99;
  session.showAllSteps = true;

  const state = sampleState();
  const built = buildWalkthrough(session, state, (s) =>
    effectiveMatrix(s.matrix, s.removedLinks),
  );

  assert.ok(built);
  assert.equal(built.clampedStepIndex, built.states.length - 1);
  assert.equal(built.stepIndex, built.states.length - 1);
  assert.equal(built.showAll, true);
});

test("buildWalkthrough returns null when solution is empty", () => {
  const session = createEmptySession();
  session.solution = [];
  const state = pristineState();

  assert.equal(
    buildWalkthrough(session, state, (s) => effectiveMatrix(s.matrix, s.removedLinks)),
    null,
  );
});

function pristineState() {
  const plateCount = DEFAULT_PLATES;
  return {
    plateCount,
    matrix: createMatrix(plateCount),
    positions: createPositions(plateCount),
    masteryLevel: DEFAULT_MASTERY_ID,
    breaksBudget: 0,
    removedLinks: createRemovedLinks(plateCount),
  };
}
