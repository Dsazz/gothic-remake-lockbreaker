// Camp theme switcher: a cosmetic banner picker that swaps the site's accent
// palette via a `data-camp` attribute on <html>. Pure UI + persistence; no
// coupling to store, solver, or domain. Analytics is delivered via `onSelect`.

import { StorageKeys } from "./storage-keys.js";
import { CampId } from "./analytics/values.js";
import { Key } from "./keyboard-keys.js";
import { t, onLocaleChange } from "./i18n.js";

const CAMP_ORDER = [CampId.OLD, CampId.NEW, CampId.SWAMP];

const CAMP_META = {
  [CampId.OLD]: { image: "assets/banners/old-camp.webp" },
  [CampId.NEW]: { image: "assets/banners/new-camp.webp" },
  [CampId.SWAMP]: { image: "assets/banners/swamp-camp.webp" },
};

function campName(camp) {
  return t(`camp.names.${camp}`);
}

const NEUTRAL_BANNER = "assets/banners/neutral.webp";
const HERO_CALM = "assets/portrait-calm.png";
const HERO_SCREAM = "assets/portrait-scream.png";

const SelectorState = Object.freeze({
  NEUTRAL: "neutral",
  ACTIVE: "active",
});

function isValidCamp(value) {
  return CAMP_ORDER.includes(value);
}

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode); theme still applies for this session
  }
}

