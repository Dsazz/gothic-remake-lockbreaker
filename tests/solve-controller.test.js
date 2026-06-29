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
} from "../src/core/domain.js";
import {
  applyGratitudeReveal,
  buildWalkthrough,
  createEmptySession,
  gratitudeRevealStep,
  resetSession,
  solveSuccessText,
} from "../src/controllers/solve-controller.js";

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
  session.showMismatchTips = true;
  session.gratitudeRevealed = true;
  session.pendingSolveCoachmark = true;
  session.pendingHashFailureCoachmark = true;

  let dismissed = false;
  resetSession(session, { dismissCoachmark: () => { dismissed = true; } });

  assert.equal(dismissed, true);
  assert.equal(session.solution, undefined);
  assert.equal(session.solveFailureReason, undefined);
  assert.equal(session.stepIndex, 0);
  assert.equal(session.showAllSteps, false);
  assert.equal(session.sequenceMinimized, false);
  assert.equal(session.blockedMessage, undefined);
  assert.equal(session.showMismatchTips, false);
  assert.equal(session.gratitudeRevealed, false);
  assert.equal(session.pendingSolveCoachmark, false);
  assert.equal(session.pendingHashFailureCoachmark, false);
});

test("gratitudeRevealStep reveals the donation CTA at ~60% of steps", () => {
  assert.equal(gratitudeRevealStep(37), 23);
  assert.equal(gratitudeRevealStep(10), 6);
  // Short solutions still require near-completion, never step 0.
  assert.equal(gratitudeRevealStep(3), 2);
  assert.equal(gratitudeRevealStep(1), 1);
  // Degenerate total clamps to 1 so the CTA never reveals at step 0.
  assert.equal(gratitudeRevealStep(0), 1);
});

test("applyGratitudeReveal flips only at/above the threshold and stays sticky", () => {
  const session = createEmptySession();
  session.solution = Array.from({ length: 10 }, (_, i) => ({ plate: i, dir: 1 }));

  // Below threshold (reveal step is 6): no reveal.
  session.stepIndex = 5;
  assert.equal(applyGratitudeReveal(session), false);
  assert.equal(session.gratitudeRevealed, false);

  // At threshold: reveals.
  session.stepIndex = 6;
  assert.equal(applyGratitudeReveal(session), true);
  assert.equal(session.gratitudeRevealed, true);

  // Sticky: stepping back keeps it revealed.
  session.stepIndex = 0;
  assert.equal(applyGratitudeReveal(session), true);
  assert.equal(session.gratitudeRevealed, true);
});

test("applyGratitudeReveal never reveals without a solution", () => {
  const session = createEmptySession();
  session.solution = undefined;
  session.stepIndex = 99;
  assert.equal(applyGratitudeReveal(session), false);
  assert.equal(session.gratitudeRevealed, false);
});

test("solveSuccessText distinguishes already-open from a turn count", () => {
  const alreadyOpen = solveSuccessText(0);
  const withTurns = solveSuccessText(3);
  assert.equal(typeof alreadyOpen, "string");
  assert.ok(alreadyOpen.length > 0);
  assert.ok(withTurns.length > 0);
  assert.notEqual(alreadyOpen, withTurns);
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
