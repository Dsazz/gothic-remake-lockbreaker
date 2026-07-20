// App chrome: header support entrypoints (portrait, sleeper, ore), the footer
// stack (support strip, press, FAQ, version), and shared support/donate
// building blocks. State -> DOM only; handlers injected by the controller.

import {
  CHANGELOG_URL,
  GITHUB_ISSUES_URL,
  LOCKS_INDEX_URL,
  PRESS_PCGAMES_URL,
  REDDIT_THREAD_URL,
  SUPPORT_URL,
} from "./links.js";
import { SupportSource } from "../analytics/values.js";
import { RELEASE_DATE } from "../version.js";
import { t } from "../i18n/index.js";
import { el, infoIconSvg, redditIconSvg } from "./dom.js";

function versionLink(version) {
  return el("a", {
    class: "app-version",
    href: CHANGELOG_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    text: `v${version}`,
  });
}

function pressLink(url, labelKey) {
  return el("a", {
    class: "app-foot-link",
    href: url,
    target: "_blank",
    rel: "noopener noreferrer",
    text: t(labelKey),
  });
}

function pressMentionsLine() {
  return el("p", { class: "app-foot-press" }, [
    el("span", { text: `${t("press.featured")} ` }),
    pressLink(PRESS_PCGAMES_URL, "press.pcgames"),
  ]);
}

const FOOTER_FAQ_KEYS = [
  ["footer.faq.q1", "footer.faq.a1"],
  ["footer.faq.q2", "footer.faq.a2"],
  ["footer.faq.q3", "footer.faq.a3"],
  ["footer.faq.q4", "footer.faq.a4"],
];

function footerActionLink(href, labelKey, { external = true, icon } = {}) {
  const children = icon ? [icon, el("span", { text: t(labelKey) })] : [el("span", { text: t(labelKey) })];
  return el("a", {
    class: "app-foot-action-link",
    href,
    ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  }, children);
}

// Stacked full-width rows (not a wrapping inline row): with three links of very
// different label lengths, flex-wrap centers each wrapped line independently,
// so a 2-then-1 wrap leaves the lone third link visually unaligned with the
// pair above it. Equal-width stacked rows keep every edge aligned regardless
// of label length or how many links this list grows to.
function footerActionLinks() {
  return el("nav", { class: "app-foot-actions" }, [
    footerActionLink(LOCKS_INDEX_URL, "footer.allLocks", { external: false }),
    footerActionLink(GITHUB_ISSUES_URL, "footer.issues"),
    footerActionLink(REDDIT_THREAD_URL, "footer.reddit", { icon: redditIconSvg() }),
  ]);
}

function infoModalHead(titleKey) {
  return el("div", { class: "info-modal-head" }, [
    el("span", { class: "info-modal-title", text: t(titleKey) }),
    el("button", {
      class: "info-modal-close",
      type: "button",
      "aria-label": t("common.close"),
      text: "×",
    }),
  ]);
}

function footerFaq() {
  return el("details", { class: "app-foot-faq" }, [
    el("summary", {}, [
      el("span", { class: "app-foot-faq-label" }, [
        el("span", { class: "app-foot-faq-icon", "aria-hidden": "true" }, [infoIconSvg()]),
        el("span", { text: t("footer.faqSummary") }),
      ]),
    ]),
    el("div", { class: "info-modal-panel" }, [
      infoModalHead("footer.faqSummary"),
      el("dl", { class: "app-foot-faq-list" }, FOOTER_FAQ_KEYS.flatMap(([qKey, aKey]) => [
        el("dt", { text: t(qKey) }),
        el("dd", { text: t(aKey) }),
      ])),
    ]),
  ]);
}

function footerUtility(version) {
  return el("a", {
    class: "app-foot-utility",
    href: CHANGELOG_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": t("footer.changelogAria", { version, date: RELEASE_DATE }),
  }, [
    el("span", { class: "app-foot-version", text: `v${version}`, "aria-hidden": "true" }),
    el("span", {
      class: "app-foot-updated",
      text: t("footer.updated", { date: RELEASE_DATE }),
      "aria-hidden": "true",
    }),
  ]);
}

function supportOreImg(className, size) {
  return el("img", {
    class: className,
    src: "/assets/ore.webp",
    alt: "",
    "aria-hidden": "true",
    width: String(size),
    height: String(size),
  });
}

function supportDonateLink({
  className = "support-cta",
  iconOnly = false,
  compact = false,
  labelKey = "support.cta",
  onClick,
}) {
  const oreSize = iconOnly ? 32 : 36;
  const children = [supportOreImg(iconOnly ? "sequence-min-ore-img support-ore" : "support-ore", oreSize)];
  if (!iconOnly) {
    const copyChildren = [el("span", { class: "support-cta-text", text: t(labelKey) })];
    if (!compact) {
      copyChildren.push(el("span", { class: "support-cta-sub", text: t("support.sub") }));
    }
    children.push(el("span", { class: "support-cta-copy" }, copyChildren));
  }
  return el("a", {
    class: className,
    href: SUPPORT_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    title: t("support.tooltip"),
    ...(iconOnly ? { "aria-label": t("support.aria") } : {}),
    onClick,
  }, children);
}

