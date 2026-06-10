import { masteryForId } from "./domain.js";
import { t } from "./i18n.js";
import { SolveSource } from "./analytics/values.js";
import {
  trackExampleLockLoaded,
  trackLockCleared,
  trackMasteryTierChanged,
} from "./analytics/index.js";

export function createLockController({ store, solve }) {
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
      if (!confirm(t("confirm.wipe"))) return;
      solve.invalidate();
      store.clearAll();
      solve.refreshHashBannerVisibility();
      trackLockCleared();
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

  return { handlers };
}
