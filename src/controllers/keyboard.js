// Global keyboard dispatch: walkthrough stepping, lock-mapping navigation, and
// the shortcuts modal. The single `document` keydown listener lives here; pure
// resolvers (key -> intent) are co-located and exported for tests. DOM focus is
// the mapping "cursor" (ARIA roving-tabindex), so there is no parallel state.

import { POS_MIN, POS_MAX, CENTER } from "../core/domain.js";
import { Key } from "../keyboard-keys.js";
import { ShortcutsSource, KeyboardSurface } from "../analytics/values.js";
import { trackShortcutsOpened, trackKeyboardNavUsed } from "../analytics/index.js";
import { RovingSelector, focusRoving, plateOf, positionOf } from "../view/focus.js";

// Resolved key intents. Producers (`resolve*`) emit one of these; consumers
// (`handle*`) branch on it. Exported so tests assert against the enum, not
// re-typed string literals.
export const KeyAction = Object.freeze({
  WALK: "walk",
  STEP: "step",
  PLATE: "plate",
  SET: "set",
  MOVE: "move",
});

// Holes are labelled `value + (1 - POS_MIN)` (see view/labels.js `holeLabel`),
// i.e. 1..7 for POS_MIN..POS_MAX. Invert that to map a digit key to a value.
const FIRST_HOLE = 1;
const LAST_HOLE = POS_MAX - POS_MIN + 1;

export function clampPosition(value) {
  return Math.max(POS_MIN, Math.min(POS_MAX, value));
}

export function digitToValue(hole) {
  return hole + POS_MIN - 1;
}

export function parseHoleDigit(key) {
  if (!/^[0-9]$/.test(key)) return null;
  const hole = Number(key);
  return hole >= FIRST_HOLE && hole <= LAST_HOLE ? hole : null;
}

