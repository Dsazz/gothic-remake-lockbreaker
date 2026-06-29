// Inline banners and prompts: locale suggestion, tutor opt-in, translation-
// feedback toast, shared-hash notice, and the incomplete-mapping warning.
// State -> DOM only; handlers injected by the controller.

import { GITHUB_ISSUES_URL } from "./links.js";
import { t } from "../i18n/index.js";
import { localeSuggestPromptKey } from "../i18n/locale-suggest.js";
import { el, dismissCrossSvg, ackCheckSvg } from "./dom.js";

function bannerDismissButton(onClick) {
  return el(
    "button",
    {
      class: "icon-btn icon-btn--tool hash-banner-dismiss",
      type: "button",
      "aria-label": t("solution.dismiss"),
      onClick,
    },
    [dismissCrossSvg()],
  );
}

function i18nAckButton(onClick) {
  return el(
    "button",
    {
      class: "i18n-ack-btn",
      type: "button",
      "aria-label": t("i18nBanner.dismiss"),
      title: t("i18nBanner.dismiss"),
      onClick,
    },
    [ackCheckSvg()],
  );
}

export function renderLocaleSuggest(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible || !ui.suggestedLocale) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const promptKey = localeSuggestPromptKey(ui.suggestedLocale);
  const promptId = "locale-suggest-prompt";
  const prompt = promptKey ? t(promptKey) : "";
  const languageLabel = t(`locale.${ui.suggestedLocale}`);

  container.replaceChildren(
    el(
      "div",
      {
        class: "locale-suggest",
        role: "region",
        "aria-labelledby": promptId,
      },
      [
        el("p", { class: "locale-suggest-text", id: promptId, text: prompt }),
        el("div", { class: "locale-suggest-actions" }, [
          el("button", {
            class: "locale-suggest-primary",
            type: "button",
            text: languageLabel,
            onClick: () => handlers.onAcceptLocaleSuggest?.(),
          }),
          el("button", {
            class: "locale-suggest-secondary",
            type: "button",
            text: t("localeSuggest.english"),
            onClick: () => handlers.onDeclineLocaleSuggest?.({ explicit: true }),
          }),
        ]),
        el(
          "button",
          {
            class: "icon-btn icon-btn--tool locale-suggest-dismiss",
            type: "button",
            "aria-label": t("localeSuggest.dismiss"),
            onClick: () => handlers.onDeclineLocaleSuggest?.({ explicit: false }),
          },
          [dismissCrossSvg()],
        ),
      ],
    ),
  );
}

export function renderTutorOptInChip(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren(
    el("div", { class: "tutor-opt-in", role: "region", "aria-label": t("tutorOptIn.prompt") }, [
      el("p", { class: "tutor-opt-in-text", text: t("tutorOptIn.prompt") }),
      el("button", {
        class: "pill pill-primary tutor-opt-in-start",
        type: "button",
        text: t("tutorOptIn.start"),
        onClick: () => handlers.onTutorOptInStart?.(),
      }),
      el(
        "button",
        {
          class: "icon-btn icon-btn--tool tutor-opt-in-dismiss",
          type: "button",
          "aria-label": t("tutorOptIn.dismiss"),
          onClick: () => handlers.onTutorOptInDismiss?.(),
        },
        [dismissCrossSvg()],
      ),
    ]),
  );
}

export function renderI18nBanner(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const text = el("p", { class: "i18n-toast-text" });
  text.append(`${t("i18nBanner.text")} `);
  text.append(
    el("a", {
      class: "i18n-toast-link",
      href: GITHUB_ISSUES_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      text: t("i18nBanner.link"),
      onClick: () => handlers.onTranslationFeedbackClick?.(),
    }),
  );
  container.replaceChildren(
    el("div", { class: "i18n-toast", role: "status" }, [text, i18nAckButton(handlers.onDismissI18nBanner)]),
  );
}

export function renderHashBanner(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren(
    el("div", { class: "hash-banner" }, [
      el("p", { class: "hash-banner-text", text: t("solution.sharedBanner") }),
      bannerDismissButton(handlers.onDismissHashBanner),
    ]),
  );
}

export function renderMappingWarning(container, ui) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.replaceChildren(
    el("p", { class: "alert mapping-warning", text: t("solution.incompleteMapping") }),
  );
}
