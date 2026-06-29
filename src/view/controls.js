// Controls surface: plate count, mastery tier, and breaks-budget steppers.
// State -> DOM only; handlers injected by the controller.

import {
  MASTERY,
  masteryForId,
  countRemovedLinks,
  maxBreaksBudget,
  MIN_PLATES,
  MAX_PLATES,
  isPristineDefault,
} from "../core/domain.js";
import { t } from "../i18n.js";
import { el } from "./dom.js";
import { masteryLabel } from "./labels.js";

const MASTERY_TIERS = [MASTERY.UNTRAINED, MASTERY.TRAINED, MASTERY.MASTER];

function masteryNoteItems(state) {
  const tier = masteryForId(state.masteryLevel);
  const items = [
    t("mastery.bulletMistakes", { n: tier.mistakes }),
    t("mastery.bulletReset", {
      value: tier.resetOnBreak ? t("mastery.yes") : t("mastery.no"),
    }),
    t("mastery.bulletPlateMovement"),
  ];
  if (tier.id === MASTERY.MASTER.id) {
    items.push(t("mastery.bulletLinkRemoval"));
  }
  return items;
}

function breaksHintText(breaksBudget, removed) {
  if (breaksBudget <= 0) return t("breaks.hintZero");
  if (removed >= breaksBudget) return t("breaks.hintDone");
  return t("breaks.hintProgress", { removed, total: breaksBudget });
}

function renderMasterySelector(state, handlers) {
  const pills = MASTERY_TIERS.map((tier) =>
    el("button", {
      class: `pill ${tier.id === state.masteryLevel ? "is-active" : ""}`,
      text: masteryLabel(tier),
      type: "button",
      onClick: () => handlers.onSetMasteryLevel(tier.id),
    }),
  );
  return el("div", { class: "mastery-block" }, [
    el("span", { class: "field-label", text: t("mastery.label") }),
    el("div", { class: "pill-row mastery-row" }, pills),
    el("ul", { class: "mastery-note" }, masteryNoteItems(state).map((text) => el("li", { text }))),
  ]);
}

function renderBreaksStepper(state, handlers) {
  if (state.masteryLevel !== MASTERY.MASTER.id) return null;
  const max = maxBreaksBudget(state.plateCount);
  const removed = countRemovedLinks(state.removedLinks);
  return el("div", { class: "breaks-stepper" }, [
    el("span", { class: "field-label", text: t("controls.breaksLabel") }),
    el("div", { class: "breaks-stepper-controls" }, [
      el("button", {
        class: "pill breaks-step",
        type: "button",
        text: "−",
        "aria-label": t("controls.breaksFewer"),
        disabled: state.breaksBudget <= 0 ? "" : null,
        onClick: () => handlers.onAdjustBreaksBudget(-1),
      }),
      el("span", { class: "breaks-value", text: String(state.breaksBudget) }),
      el("button", {
        class: "pill breaks-step",
        type: "button",
        text: "+",
        "aria-label": t("controls.breaksMore"),
        disabled: state.breaksBudget >= max ? "" : null,
        onClick: () => handlers.onAdjustBreaksBudget(1),
      }),
    ]),
    el("p", {
      class: "breaks-hint",
      text: breaksHintText(state.breaksBudget, removed),
    }),
  ]);
}

export function renderControls(container, state, handlers) {
  const counts = [];
  for (let n = MIN_PLATES; n <= MAX_PLATES; n++) {
    counts.push(
      el("button", {
        class: `pill ${n === state.plateCount ? "is-active" : ""}`,
        text: String(n),
        onClick: () => handlers.onSetPlateCount(n),
      }),
    );
  }
  const breaksStepper = renderBreaksStepper(state, handlers);
  const showLockActions = !isPristineDefault(state);
  const locksBlock = el("div", { class: "locks-block" }, [
    el("span", { class: "field-label", text: t("controls.locksLabel") }),
    el("div", { class: "pill-row locks-row" }, counts),
  ]);
  const actionsBlock = el("div", { class: "controls-actions" }, [
    el("button", {
      class: "pill pill-ghost controls-wipe-btn",
      type: "button",
      text: t("controls.wipeLock"),
      onClick: handlers.onClearAll,
    }),
  ]);
  container.replaceChildren(
    renderMasterySelector(state, handlers),
    ...(breaksStepper ? [breaksStepper] : []),
    el("div", { class: "controls-footer" }, [
      locksBlock,
      ...(showLockActions ? [actionsBlock] : []),
    ]),
  );
}
