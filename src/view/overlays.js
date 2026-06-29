// Body-level modal overlays: the walkthrough mismatch help sheet and the wipe-
// lock confirm dialog. Each owns a module-level Escape-key listener singleton
// with an explicit clear, so re-renders never stack listeners.

import { MASTERY } from "../core/domain.js";
import { t } from "../i18n/index.js";
import { Key } from "../keyboard-keys.js";
import { MOBILE_MEDIA } from "../breakpoints.js";
import { el } from "./dom.js";

function mismatchChecklist(state) {
  const items = [
    t("walkthrough.mismatch1"),
    t("walkthrough.mismatch2"),
    t("walkthrough.mismatch3"),
  ];
  if (state.masteryLevel === MASTERY.MASTER.id && state.breaksBudget > 0) {
    items.push(t("walkthrough.mismatch4"));
  }
  return el("ul", { class: "mismatch-checklist" }, items.map((text) => el("li", { text })));
}

const HELP_OVERLAY_ID = "wt-help-overlay";
let helpEscapeListener = null;

function clearHelpEscapeListener() {
  if (!helpEscapeListener) return;
  document.removeEventListener("keydown", helpEscapeListener);
  helpEscapeListener = null;
}

export function renderHelpOverlay({ visible, state }, handlers) {
  clearHelpEscapeListener();
  const existing = document.getElementById(HELP_OVERLAY_ID);

  if (!visible) {
    existing?.remove();
    document.body.classList.remove("wt-help-open");
    return;
  }

  const close = () => handlers.onStepMismatch();
  helpEscapeListener = (e) => {
    if (e.key === Key.ESCAPE) close();
  };
  document.addEventListener("keydown", helpEscapeListener);

  const isMobile = window.matchMedia(MOBILE_MEDIA).matches;
  const sheet = el(
    "div",
    {
      class: `wt-help-sheet${isMobile ? " wt-help-sheet--bottom" : ""}`,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "wt-help-sheet-title",
    },
    [
      el("div", { class: "wt-help-sheet-head" }, [
        el("h2", {
          id: "wt-help-sheet-title",
          class: "wt-help-sheet-title",
          text: t("walkthrough.helpTitle"),
        }),
        el("button", {
          class: "wt-help-sheet-close",
          type: "button",
          "aria-label": t("walkthrough.closeTips"),
          text: "×",
          onClick: close,
        }),
      ]),
      el("p", {
        class: "wt-help-lead",
        text: t("walkthrough.helpLead"),
      }),
      mismatchChecklist(state),
    ],
  );

  const host = el("div", { id: HELP_OVERLAY_ID, class: "wt-help-overlay" }, [
    el("button", {
      class: "wt-help-backdrop",
      type: "button",
      "aria-label": t("walkthrough.closeTips"),
      onClick: close,
    }),
    el(
      "div",
      { class: `wt-help-sheet-host${isMobile ? " wt-help-sheet-host--bottom" : ""}` },
      [sheet],
    ),
  ]);

  if (existing) existing.replaceWith(host);
  else document.body.append(host);
  document.body.classList.add("wt-help-open");
  requestAnimationFrame(() => {
    host.querySelector(".wt-help-sheet-close")?.focus();
  });
}

const WIPE_CONFIRM_OVERLAY_ID = "wipe-confirm-overlay";
let wipeConfirmEscapeListener = null;

function clearWipeConfirmEscapeListener() {
  if (!wipeConfirmEscapeListener) return;
  document.removeEventListener("keydown", wipeConfirmEscapeListener);
  wipeConfirmEscapeListener = null;
}

export function renderWipeConfirmOverlay({ visible }, handlers) {
  clearWipeConfirmEscapeListener();
  const existing = document.getElementById(WIPE_CONFIRM_OVERLAY_ID);

  if (!visible) {
    existing?.remove();
    document.body.classList.remove("wipe-confirm-open");
    return;
  }

  const close = () => handlers.onCancelWipe();
  wipeConfirmEscapeListener = (e) => {
    if (e.key === Key.ESCAPE) close();
  };
  document.addEventListener("keydown", wipeConfirmEscapeListener);

  const dialog = el(
    "div",
    {
      class: "confirm-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "wipe-confirm-title",
    },
    [
      el("h2", {
        id: "wipe-confirm-title",
        class: "confirm-dialog-title",
        text: t("controls.wipeLock"),
      }),
      el("p", {
        class: "confirm-dialog-body",
        text: t("confirm.wipe"),
      }),
      el("div", { class: "confirm-dialog-actions" }, [
        el("button", {
          class: "pill pill-ghost",
          type: "button",
          text: t("confirm.cancel"),
          onClick: close,
        }),
        el("button", {
          class: "pill pill-danger",
          type: "button",
          text: t("controls.wipeLock"),
          onClick: () => handlers.onConfirmWipe(),
        }),
      ]),
    ],
  );

  const host = el("div", { id: WIPE_CONFIRM_OVERLAY_ID, class: "confirm-overlay" }, [
    el("button", {
      class: "confirm-backdrop",
      type: "button",
      "aria-label": t("confirm.cancel"),
      onClick: close,
    }),
    el("div", { class: "confirm-dialog-host" }, [dialog]),
  ]);

  if (existing) existing.replaceWith(host);
  else document.body.append(host);
  document.body.classList.add("wipe-confirm-open");
  requestAnimationFrame(() => {
    host.querySelector(".pill-ghost")?.focus();
  });
}

