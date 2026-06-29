// Roving-focus DOM contract + focus preservation across the tumbler rebuild.
// `renderTumblers` does a full `replaceChildren`, so any keyboard focus inside a
// groove or coupling toolbar is destroyed on every state edit. We snapshot a
// stable descriptor before the rebuild and reapply it after, keying on plate +
// role (and reactor for chips) rather than element identity or list index --
// both survive a value change, a coupling cycle, or a chip appearing/vanishing.
//
// This module is the single source of truth for the roving contract: the
// selectors and `data-*` names the view writes (view/tumblers.js) and the
// keyboard controller reads (controllers/keyboard.js). Keep all three in sync by
// importing from here -- never re-declare these literals elsewhere.

// Snapshot descriptor kind: which roving surface held focus before the rebuild.
const FocusField = Object.freeze({ GROOVE: "groove", CHIP: "chip" });

export const RovingSelector = Object.freeze({
  GROOVE: '.plate-holes[role="radiogroup"]',
  TOOLBAR: '.link-chip-row[role="toolbar"]',
  ITEM: "[data-roving]",
  CHECKED: '[aria-checked="true"]',
});

export const RovingAttr = Object.freeze({
  PLATE: "data-plate",
  VALUE: "data-value",
  REACTOR: "data-reactor",
  ROVING: "data-roving",
});

// Accessors so dataset reads never re-introduce a bare contract string. The
// camelCase dataset keys derive from the `data-*` names above; centralizing them
// means a RovingAttr rename can't silently break the reads.
export const plateOf = (el) => Number(el.dataset.plate);
export const positionOf = (el) => Number(el.dataset.value);

// Move keyboard focus to `el` and make it the sole tab stop in its roving group
// (radiogroup or toolbar). Shared by the keyboard controller and focus restore.
export function focusRoving(el) {
  if (!el) return;
  const group = el.closest(`${RovingSelector.GROOVE}, ${RovingSelector.TOOLBAR}`);
  if (group) {
    for (const node of group.querySelectorAll(RovingSelector.ITEM)) node.tabIndex = -1;
  }
  el.tabIndex = 0;
  el.focus({ preventScroll: true });
}

export function snapshotTumblerFocus(container) {
  const active = document.activeElement;
  if (!container || !active || !container.contains(active)) return null;

  const groove = active.closest(RovingSelector.GROOVE);
  if (groove) return { field: FocusField.GROOVE, plate: groove.dataset.plate };

  const toolbar = active.closest(RovingSelector.TOOLBAR);
  if (toolbar) {
    return {
      field: FocusField.CHIP,
      plate: toolbar.dataset.plate,
      reactor: active.closest(`[${RovingAttr.REACTOR}]`)?.dataset.reactor ?? null,
    };
  }
  return null;
}

export function restoreTumblerFocus(container, snap) {
  if (!container || !snap) return;

  if (snap.field === FocusField.GROOVE) {
    const groove = container.querySelector(`${RovingSelector.GROOVE}[${RovingAttr.PLATE}="${snap.plate}"]`);
    if (!groove) return;
    focusRoving(groove.querySelector(RovingSelector.CHECKED) ?? groove.querySelector(RovingSelector.ITEM));
    return;
  }

  const toolbar = container.querySelector(`${RovingSelector.TOOLBAR}[${RovingAttr.PLATE}="${snap.plate}"]`);
  if (!toolbar) return;
  const byReactor =
    snap.reactor != null
      ? toolbar.querySelector(`${RovingSelector.ITEM}[${RovingAttr.REACTOR}="${snap.reactor}"]`)
      : null;
  focusRoving(byReactor ?? toolbar.querySelector(RovingSelector.ITEM));
}
