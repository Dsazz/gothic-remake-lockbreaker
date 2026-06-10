import { getLocale, setLocale, Locale, SUPPORTED_LOCALES, t } from "./i18n.js";

const FLAG_VIEWBOX = "0 0 60 40";

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

function mountLocaleSwitcher(container) {
  const group = document.createElement("div");
  group.className = "locale-switcher";
  group.setAttribute("role", "group");

  for (const locale of SUPPORTED_LOCALES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "locale-switcher-btn";
    btn.dataset.locale = locale;
    btn.append(flagSvg(locale));
    group.append(btn);
  }

  container.replaceChildren(group);

  container.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-locale]");
    if (!btn || !container.contains(btn)) return;
    void setLocale(btn.dataset.locale);
  });
}

function updateLocaleSwitcher(container) {
  const group = container.querySelector(".locale-switcher");
  if (!group) return;

  group.setAttribute("aria-label", t("locale.switcher"));
  const current = getLocale();

  for (const btn of group.querySelectorAll("[data-locale]")) {
    const locale = btn.dataset.locale;
    const active = locale === current;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-label", t(`locale.${locale}`));
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

export function renderLocaleSwitcher(container) {
  if (!container) return;
  if (!container.querySelector(".locale-switcher")) {
    mountLocaleSwitcher(container);
  }
  updateLocaleSwitcher(container);
}
