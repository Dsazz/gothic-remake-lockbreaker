import { test } from "node:test";
import assert from "node:assert/strict";
import { createLockController } from "../src/controllers/lock.js";

function createStub({ onRerender = () => {} } = {}) {
  return createLockController({
    store: {
      clearAll() {},
      setPlateCount() {},
      cycleMatrixCell() {},
      setPosition() {},
      setMasteryLevel() {},
      adjustBreaksBudget() {},
      toggleLinkRemoved() {},
    },
    solve: {
      invalidate() {},
      invalidateOnLockEdit() {},
      refreshHashBannerVisibility() {},
    },
    onRerender,
  });
}

test("onClearAll opens wipe confirm and re-renders so the dialog mounts", () => {
  let renders = 0;
  const lock = createStub({
    onRerender() {
      renders += 1;
    },
  });

  assert.equal(lock.isWipeConfirmOpen(), false);
  lock.handlers.onClearAll();
  assert.equal(lock.isWipeConfirmOpen(), true);
  assert.equal(renders, 1, "must call onRerender or the confirm overlay never appears");
});