export function isEditableTarget(el) {
  if (!el || typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}

export function resolveWalkKeyAction(key) {
  if (key === Key.ARROW_LEFT) return { type: KeyAction.WALK, delta: -1 };
  if (key === Key.ARROW_RIGHT) return { type: KeyAction.WALK, delta: 1 };
  return null;
}

// Ctrl/Cmd+Enter = "submit" (run the solver), the convention used by editors,
// chat composers, and form runners. Plain Enter stays free for native button
// activation (e.g. cycling a focused coupling chip).
export function isSolveShortcut(event) {
  return event.key === Key.ENTER && Boolean(event.metaKey || event.ctrlKey);
}

export function resolveGrooveKeyAction(key) {
  switch (key) {
    case Key.ARROW_LEFT:
      return { type: KeyAction.STEP, delta: -1 };
    case Key.ARROW_RIGHT:
      return { type: KeyAction.STEP, delta: 1 };
    case Key.ARROW_UP:
      return { type: KeyAction.PLATE, delta: -1 };
    case Key.ARROW_DOWN:
      return { type: KeyAction.PLATE, delta: 1 };
    default: {
      const hole = parseHoleDigit(key);
      return hole ? { type: KeyAction.SET, hole } : null;
    }
  }
}

export function resolveChipKeyAction(key) {
  switch (key) {
    case Key.ARROW_LEFT:
      return { type: KeyAction.MOVE, delta: -1 };
    case Key.ARROW_RIGHT:
      return { type: KeyAction.MOVE, delta: 1 };
    case Key.ARROW_UP:
      return { type: KeyAction.PLATE, delta: -1 };
    case Key.ARROW_DOWN:
      return { type: KeyAction.PLATE, delta: 1 };
    default:
      return null;
  }
}

export function createKeyboardController({ solve, getHandlers, els, onRerender, onShortcutsOpened }) {
  let shortcutsOpen = false;
  let preOpenFocus = null;
  let navUsed = false;

  function markNavUsed(surface) {
    if (navUsed) return;
    navUsed = true;
    trackKeyboardNavUsed({ surface });
  }

  function openShortcuts(source) {
    if (shortcutsOpen) return;
    preOpenFocus = document.activeElement;
    shortcutsOpen = true;
    trackShortcutsOpened({ source });
    // Opening the panel by any path (icon or `?`) counts as discovering the
    // feature, so retire its "NEW" badge.
    onShortcutsOpened?.();
    onRerender();
  }

  function closeShortcuts() {
    if (!shortcutsOpen) return;
    shortcutsOpen = false;
    onRerender();
    preOpenFocus?.focus?.();
    preOpenFocus = null;
  }

  function siblingGroup(current, selector, delta) {
    const groups = [...els.tumblers.querySelectorAll(selector)];
    const index = groups.indexOf(current);
    return groups[index + delta] ?? null;
  }

  function handleGroove(event, groove) {
    const action = resolveGrooveKeyAction(event.key);
    if (!action) return;
    event.preventDefault();
    const plate = plateOf(groove);
    const checked = groove.querySelector(RovingSelector.CHECKED);
    const current = checked ? positionOf(checked) : CENTER;

    if (action.type === KeyAction.STEP) {
      const next = clampPosition(current + action.delta);
      if (next !== current) getHandlers().onSetPosition(plate, next);
      markNavUsed(KeyboardSurface.MAPPING);
      return;
    }
    if (action.type === KeyAction.SET) {
      const value = digitToValue(action.hole);
      if (value !== current) getHandlers().onSetPosition(plate, value);
      markNavUsed(KeyboardSurface.MAPPING);
      return;
    }
    const target = siblingGroup(groove, RovingSelector.GROOVE, action.delta);
    if (!target) return;
    focusRoving(
      target.querySelector(RovingSelector.CHECKED) ?? target.querySelector(RovingSelector.ITEM),
    );
    markNavUsed(KeyboardSurface.MAPPING);
  }

  function handleChip(event, chipRow) {
    // Enter/Space resolve to null here so the focused chip's native click cycles.
    const action = resolveChipKeyAction(event.key);
    if (!action) return;
    event.preventDefault();

    if (action.type === KeyAction.MOVE) {
      const items = [...chipRow.querySelectorAll(RovingSelector.ITEM)];
      const target = items[items.indexOf(document.activeElement) + action.delta];
      if (!target) return;
      focusRoving(target);
      markNavUsed(KeyboardSurface.MAPPING);
      return;
    }
    const target = siblingGroup(chipRow, RovingSelector.TOOLBAR, action.delta);
    if (!target) return;
    focusRoving(target.querySelector(RovingSelector.ITEM));
    markNavUsed(KeyboardSurface.MAPPING);
  }

  function handle(event) {
    if (event.defaultPrevented) return;
    // While the modal is open it owns Escape + the Tab trap; suppress everything else.
    if (shortcutsOpen) return;

    const target = event.target;
    if (isSolveShortcut(event)) {
      // Gate on the button's own enabled state — the single source of truth for
      // "is the lock solvable right now" (disabled while unmapped or solving).
      if (isEditableTarget(target) || !els.solveBtn || els.solveBtn.disabled) return;
      event.preventDefault();
      solve.onSolve();
      return;
    }
    if (event.key === Key.QUESTION) {
      if (isEditableTarget(target)) return;
      event.preventDefault();
      openShortcuts(ShortcutsSource.KEY);
      return;
    }
    if (isEditableTarget(target)) return;

    const groove = target.closest?.(RovingSelector.GROOVE);
    if (groove) return handleGroove(event, groove);

    const chipRow = target.closest?.(RovingSelector.TOOLBAR);
    if (chipRow) return handleChip(event, chipRow);

    const action = resolveWalkKeyAction(event.key);
    if (!action || !solve.canWalk()) return;
    event.preventDefault();
    getHandlers().onWalk(action.delta);
    markNavUsed(KeyboardSurface.WALKTHROUGH);
  }

  return {
    handle,
    isShortcutsOpen: () => shortcutsOpen,
    openShortcuts,
    closeShortcuts,
  };
}
