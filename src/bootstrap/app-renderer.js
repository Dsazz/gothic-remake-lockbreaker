import { isLockMapped } from "./core/domain.js";
import { MappingCompleteness } from "./analytics/values.js";
import * as view from "./view.js";
import { advanceMappedTracking } from "./mapped-transition.js";
import { trackLockBecameMappable } from "./analytics/index.js";

export function createAppRenderer({
  els,
  store,
  solve,
  onboarding,
  onRenderLocaleChrome,
  handlers,
  getWipeConfirmVisible,
}) {
  let wasMapped = isLockMapped(store.getState());

  function render(state) {
    const mapped = isLockMapped(state);
    const transition = advanceMappedTracking(wasMapped, mapped);
    wasMapped = transition.wasMapped;

    if (transition.justBecameMapped) {
      trackLockBecameMappable({ plateCount: state.plateCount });
      solve.onMapped(state);
      onRenderLocaleChrome();
    }

    view.renderControls(els.controls, state, handlers);
    view.renderTumblers(els.tumblers, state, handlers, { pulse: solve.getTumblersPulse() });
    const completeness = solve.getMappingCompleteness();
    const solveEnabled = completeness !== MappingCompleteness.INSUFFICIENT;
    view.renderSolveButton(els.solveBtn, {
      mapped: solveEnabled,
      justEnabled: solve.getSolveReadyFlash(),
      solving: solve.getSolving(),
    });
    view.renderTutorOptInChip(els.tutorOptIn, { visible: onboarding.isChipVisible() }, handlers);
    view.renderWipeConfirmOverlay({ visible: getWipeConfirmVisible() }, handlers);
    solve.renderSolutionArea(state, handlers);
  }

  function renderTutorChip() {
    view.renderTutorOptInChip(els.tutorOptIn, { visible: onboarding.isChipVisible() }, handlers);
  }

  return { render, renderTutorChip };
}
