// Tumbler cards: per-plate start-hole groove and turning-move couplings, plus
// the solve button. State -> DOM only; handlers injected by the controller.

import { LINK, MASTERY, countRemovedLinks, POS_MIN, POS_MAX } from "../core/domain.js";
import { t } from "../i18n.js";
import { el } from "./dom.js";
import {
  linkLabel,
  lockLabel,
  holeLabel,
  dangerClass,
  holeClassList,
  platesDisplayOrder,
} from "./labels.js";

const LINK_CLASS = { [LINK.NONE]: "link-none", [LINK.SAME]: "link-same", [LINK.OPP]: "link-opp" };

function linkChips(turned, state, handlers) {
  const { plateCount, matrix, removedLinks, masteryLevel, breaksBudget } = state;
  const masterGone = masteryLevel === MASTERY.MASTER.id && breaksBudget > 0;
  const removedCount = countRemovedLinks(removedLinks);
  const chips = [];

  for (let reactor = 0; reactor < plateCount; reactor++) {
    if (reactor === turned) continue;
    const link = matrix[reactor][turned];
    const removed = removedLinks[reactor][turned];
    const isUnset = link === LINK.NONE;
    const couplingChip = el("button", {
      class: ["link-chip", LINK_CLASS[link], removed ? "link-removed" : ""].filter(Boolean).join(" "),
      text: isUnset ? lockLabel(reactor) : `${lockLabel(reactor)} ${linkLabel(link)}`,
      type: "button",
      "aria-label": isUnset
        ? t("tumbler.couplingUnsetAria", { lock: lockLabel(reactor) })
        : t("tumbler.couplingAria", {
            lock: lockLabel(reactor),
            coupling: linkLabel(link),
          }),
      onClick: () => handlers.onCycleCell(reactor, turned),
    });

    if (!masterGone || link === LINK.NONE) {
      chips.push(couplingChip);
      continue;
    }

    const canMarkGone = removed || removedCount < breaksBudget;
    const goneBtn = el("button", {
      class: `link-gone-btn${removed ? " is-active" : ""}`,
      text: removed ? t("coupling.goneDone") : t("coupling.gone"),
      type: "button",
      "aria-label": removed
        ? t("tumbler.goneUndoAria", { lock: lockLabel(reactor) })
        : t("tumbler.goneAria", { lock: lockLabel(reactor) }),
      disabled: canMarkGone ? null : "",
      onClick: () => handlers.onToggleLinkRemoved(reactor, turned),
    });

    chips.push(el("div", { class: "link-chip-group" }, [couplingChip, goneBtn]));
  }
  return chips;
}

function holeGrooveElements(value, { interactive, plate, handlers, moving = false } = {}) {
  const holes = [];
  for (let v = POS_MIN; v <= POS_MAX; v++) {
    const hole = holeLabel(v);
    const className = holeClassList(v, value, { moving });
    if (interactive) {
      holes.push(
        el("button", {
          class: className,
          text: hole,
          "aria-label": t("tumbler.holeAria", { hole }),
          onClick: () => handlers.onSetPosition(plate, v),
        }),
      );
    } else {
      holes.push(
        el("span", {
          class: className,
          text: hole,
          "aria-hidden": "true",
        }),
      );
    }
  }
  return holes;
}

function positionGroove(plate, value, handlers) {
  return el(
    "div",
    { class: "plate-holes" },
    holeGrooveElements(value, { interactive: true, plate, handlers }),
  );
}

export function holeGrooveReadout(value, { moving = false } = {}) {
  return el(
    "div",
    { class: "plate-holes plate-holes--readout" },
    holeGrooveElements(value, { moving }),
  );
}

function tumblerCard(plate, state, handlers) {
  const value = state.positions[plate];
  return el("article", { class: `tumbler-card ${dangerClass(value)}` }, [
    el("header", { class: "tumbler-head" }, [
      el("h3", { class: "tumbler-title", text: t("tumbler.lock", { n: plate + 1 }) }),
      el("span", {
        class: "tumbler-sub",
        text:
          plate === 0
            ? t("tumbler.frontPlate")
            : plate === state.plateCount - 1
              ? t("tumbler.backPlate")
              : "",
      }),
    ]),
    el("div", { class: "tumbler-start" }, [
      el("span", { class: "tumbler-field-label", text: t("tumbler.startHole") }),
      el("div", { class: "tumbler-start-scale" }, [
        tumblerLegend(),
        positionGroove(plate, value, handlers),
      ]),
    ]),
    el("div", { class: "tumbler-links" }, [
      el("span", { class: "tumbler-field-label", text: t("tumbler.turningMoves") }),
      el("div", { class: "link-chip-row" }, linkChips(plate, state, handlers)),
    ]),
  ]);
}

// Per-card legend: labels sit on a 7-column grid matching `.plate-holes`, so
// "wall"/"notch"/"wall" land directly over holes 1, 4, and 7 on every card.
function tumblerLegend() {
  return el("div", { class: "tumbler-legend", "aria-hidden": "true" }, [
    el("span", { class: "tumbler-legend-wall tumbler-legend-wall--left", text: t("legend.wallLeft") }),
    el("span", { class: "tumbler-legend-notch", text: t("legend.notch") }),
    el("span", { class: "tumbler-legend-wall tumbler-legend-wall--right", text: t("legend.wallRight") }),
  ]);
}

export function renderTumblers(container, state, handlers, ui = {}) {
  const cards = platesDisplayOrder(state.plateCount).map((plate) =>
    tumblerCard(plate, state, handlers),
  );
  container.classList.toggle("is-pulse", Boolean(ui.pulse));
  container.replaceChildren(...cards);
}

export function renderSolveButton(button, { mapped, justEnabled, solving }) {
  if (!button) return;
  const isSolving = Boolean(solving);
  button.textContent = t("solve.cta");
  // While solving, the button is busy (not "disabled" semantically): keep it a
  // valid control for screen readers via aria-busy, and block re-entry.
  button.disabled = !mapped || isSolving;
  button.setAttribute("aria-disabled", mapped ? "false" : "true");
  button.setAttribute("aria-busy", isSolving ? "true" : "false");
  button.classList.toggle("is-disabled", !mapped);
  button.classList.toggle("is-solving", isSolving);
  button.classList.toggle("is-ready-flash", Boolean(justEnabled) && !isSolving);
}
