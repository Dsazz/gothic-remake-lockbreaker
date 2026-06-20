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
function neutralVisual() {
  return [
    bannerImg(NEUTRAL_BANNER),
    el("span", { class: "camp-hero", "aria-hidden": "true" }, [
      heroImg("camp-hero-img is-default", HERO_CALM),
      heroImg("camp-hero-img is-hover", HERO_SCREAM),
      el("span", { class: "camp-hero-tip", text: t("camp.heroTip"), "aria-hidden": "true" }),
    ]),
  ];
}

export function createCampSelector({ container, initialCamp, onSelect } = {}) {
  if (!container) return { destroy() {}, getCamp: () => null };

  let camp = isValidCamp(initialCamp) ? initialCamp : null;
  let popoverOpen = false;
  let popoverNode = null;

  const POPOVER_MARGIN = 8;

  const onOutsidePointer = (event) => {
    if (container.contains(event.target)) return;
    if (popoverNode?.contains(event.target)) return;
    closePopover();
  };

  const onKeydown = (event) => {
    if (event.key !== Key.ESCAPE) return;
    closePopover();
  };

  const onReposition = () => positionPopover();

  function syncTriggerExpanded() {
    const trigger = container.querySelector(".camp-trigger");
    trigger?.setAttribute("aria-expanded", popoverOpen ? "true" : "false");
  }

  // The header has `overflow: hidden`, so the popover lives on <body> and is
  // anchored to the trigger banner in viewport coordinates.
  function positionPopover() {
    if (!popoverNode) return;
    const trigger = container.querySelector(".camp-trigger");
    if (!trigger) return;
    const anchor = trigger.getBoundingClientRect();
    const pop = popoverNode.getBoundingClientRect();
    let top = anchor.bottom + POPOVER_MARGIN;
    if (top + pop.height + POPOVER_MARGIN > window.innerHeight) {
      const above = anchor.top - POPOVER_MARGIN - pop.height;
      if (above >= POPOVER_MARGIN) top = above;
    }
    const maxLeft = window.innerWidth - pop.width - POPOVER_MARGIN;
    const left = Math.min(Math.max(anchor.left, POPOVER_MARGIN), Math.max(POPOVER_MARGIN, maxLeft));
    popoverNode.style.top = `${Math.round(top)}px`;
    popoverNode.style.left = `${Math.round(left)}px`;
  }

  function openPopover() {
    if (popoverOpen) return;
    popoverOpen = true;
    popoverNode = renderPopover();
    document.body.append(popoverNode);
    positionPopover();
    document.addEventListener("pointerdown", onOutsidePointer);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onReposition, { passive: true });
    window.addEventListener("resize", onReposition);
    syncTriggerExpanded();
  }

  function closePopover() {
    if (!popoverOpen) return;
    popoverOpen = false;
    document.removeEventListener("pointerdown", onOutsidePointer);
    document.removeEventListener("keydown", onKeydown);
    window.removeEventListener("scroll", onReposition);
    window.removeEventListener("resize", onReposition);
    popoverNode?.remove();
    popoverNode = null;
    syncTriggerExpanded();
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
    closePopover();
    if (next === camp) return;
    apply(next);
    render();
  }

  function clearCamp() {
    closePopover();
    if (camp === null) return;
    apply(null);
    render();
  }

  function choiceButton(target, variant) {
    return el(
      "button",
      {
        type: "button",
        class: `camp-choice camp-choice--${variant}`,
        "aria-label": t("camp.apply", { name: campName(target) }),
        title: campName(target),
        onclick: () => selectCamp(target),
      },
      bannerImage(target),
    );
  }

  function renderPopover() {
    const choices = CAMP_ORDER.filter((target) => target !== camp);
    const children = choices.map((target) => choiceButton(target, "popover"));
    if (camp) {
      children.push(
        el("button", {
          type: "button",
          class: "camp-clear",
          text: t("camp.clear"),
          "aria-label": t("camp.clearLabel"),
          onclick: clearCamp,
        }),
      );
    }
    return el("div", { class: "camp-popover", role: "menu" }, children);
  }

  // A single trigger serves both states: the active camp's full-height banner,
  // or a faded placeholder pennant when neutral. Both open the picker popover.
  function renderTrigger() {
    const active = Boolean(camp);
    const label = active ? t("camp.current", { name: campName(camp) }) : t("camp.choose");
    const visual = active ? bannerImage(camp) : neutralVisual();
    const trigger = el(
      "button",
      {
        type: "button",
        class: `camp-trigger camp-trigger--${active ? SelectorState.ACTIVE : SelectorState.NEUTRAL}`,
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

  render();

  // Trigger labels, titles, and the neutral hero tip are localized; rebuild
  // them when the locale changes.
  const stopLocaleWatch = onLocaleChange(() => render());

  return {
    getCamp: () => camp,
    destroy() {
      stopLocaleWatch();
      closePopover();
      container.replaceChildren();
    },
  };
}
