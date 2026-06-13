import { masteryForId } from "./domain.js";
import { SolveSource } from "./analytics/values.js";
import {
  trackExampleLockLoaded,
  trackLockCleared,
  trackMasteryTierChanged,
} from "./analytics/index.js";

export function createLockController({ store, solve, onRerender }) {
  let wipeConfirmOpen = false;

  function closeWipeConfirm() {
    if (!wipeConfirmOpen) return;
    wipeConfirmOpen = false;
    onRerender();
  }

  function performWipe() {
    solve.invalidate();
    store.clearAll();
    solve.refreshHashBannerVisibility();
    trackLockCleared();
    wipeConfirmOpen = false;
    onRerender();
  }

  const handlers = {
    onSetPlateCount(n) {
      solve.invalidate();
      store.setPlateCount(n);
    },
    onCycleCell(mover, affected) {
      solve.invalidate();
      store.cycleMatrixCell(mover, affected);
    },
    onSetPosition(plate, value) {
      solve.invalidate();
      store.setPosition(plate, value);
    },
    onClearAll() {
      wipeConfirmOpen = true;
      onRerender();
    },
    onConfirmWipe() {
      performWipe();
    },
    onCancelWipe() {
      closeWipeConfirm();
    },
    onLoadExampleLock(exampleState) {
      solve.invalidate();
      store.loadLock(exampleState);
      trackExampleLockLoaded({ plateCount: exampleState.plateCount });
      solve.onSolve({ auto: true, solveSource: SolveSource.EXAMPLE });
    },
    onSetMasteryLevel(level) {
      solve.invalidate();
      store.setMasteryLevel(level);
      trackMasteryTierChanged({ tier: masteryForId(level).key });
    },
    onAdjustBreaksBudget(delta) {
      solve.invalidate();
      store.adjustBreaksBudget(delta);
    },
    onToggleLinkRemoved(reactor, turned) {
      solve.invalidate();
      store.toggleLinkRemoved(reactor, turned);
    },
  };

  return {
    handlers,
    isWipeConfirmOpen: () => wipeConfirmOpen,
  };
}
