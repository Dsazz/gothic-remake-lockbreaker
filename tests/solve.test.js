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
import { buildWalkthrough, solveSuccessText } from "../src/controllers/solve.js";
import { SolveSession, gratitudeRevealStep } from "../src/core/solve-session.js";

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

test("reset clears solve session state but preserves hash banner state", () => {
  const session = new SolveSession();
  session.setHashBannerVisible(true);
  session.markHashBannerTracked();
  session.applySolution(
    [
      { plate: 0, dir: 1 },
      { plate: 1, dir: 1 },
      { plate: 2, dir: 1 },
    ],
    "no_path",
  );
  session.jumpTo(3);
  session.toggleMismatchTips();
  session.minimizeSequence();
  session.toggleSteps(); // showAllSteps=true while still minimized
  session.setBlockedMessage("blocked");
  session.deferSolveCoachmark();
  session.deferHashFailureCoachmark();
  session.applyGratitudeReveal();

  // Sanity: state is dirty before the reset.
  assert.equal(session.gratitudeRevealed, true);
  assert.equal(session.sequenceMinimized, true);
  assert.equal(session.showAllSteps, true);

  session.reset();

  assert.equal(session.solution, undefined);
  assert.equal(session.solveFailureReason, undefined);
  assert.equal(session.solving, false);
  assert.equal(session.stepIndex, 0);
  assert.equal(session.showAllSteps, false);
  assert.equal(session.sequenceMinimized, false);
  assert.equal(session.blockedMessage, undefined);
  assert.equal(session.showMismatchTips, false);
  assert.equal(session.gratitudeRevealed, false);
  assert.equal(session.pendingSolveCoachmark, false);
  assert.equal(session.pendingHashFailureCoachmark, false);

  // Hash banner state outlives a reset.
  assert.equal(session.hashBannerVisible, true);
  assert.equal(session.hashBannerTracked, true);
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
  const session = new SolveSession();
  session.applySolution(
    Array.from({ length: 10 }, (_, i) => ({ plate: i, dir: 1 })),
    undefined,
  );

  // Below threshold (reveal step is 6): no reveal.
  session.jumpTo(5);
  assert.equal(session.applyGratitudeReveal(), false);
  assert.equal(session.gratitudeRevealed, false);

  // At threshold: reveals.
  session.jumpTo(6);
  assert.equal(session.applyGratitudeReveal(), true);
  assert.equal(session.gratitudeRevealed, true);

  // Sticky: stepping back keeps it revealed.
  session.jumpTo(0);
  assert.equal(session.applyGratitudeReveal(), true);
  assert.equal(session.gratitudeRevealed, true);
});

test("applyGratitudeReveal never reveals without a solution", () => {
  const session = new SolveSession();
  // No solution: the cursor can't advance, so the CTA stays hidden.
  assert.equal(session.applyGratitudeReveal(), false);
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
  const cursor = {
    solution: [
      { plate: 0, dir: 1 },
      { plate: 1, dir: 1 },
    ],
    stepIndex: 99,
    showAllSteps: true,
  };

  const state = sampleState();
  const built = buildWalkthrough(cursor, state, (s) =>
    effectiveMatrix(s.matrix, s.removedLinks),
  );

  assert.ok(built);
  assert.equal(built.clampedStepIndex, built.states.length - 1);
  assert.equal(built.stepIndex, built.states.length - 1);
  assert.equal(built.showAll, true);
});

test("buildWalkthrough returns null when solution is empty", () => {
  const cursor = { solution: [], stepIndex: 0, showAllSteps: false };
  const state = pristineState();

  assert.equal(
    buildWalkthrough(cursor, state, (s) => effectiveMatrix(s.matrix, s.removedLinks)),
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
