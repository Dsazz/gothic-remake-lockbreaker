import { isLockMapped } from "./domain.js";
import * as view from "./view.js";
import { advanceMappedTracking } from "./mapped-transition.js";
import { trackLockBecameMappable } from "./analytics/index.js";

export function createAppRenderer({ els, store, solve, onRenderLocaleChrome, handlers }) {
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
    view.renderSolveButton(els.solveBtn, { mapped, justEnabled: solve.getSolveReadyFlash() });
    solve.renderSolutionArea(state, handlers);
  }

  return { render };
}
