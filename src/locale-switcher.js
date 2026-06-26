import { getLocale, setLocale, Locale, SUPPORTED_LOCALES, t } from "./i18n.js";
import { Key } from "./keyboard-keys.js";

const FLAG_VIEWBOX = "0 0 60 40";
const LISTBOX_ID = "locale-listbox";

const switcherControllers = new WeakMap();

function flagSvg(locale) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", FLAG_VIEWBOX);
  svg.setAttribute("class", "locale-flag");
  svg.setAttribute("aria-hidden", "true");

  if (locale === Locale.EN) {
    svg.innerHTML = `
      <rect width="60" height="40" fill="#012169"/>
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" stroke-width="8"/>
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" stroke-width="4"/>
      <path d="M30 0 V40 M0 20 H60" stroke="#fff" stroke-width="12"/>
      <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" stroke-width="6"/>
    `;
    return svg;
  }

  if (locale === Locale.DE) {
    svg.innerHTML = `
      <rect width="60" height="13.33" y="0" fill="#000"/>
      <rect width="60" height="13.33" y="13.33" fill="#DD0000"/>
      <rect width="60" height="13.34" y="26.66" fill="#FFCE00"/>
    `;
    return svg;
  }

  if (locale === Locale.PL) {
    svg.innerHTML = `
      <rect width="60" height="40" fill="#fff"/>
      <rect width="60" height="20" fill="#DC143C"/>
    `;
    return svg;
  }

  if (locale === Locale.UKR) {
    svg.innerHTML = `
      <rect width="60" height="20" y="0" fill="#005BBB"/>
      <rect width="60" height="20" y="20" fill="#FFD500"/>
    `;
  }
  return svg;
}

function caretSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 12 12");
  svg.setAttribute("class", "locale-switcher-caret");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<path d="M2 4.5 L6 8.5 L10 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg;
}

function shortCode(locale) {
  return locale.toUpperCase();
}

function optionId(locale) {
  return `locale-opt-${locale}`;
}

