import { isLockMapped } from "../core/domain.js";
import { MappingCompleteness } from "../analytics/values.js";
import * as view from "../view/index.js";
import { advanceMappedTracking } from "./mapped-transition.js";
import { trackLockBecameMappable } from "../analytics/index.js";
import { snapshotTumblerFocus, restoreTumblerFocus } from "../view/focus.js";

export function createAppRenderer({
  els,
  store,
  solve,
  onboarding,
  catalog,
  onRenderLocaleChrome,
  handlers,
  getWipeConfirmVisible,
  getShortcutsVisible,
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
    view.renderCatalogBadge(els.catalogBadge, state);
    view.renderCatalogOverlay(catalog?.getUiState?.() ?? { open: false }, handlers);
    view.renderShortcutsHint(els.shortcutsHint, handlers);
    // The tumbler rebuild blows away keyboard focus; save and reapply it so
    // arrow-key mapping survives the re-render.
    const tumblerFocus = snapshotTumblerFocus(els.tumblers);
    view.renderTumblers(els.tumblers, state, handlers, { pulse: solve.getTumblersPulse() });
    restoreTumblerFocus(els.tumblers, tumblerFocus);
    const completeness = solve.getMappingCompleteness();
    const solveEnabled = completeness !== MappingCompleteness.INSUFFICIENT;
    view.renderSolveButton(els.solveBtn, {
      mapped: solveEnabled,
      justEnabled: solve.getSolveReadyFlash(),
      solving: solve.getSolving(),
    });
    view.renderTutorOptInChip(els.tutorOptIn, { visible: onboarding.isChipVisible() }, handlers);
    view.renderWipeConfirmOverlay({ visible: getWipeConfirmVisible() }, handlers);
    view.renderShortcutsOverlay({ visible: getShortcutsVisible() }, handlers);
    solve.renderSolutionArea(state, handlers);
  }

  function renderTutorChip() {
    view.renderTutorOptInChip(els.tutorOptIn, { visible: onboarding.isChipVisible() }, handlers);
  }

  return { render, renderTutorChip };
}