export function gratitudeDonateBtn(onClick) {
  return el("a", {
    class: "pill gratitude-donate-btn",
    href: SUPPORT_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    title: t("support.tooltip"),
    "aria-label": t("solution.donateBtn"),
    onClick,
  }, [
    supportOreImg("gratitude-donate-ore", 22),
    el("span", { class: "gratitude-btn-label", text: t("solution.donateBtn") }),
  ]);
}

const PORTRAIT_ICON_SIZE = 128;

function portraitImg(className, src) {
  return el("img", {
    class: className,
    src,
    alt: "",
    "aria-hidden": "true",
    width: String(PORTRAIT_ICON_SIZE),
    height: String(PORTRAIT_ICON_SIZE),
  });
}

function portraitIcon() {
  return el("span", { class: "app-head-portrait-icon" }, [
    portraitImg("app-head-portrait-img is-default", "/assets/portrait-calm.png"),
    portraitImg("app-head-portrait-img is-hover", "/assets/portrait-scream.png"),
  ]);
}

export function renderHeadPortrait(container, handlers) {
  if (!container) return;
  container.hidden = false;
  container.replaceChildren(
    el("a", {
      class: "app-head-portrait-link",
      href: SUPPORT_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": t("support.aria"),
      onClick: () => handlers.onSupportClick?.(SupportSource.HEADER_PORTRAIT),
    }, [
      portraitIcon(),
      el("span", { class: "app-head-portrait-tip", text: t("support.portraitTip"), "aria-hidden": "true" }),
    ]),
  );
}

const SLEEPER_ICON_SIZE = 128;

function sleeperSupportImg(className, src) {
  return el("img", {
    class: className,
    src,
    alt: "",
    "aria-hidden": "true",
    width: String(SLEEPER_ICON_SIZE),
    height: String(SLEEPER_ICON_SIZE),
  });
}

function sleeperSupportIcon() {
  return el("span", { class: "app-head-sleeper-icon" }, [
    sleeperSupportImg("app-head-sleeper-img is-sleep", "/assets/sleeper-sleep.webp"),
    sleeperSupportImg("app-head-sleeper-img is-awake", "/assets/sleeper-awake.webp"),
  ]);
}

function sleeperEmber() {
  return el("span", { class: "app-head-sleeper-ember-slot" }, [
    el("span", { class: "app-head-sleeper-ember" }),
  ]);
}

function sleeperEmbers() {
  return el("span", { class: "app-head-sleeper-embers", "aria-hidden": "true" }, [
    sleeperEmber(),
    sleeperEmber(),
    sleeperEmber(),
    sleeperEmber(),
    sleeperEmber(),
  ]);
}

function sleeperFigure() {
  return el("span", { class: "app-head-sleeper-figure" }, [
    sleeperEmbers(),
    sleeperSupportIcon(),
  ]);
}

export function renderHeadSleeper(container, handlers) {
  if (!container) return;
  container.hidden = false;
  container.replaceChildren(
    el("a", {
      class: "app-head-sleeper-link",
      href: SUPPORT_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": t("support.aria"),
      onClick: () => handlers.onSupportClick?.(SupportSource.HEADER_SLEEPER),
    }, [
      sleeperFigure(),
      el("span", { class: "app-head-sleeper-tip", text: t("support.sleeperTip"), "aria-hidden": "true" }),
    ]),
  );
}

export function renderHeadSupport(container, handlers) {
  if (!container) return;
  container.hidden = false;
  container.replaceChildren(
    el("a", {
      class: "app-head-support-link",
      href: SUPPORT_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      title: t("support.tooltip"),
      "aria-label": t("support.cta"),
      onClick: () => handlers.onSupportClick?.(SupportSource.HEADER_ORE),
    }, [
      supportOreImg("app-head-support-ore", 36),
      el("span", { class: "app-head-support-label", text: t("support.cta") }),
    ]),
  );
}

function supportStrip(handlers) {
  return el("div", { class: "support-strip" }, [
    supportDonateLink({
      onClick: () => handlers.onSupportClick?.(SupportSource.FOOTER_STRIP),
    }),
  ]);
}

export function renderVersionBadge(container, version) {
  container.replaceChildren(versionLink(version));
}

export function renderFooter(container, version, handlers) {
  container.replaceChildren(
    el("div", { class: "app-foot-stack" }, [
      el("div", { class: "app-foot-band" }, [
        supportStrip(handlers),
        pressMentionsLine(),
        footerFaq(),
        footerUtility(version),
        footerActionLinks(),
      ]),
    ]),
  );
}