// Keep Tab focus inside `container` (APG modal trap). Pure DOM, no state.
export function trapFocus(container, event) {
  if (event.key !== Key.TAB) return;
  const focusables = container.querySelectorAll(
    'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Each row pairs literal key-cap glyphs (not localized) with a localized
// description. A "+" token renders as a plain joiner (not a cap), so a combo
// like Ctrl+Enter reads differently from alternative keys (e.g. Enter / Space).
function keyCap(glyph) {
  if (glyph === "+") return el("span", { class: "shortcuts-plus", text: "+" });
  return el("kbd", { class: "kbd", text: glyph });
}

function shortcutRow(keys, description) {
  return el("div", { class: "shortcuts-row" }, [
    el("span", { class: "shortcuts-keys" }, keys.map(keyCap)),
    el("span", { class: "shortcuts-desc", text: description }),
  ]);
}

function shortcutGroup(heading, rows) {
  return el("div", { class: "shortcuts-group" }, [
    el("h3", { class: "shortcuts-group-title", text: heading }),
    ...rows,
  ]);
}

const SHORTCUTS_OVERLAY_ID = "shortcuts-overlay";
let shortcutsKeyListener = null;

function clearShortcutsKeyListener() {
  if (!shortcutsKeyListener) return;
  document.removeEventListener("keydown", shortcutsKeyListener);
  shortcutsKeyListener = null;
}

export function renderShortcutsOverlay({ visible }, handlers) {
  clearShortcutsKeyListener();
  const existing = document.getElementById(SHORTCUTS_OVERLAY_ID);

  if (!visible) {
    existing?.remove();
    document.body.classList.remove("shortcuts-modal-open");
    return;
  }

  const close = () => handlers.onCloseShortcuts();

  const dialog = el(
    "div",
    {
      class: "confirm-dialog shortcuts-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "shortcuts-title",
    },
    [
      el("button", {
        class: "shortcuts-close",
        type: "button",
        "aria-label": t("shortcuts.close"),
        text: "×",
        onClick: close,
      }),
      el("h2", {
        id: "shortcuts-title",
        class: "confirm-dialog-title shortcuts-title",
        text: t("shortcuts.title"),
      }),
      shortcutGroup(t("shortcuts.groupWalkthrough"), [
        shortcutRow(["←", "→"], t("shortcuts.walkStep")),
      ]),
      shortcutGroup(t("shortcuts.groupMapping"), [
        shortcutRow(["←", "→"], t("shortcuts.mapMove")),
        shortcutRow(["↑", "↓"], t("shortcuts.mapPlate")),
        shortcutRow(["1", "–", "7"], t("shortcuts.mapDigit")),
        shortcutRow(["Enter", "Space"], t("shortcuts.mapCycle")),
        shortcutRow(["Ctrl / ⌘", "+", "Enter"], t("shortcuts.solve")),
        shortcutRow(["Tab"], t("shortcuts.mapTab")),
        shortcutRow(["?"], t("shortcuts.openHelp")),
      ]),
    ],
  );

  shortcutsKeyListener = (e) => {
    if (e.key === Key.ESCAPE) {
      close();
      return;
    }
    trapFocus(dialog, e);
  };
  document.addEventListener("keydown", shortcutsKeyListener);

  const host = el("div", { id: SHORTCUTS_OVERLAY_ID, class: "confirm-overlay shortcuts-overlay" }, [
    el("button", {
      class: "confirm-backdrop",
      type: "button",
      "aria-label": t("shortcuts.close"),
      onClick: close,
    }),
    el("div", { class: "confirm-dialog-host" }, [dialog]),
  ]);

  if (existing) existing.replaceWith(host);
  else document.body.append(host);
  document.body.classList.add("shortcuts-modal-open");
  requestAnimationFrame(() => {
    host.querySelector(".shortcuts-close")?.focus();
  });
}
