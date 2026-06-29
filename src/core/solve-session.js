// Encapsulated walkthrough/solve session state. Pure state transitions only:
// no DOM, no analytics, no rerender — those side-effects stay in the controller.
// Methods are invoked as `session.method()`; never pass a method by reference
// (they rely on `this`).

// Fraction of the walkthrough a user must reach before the donation CTA is
// revealed. Most users never click `Next` to the final step, so gating on
// literal completion would near-zero impressions; 60% means "nearly done".
const GRATITUDE_REVEAL_FRACTION = 0.6;

// Step index at or beyond which the donation CTA reveals, for a walkthrough of
// `total` moves. Pure so it can be unit-tested alongside `buildWalkthrough`.
// Clamped to >= 1 so the CTA never reveals at step 0 even for a degenerate
// `total` of 0.
export function gratitudeRevealStep(total) {
  return Math.max(1, Math.ceil(total * GRATITUDE_REVEAL_FRACTION));
}

export class SolveSession {
  // Reset-clearable: solve result, walkthrough cursor/view, transient UI flags.
  #solution;
  #solveFailureReason;
  #solving;
  #stepIndex;
  #showAllSteps;
  #sequenceMinimized;
  #showMismatchTips;
  #blockedMessage;
  #gratitudeRevealed;
  #pendingSolveCoachmark;
  #pendingHashFailureCoachmark;
  // Persisted across reset(): banner visibility/tracking outlive a re-solve.
  #hashBannerVisible = false;
  #hashBannerTracked = false;

  constructor() {
    this.#resetClearableState();
  }

  get solution() {
    return this.#solution;
  }
  get solveFailureReason() {
    return this.#solveFailureReason;
  }
  get solving() {
    return this.#solving;
  }
  get stepIndex() {
    return this.#stepIndex;
  }
  get showAllSteps() {
    return this.#showAllSteps;
  }
  get sequenceMinimized() {
    return this.#sequenceMinimized;
  }
  get showMismatchTips() {
    return this.#showMismatchTips;
  }
  get blockedMessage() {
    return this.#blockedMessage;
  }
  get gratitudeRevealed() {
    return this.#gratitudeRevealed;
  }
  get hashBannerVisible() {
    return this.#hashBannerVisible;
  }
  get hashBannerTracked() {
    return this.#hashBannerTracked;
  }
  get pendingSolveCoachmark() {
    return this.#pendingSolveCoachmark;
  }
  get pendingHashFailureCoachmark() {
    return this.#pendingHashFailureCoachmark;
  }

  // A solve completed and produced no path (distinct from "not yet solved").
  get solveFailed() {
    return this.#solution === null && Boolean(this.#solveFailureReason);
  }

  // --- solve lifecycle ---

  beginSolve() {
    this.#solving = true;
    this.#solution = undefined;
    this.#solveFailureReason = undefined;
    this.#resetCursor();
  }

  // Applies a finished solve (success or failure). Caller decides the failure
  // reason (out-of-bounds vs no-path); the session stays agnostic of the enum.
  applySolution(solution, failureReason) {
    this.#solving = false;
    this.#solution = solution;
    this.#solveFailureReason = failureReason;
    this.#resetCursor();
  }

  // --- walkthrough navigation ---

  walk(delta) {
    this.#moveCursor(this.#stepIndex + delta);
  }

  jumpTo(index) {
    this.#moveCursor(index);
  }

  // Reconcile the cursor after a (possibly shorter) walkthrough rebuild.
  clampStepIndexTo(maxIndex) {
    this.#stepIndex = Math.max(0, Math.min(this.#stepIndex, maxIndex));
  }

  toggleSteps() {
    this.#showAllSteps = !this.#showAllSteps;
    return this.#showAllSteps;
  }

  minimizeSequence() {
    this.#sequenceMinimized = true;
    this.#showAllSteps = false;
  }

  expandSequence() {
    this.#sequenceMinimized = false;
  }

  toggleMismatchTips() {
    this.#showMismatchTips = !this.#showMismatchTips;
  }

  // Sticky once revealed: stepping back never re-hides the donation CTA.
  applyGratitudeReveal() {
    const total = this.#solution?.length ?? 0;
    if (total > 0 && this.#stepIndex >= gratitudeRevealStep(total)) {
      this.#gratitudeRevealed = true;
    }
    return this.#gratitudeRevealed;
  }

  // --- transient UI flags ---

  setBlockedMessage(message) {
    this.#blockedMessage = message;
  }

  // Re-localize the blocked message in place, only when one is showing.
  refreshBlockedMessage(message) {
    if (this.#blockedMessage) this.#blockedMessage = message;
  }

  setHashBannerVisible(visible) {
    this.#hashBannerVisible = visible;
  }

  markHashBannerTracked() {
    this.#hashBannerTracked = true;
  }

  deferSolveCoachmark() {
    this.#pendingSolveCoachmark = true;
  }

  clearPendingSolveCoachmark() {
    this.#pendingSolveCoachmark = false;
  }

  deferHashFailureCoachmark() {
    this.#pendingHashFailureCoachmark = true;
  }

  clearPendingHashFailureCoachmark() {
    this.#pendingHashFailureCoachmark = false;
  }

  // --- resets ---

  // Drops the walkthrough view (cursor + minimize/mismatch) while keeping any
  // displayed solve result. Used after a lock edit that left a failure on screen.
  clearWalkthroughView() {
    this.#resetCursor();
    this.#sequenceMinimized = false;
    this.#showMismatchTips = false;
  }

  // Full reset of solve/walkthrough/coachmark state; hash-banner state survives.
  reset() {
    this.#resetClearableState();
  }

  // Clamp the cursor into [0, total]; moving off a step drops the mismatch tip,
  // and progress may reveal the (sticky) donation CTA.
  #moveCursor(target) {
    const total = this.#solution?.length ?? 0;
    const previous = this.#stepIndex;
    this.#stepIndex = Math.max(0, Math.min(target, total));
    if (this.#stepIndex !== previous) this.#showMismatchTips = false;
    this.applyGratitudeReveal();
  }

  #resetCursor() {
    this.#stepIndex = 0;
    this.#showAllSteps = false;
  }

  #resetClearableState() {
    this.#solution = undefined;
    this.#solveFailureReason = undefined;
    this.#solving = false;
    this.#blockedMessage = undefined;
    this.#gratitudeRevealed = false;
    this.#pendingSolveCoachmark = false;
    this.#pendingHashFailureCoachmark = false;
    this.clearWalkthroughView();
  }
}