function clearStored(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function setRootCamp(camp) {
  const root = document.documentElement;
  if (camp) {
    root.dataset.camp = camp;
    return;
  }
  delete root.dataset.camp;
}

/** Applies the persisted camp to <html> as early as possible. Returns the
 *  active camp id, or null when neutral. Safe to call before first paint. */
export function initCampTheme() {
  const stored = readStored(StorageKeys.CAMP);
  const camp = isValidCamp(stored) ? stored : null;
  setRootCamp(camp);
  return camp;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

function bannerImg(src) {
  return el("img", {
    class: "camp-banner-img",
    src,
    alt: "",
    loading: "lazy",
    decoding: "async",
    draggable: "false",
  });
}

function bannerImage(camp) {
  return bannerImg(CAMP_META[camp].image);
}

function heroImg(className, src) {
  return el("img", {
    class: className,
    src,
    alt: "",
    "aria-hidden": "true",
    draggable: "false",
  });
}

// Neutral visual: the blank banner with the Nameless Hero face overlaid on its
// empty crest. Decorative only (pointer-events off) so clicks reach the trigger
// button and open the picker. The face + tip react to the trigger's hover.
// `tipText` lets the one-time hint swap the flavor line for an actionable CTA.
function neutralVisual(tipText) {
  return [
    bannerImg(NEUTRAL_BANNER),
    el("span", { class: "camp-hero", "aria-hidden": "true" }, [
      heroImg("camp-hero-img is-default", HERO_CALM),
      heroImg("camp-hero-img is-hover", HERO_SCREAM),
      el("span", { class: "camp-hero-tip", text: tipText, "aria-hidden": "true" }),
    ]),
  ];
}

export function createCampSelector({ container, initialCamp, onSelect } = {}) {
  if (!container) return { destroy() {}, getCamp: () => null };

  let camp = isValidCamp(initialCamp) ? initialCamp : null;
  let popoverOpen = false;
  let popoverNode = null;
  let backdropNode = null;
  let hinting = false;
  let hintTimer = null;
  let hintAbort = null;

  const POPOVER_MARGIN = 8;
  const HINT_TIMEOUT_MS = 7000;

  const onKeydown = (event) => {
    if (event.key !== Key.ESCAPE) return;
    closePopover();
  };

  const onReposition = () => positionPopover();

  function syncTriggerExpanded() {
    const trigger = container.querySelector(".camp-trigger");
    trigger?.setAttribute("aria-expanded", popoverOpen ? "true" : "false");
  }

  function focusTrigger() {
    container.querySelector(".camp-trigger")?.focus();
  }

  // The header has `overflow: hidden`, so the popover lives on <body> and is
  // positioned in viewport coordinates. It centers horizontally over the whole
  // header and drops just below it; on a short viewport it flips above.
  function positionPopover() {
    if (!popoverNode) return;
    const header = container.closest(".app-head") ?? container;
    const headerRect = header.getBoundingClientRect();
    const pop = popoverNode.getBoundingClientRect();
    let top = headerRect.bottom + POPOVER_MARGIN;
    if (top + pop.height + POPOVER_MARGIN > window.innerHeight) {
      const above = headerRect.top - POPOVER_MARGIN - pop.height;
      if (above >= POPOVER_MARGIN) top = above;
    }
    const centeredLeft = headerRect.left + (headerRect.width - pop.width) / 2;
    const maxLeft = window.innerWidth - pop.width - POPOVER_MARGIN;
    const left = Math.min(Math.max(centeredLeft, POPOVER_MARGIN), Math.max(POPOVER_MARGIN, maxLeft));
    popoverNode.style.top = `${Math.round(top)}px`;
    popoverNode.style.left = `${Math.round(left)}px`;
  }

  function openPopover() {
    if (popoverOpen) return;
    hideHint();
    popoverOpen = true;
    // Full-viewport scrim catches outside clicks (no separate pointer listener)
    // and covers the trigger, matching the app's other modal overlays.
    backdropNode = el("div", { class: "camp-backdrop", onclick: () => closePopover() });
    popoverNode = renderPopover();
    document.body.append(backdropNode, popoverNode);
    positionPopover();
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onReposition, { passive: true });
    window.addEventListener("resize", onReposition);
    syncTriggerExpanded();
    popoverNode.querySelector(".camp-choice")?.focus();
  }

  // restoreFocus is suppressed when the caller re-renders the trigger (a pick),
  // since that path focuses the freshly built trigger itself.
  function closePopover({ restoreFocus = true } = {}) {
    if (!popoverOpen) return;
    popoverOpen = false;
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("scroll", onReposition);
    window.removeEventListener("resize", onReposition);
    popoverNode?.remove();
    backdropNode?.remove();
    popoverNode = null;
    backdropNode = null;
    syncTriggerExpanded();
    if (restoreFocus) focusTrigger();
  }

  function togglePopover() {
    if (popoverOpen) closePopover();
    else openPopover();
  }

  function apply(next) {
    const previous = camp;
    camp = next;
    setRootCamp(camp);
    if (camp) writeStored(StorageKeys.CAMP, camp);
    else clearStored(StorageKeys.CAMP);
    onSelect?.({
      camp: camp ?? CampId.NONE,
      previousCamp: previous ?? CampId.NONE,
    });
  }

  function selectCamp(next) {
    closePopover({ restoreFocus: false });
    if (next !== camp) {
      apply(next);
      render();
    }
    focusTrigger();
  }

  function clearCamp() {
    closePopover({ restoreFocus: false });
    if (camp !== null) {
      apply(null);
      render();
    }
    focusTrigger();
  }

  // Visible caption under a banner. aria-hidden because the button's own
  // aria-label already names the action; this avoids a doubled announcement.
  function campLabel(text) {
    return el("span", { class: "camp-choice-label", text, "aria-hidden": "true" });
  }

  function choiceButton(target, variant) {
    return el(
      "button",
      {
        type: "button",
        class: `camp-choice camp-choice--${variant}`,
        "data-camp": target,
        "aria-label": t("camp.apply", { name: campName(target) }),
        onclick: () => selectCamp(target),
      },
      [bannerImage(target), campLabel(campName(target))],
    );
  }

  // The "leave the camps" option mirrors the camp tiles: the same blank pennant
  // the neutral trigger shows, rendered as a banner choice so the popover reads
  // as one coherent rack of banners instead of banners plus a stray text button.
  function neutralChoiceButton() {
    return el(
      "button",
      {
        type: "button",
        class: "camp-choice camp-choice--popover camp-choice--neutral",
        "aria-label": t("camp.clearLabel"),
        onclick: clearCamp,
      },
      [bannerImg(NEUTRAL_BANNER), campLabel(campName(CampId.NONE))],
    );
  }

  function renderPopover() {
    const choices = CAMP_ORDER.filter((target) => target !== camp);
    const children = choices.map((target) => choiceButton(target, "popover"));
    if (camp) children.push(neutralChoiceButton());
    return el(
      "div",
      {
        class: "camp-popover",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": t("camp.choose"),
      },
      children,
    );
  }

  // A single trigger serves both states: the active camp's full-height banner,
  // or a faded placeholder pennant when neutral. Both open the picker popover.
  function renderTrigger() {
    const active = Boolean(camp);
    const label = active ? t("camp.current", { name: campName(camp) }) : t("camp.choose");
    const showingHint = hinting && !active;
    const tipText = t(showingHint ? "camp.hintCta" : "camp.heroTip");
    const visual = active ? bannerImage(camp) : neutralVisual(tipText);
    const stateClass = `camp-trigger--${active ? SelectorState.ACTIVE : SelectorState.NEUTRAL}`;
    const trigger = el(
      "button",
      {
        type: "button",
        class: `camp-trigger ${stateClass}${showingHint ? " is-hinting" : ""}`,
        "aria-haspopup": "true",
        "aria-expanded": popoverOpen ? "true" : "false",
        "aria-label": label,
        title: active ? t("camp.changeTitle", { name: campName(camp) }) : t("camp.choose"),
        onclick: togglePopover,
      },
      visual,
    );
    container.append(trigger);
  }

  function render() {
    container.replaceChildren();
    container.dataset.state = camp ? SelectorState.ACTIVE : SelectorState.NEUTRAL;
    renderTrigger();
  }

  // Outside interaction ends the hint. Clicks/pointerdowns inside the selector
  // are left to the trigger's own click (openPopover) so re-rendering here can't
  // tear the button out from under the pending click.
  const onOutsidePointer = (event) => {
    if (container.contains(event.target)) return;
    hideHint();
  };

  // One-time, non-blocking nudge that the neutral banner is a clickable theme
  // switcher. Caller owns the "when" (gating) and the seen flag; this only owns
  // the visual + dismissal. No-op once a camp is picked.
  function showHint() {
    if (hinting || camp !== null) return;
    hinting = true;
    render();
    hintTimer = setTimeout(hideHint, HINT_TIMEOUT_MS);
    hintAbort = new AbortController();
    const { signal } = hintAbort;
    document.addEventListener("pointerdown", onOutsidePointer, { signal });
    window.addEventListener("scroll", hideHint, { passive: true, signal });
  }

  function hideHint() {
    if (!hinting) return;
    hinting = false;
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    hintAbort?.abort();
    hintAbort = null;
    render();
  }

  render();

  // Trigger labels, titles, and the neutral hero tip are localized; rebuild
  // them when the locale changes.
  const stopLocaleWatch = onLocaleChange(() => render());

  return {
    getCamp: () => camp,
    showHint,
    hideHint,
    destroy() {
      stopLocaleWatch();
      hideHint();
      closePopover();
      container.replaceChildren();
    },
  };
}