function mountLocaleSwitcher(container) {
  switcherControllers.get(container)?.abort();
  const controller = new AbortController();
  switcherControllers.set(container, controller);
  const { signal } = controller;

  const group = document.createElement("div");
  group.className = "locale-switcher";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "locale-switcher-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", LISTBOX_ID);

  const triggerFlag = document.createElement("span");
  triggerFlag.className = "locale-switcher-trigger-flag";
  const triggerCode = document.createElement("span");
  triggerCode.className = "locale-switcher-code";
  trigger.append(triggerFlag, triggerCode, caretSvg());

  const listbox = document.createElement("ul");
  listbox.className = "locale-switcher-menu";
  listbox.id = LISTBOX_ID;
  listbox.setAttribute("role", "listbox");
  listbox.setAttribute("tabindex", "-1");
  listbox.hidden = true;

  for (const locale of SUPPORTED_LOCALES) {
    const option = document.createElement("li");
    option.className = "locale-switcher-option";
    option.id = optionId(locale);
    option.setAttribute("role", "option");
    option.dataset.locale = locale;

    const code = document.createElement("span");
    code.className = "locale-switcher-code";
    code.textContent = shortCode(locale);
    option.append(flagSvg(locale), code);
    listbox.append(option);
  }

  group.append(trigger, listbox);
  container.replaceChildren(group);

  let open = false;
  let activeIndex = 0;

  const options = () => Array.from(listbox.querySelectorAll("[role='option']"));

  function setActive(index) {
    const opts = options();
    activeIndex = Math.max(0, Math.min(index, opts.length - 1));
    const opt = opts[activeIndex];
    if (!opt) return;
    listbox.setAttribute("aria-activedescendant", opt.id);
    for (const o of opts) o.classList.toggle("is-highlighted", o === opt);
    opt.scrollIntoView({ block: "nearest" });
  }

  function positionMenu() {
    const rect = trigger.getBoundingClientRect();
    listbox.style.minWidth = `${Math.round(rect.width)}px`;
    listbox.style.top = `${Math.round(rect.bottom + 6)}px`;
    listbox.style.left = `${Math.round(rect.right - listbox.offsetWidth)}px`;
  }

  function openMenu() {
    if (open) return;
    open = true;
    // Portal out of `.app-head` (isolation: isolate) so the fixed menu's
    // z-index competes in the root stacking context, not the header's.
    document.body.appendChild(listbox);
    listbox.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    positionMenu();
    const current = getLocale();
    const idx = options().findIndex((o) => o.dataset.locale === current);
    setActive(idx < 0 ? 0 : idx);
    listbox.focus({ preventScroll: true });
  }

  function closeMenu({ focusTrigger = false } = {}) {
    if (!open) return;
    open = false;
    listbox.hidden = true;
    group.appendChild(listbox);
    trigger.setAttribute("aria-expanded", "false");
    listbox.removeAttribute("aria-activedescendant");
    for (const o of options()) o.classList.remove("is-highlighted");
    if (focusTrigger) trigger.focus();
  }

  function selectOption(option) {
    if (!option) return;
    closeMenu({ focusTrigger: true });
    void setLocale(option.dataset.locale);
  }

  trigger.addEventListener("click", () => {
    if (open) closeMenu({ focusTrigger: true });
    else openMenu();
  });

  trigger.addEventListener("keydown", (event) => {
    if ([Key.ARROW_DOWN, Key.ARROW_UP, Key.ENTER, Key.SPACE].includes(event.key)) {
      event.preventDefault();
      openMenu();
    }
  });

  listbox.addEventListener("click", (event) => {
    const option = event.target.closest("[role='option']");
    if (option) selectOption(option);
  });

  listbox.addEventListener("keydown", (event) => {
    switch (event.key) {
      case Key.ARROW_DOWN:
        event.preventDefault();
        setActive(activeIndex + 1);
        break;
      case Key.ARROW_UP:
        event.preventDefault();
        setActive(activeIndex - 1);
        break;
      case Key.HOME:
        event.preventDefault();
        setActive(0);
        break;
      case Key.END:
        event.preventDefault();
        setActive(options().length - 1);
        break;
      case Key.ENTER:
      case Key.SPACE:
        event.preventDefault();
        selectOption(options()[activeIndex]);
        break;
      case Key.ESCAPE:
        event.preventDefault();
        closeMenu({ focusTrigger: true });
        break;
      case Key.TAB:
        closeMenu({ focusTrigger: true });
        break;
      default:
        break;
    }
  });

  function isInsideSwitcher(target) {
    return group.contains(target) || listbox.contains(target);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (open && !isInsideSwitcher(event.target)) closeMenu();
    },
    { signal },
  );

  document.addEventListener(
    "focusin",
    (event) => {
      if (open && !isInsideSwitcher(event.target)) closeMenu();
    },
    { signal },
  );

  window.addEventListener("scroll", () => closeMenu(), { passive: true, signal });
  window.addEventListener("resize", () => closeMenu(), { signal });
}

function updateLocaleSwitcher(container) {
  const group = container.querySelector(".locale-switcher");
  if (!group) return;

  const current = getLocale();
  const trigger = group.querySelector(".locale-switcher-trigger");
  // The open menu portals out to <body>, so it is no longer a child of `group`.
  // Resolve it by its stable id to survive a re-render while the menu is open.
  const listbox = document.getElementById(LISTBOX_ID);
  if (!trigger || !listbox) return;

  trigger.querySelector(".locale-switcher-trigger-flag").replaceChildren(flagSvg(current));
  trigger.querySelector(".locale-switcher-code").textContent = shortCode(current);
  trigger.setAttribute("aria-label", `${t("locale.switcher")}: ${t(`locale.${current}`)}`);

  listbox.setAttribute("aria-label", t("locale.switcher"));

  for (const option of listbox.querySelectorAll("[role='option']")) {
    const locale = option.dataset.locale;
    const selected = locale === current;
    option.setAttribute("aria-selected", selected ? "true" : "false");
    option.setAttribute("aria-label", t(`locale.${locale}`));
  }
}

export function renderLocaleSwitcher(container) {
  if (!container) return;
  if (!container.querySelector(".locale-switcher")) {
    mountLocaleSwitcher(container);
  }
  updateLocaleSwitcher(container);
}
