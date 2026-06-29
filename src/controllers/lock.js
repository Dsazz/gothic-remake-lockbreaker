import { SolveSource } from "../analytics/values.js";
import { trackExampleLockLoaded } from "../analytics/index.js";

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
    wipeConfirmOpen = false;
    onRerender();
  }

  function onLockEdit() {
    solve.invalidateOnLockEdit();
  }

  const handlers = {
    onSetPlateCount(n) {
      onLockEdit();
      store.setPlateCount(n);
    },
    onCycleCell(mover, affected) {
      onLockEdit();
      store.cycleMatrixCell(mover, affected);
    },
    onSetPosition(plate, value) {
      onLockEdit();
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
      onLockEdit();
      store.setMasteryLevel(level);
    },
    onAdjustBreaksBudget(delta) {
      onLockEdit();
      store.adjustBreaksBudget(delta);
    },
    onToggleLinkRemoved(reactor, turned) {
      onLockEdit();
      store.toggleLinkRemoved(reactor, turned);
    },
  };

  return {
    handlers,
    isWipeConfirmOpen: () => wipeConfirmOpen,
  };
}
