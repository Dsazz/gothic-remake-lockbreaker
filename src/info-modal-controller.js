// Progressive enhancement: present the static <details> help sections as modal
// overlays so opening them does not push the page down or trigger pinned-header
// scrolling. Content stays in the DOM (SEO-safe); only presentation and the
// dismiss affordances (backdrop, Escape) are added on the client.

import { Key } from "./keyboard-keys.js";

const OPEN_BODY_CLASS = "info-modal-open";
const BACKDROP_CLASS = "info-modal-backdrop";
const PANEL_SELECTORS = ["#how-to-map", ".lockpicking-guide"];

export function wireInfoModals(doc = document) {
  const panels = PANEL_SELECTORS.map((selector) => doc.querySelector(selector)).filter(Boolean);
  if (panels.length === 0) return;

  let backdrop = null;
  let escapeListener = null;

  const openPanels = () => panels.filter((panel) => panel.open);

  function closeAll() {
    for (const panel of openPanels()) panel.open = false;
  }

  function ensureOverlayChrome() {
    if (!backdrop) {
      backdrop = doc.createElement("div");
      backdrop.className = BACKDROP_CLASS;
      backdrop.addEventListener("click", closeAll);
      doc.body.append(backdrop);
    }
    doc.body.classList.add(OPEN_BODY_CLASS);
    if (!escapeListener) {
      escapeListener = (event) => {
        if (event.key === Key.ESCAPE) closeAll();
      };
      doc.addEventListener("keydown", escapeListener);
    }
  }

  function teardownOverlayChrome() {
    doc.body.classList.remove(OPEN_BODY_CLASS);
    backdrop?.remove();
    backdrop = null;
    if (escapeListener) {
      doc.removeEventListener("keydown", escapeListener);
      escapeListener = null;
    }
  }

  function onToggle(panel) {
    if (panel.open) {
      for (const other of panels) {
        if (other !== panel) other.open = false;
      }
      ensureOverlayChrome();
      requestAnimationFrame(() => panel.querySelector("summary")?.focus());
      return;
    }
    if (openPanels().length === 0) teardownOverlayChrome();
  }

  for (const panel of panels) {
    panel.addEventListener("toggle", () => onToggle(panel));
  }
}
