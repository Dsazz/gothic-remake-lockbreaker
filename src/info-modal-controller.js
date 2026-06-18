// Progressive enhancement: present the static <details> help sections as modal
// overlays so opening them does not push the page down or trigger pinned-header
// scrolling. Content stays in the DOM (SEO-safe); only presentation and the
// dismiss affordances (backdrop, Escape) are added on the client.
//
// Delegation note: the footer FAQ (.app-foot-faq) is re-rendered at runtime by
// renderFooter() on every locale render, so caching node references would lose
// the wiring. We listen for `toggle` in the capture phase on the document
// instead — `toggle` does not bubble, but capture reaches the document — and
// resolve panels from the DOM on demand. This covers all panels uniformly,
// including ones that are replaced after boot.

import { Key } from "./keyboard-keys.js";

const OPEN_BODY_CLASS = "info-modal-open";
const BACKDROP_CLASS = "info-modal-backdrop";
const PANEL_SELECTOR = "#how-to-map, .lockpicking-guide, .app-foot-faq";
const CLOSE_SELECTOR = ".info-modal-close";

export function wireInfoModals(doc = document) {
  let backdrop = null;
  let escapeListener = null;

  const allPanels = () => Array.from(doc.querySelectorAll(PANEL_SELECTOR));
  const openPanels = () => allPanels().filter((panel) => panel.open);

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
      for (const other of openPanels()) {
        if (other !== panel) other.open = false;
      }
      ensureOverlayChrome();
      requestAnimationFrame(() => panel.querySelector(CLOSE_SELECTOR)?.focus());
      return;
    }
    if (openPanels().length === 0) teardownOverlayChrome();
  }

  doc.addEventListener(
    "toggle",
    (event) => {
      const panel = event.target;
      if (panel instanceof Element && panel.matches(PANEL_SELECTOR)) onToggle(panel);
    },
    true,
  );

  doc.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(CLOSE_SELECTOR)) closeAll();
  });
}
