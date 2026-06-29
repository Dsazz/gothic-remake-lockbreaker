// Solution + walkthrough surfaces: the step-by-step move guide, the minimized
// sticky panel, the sequence panel tools, and failure/empty states.
// State -> DOM only; handlers injected by the controller.

import { DIR, isInBounds } from "../core/domain.js";
import { GuideSource, SolveFailureReason } from "../analytics/values.js";
import { t } from "../i18n/index.js";
import { Key } from "../keyboard-keys.js";
import {
  el,
  iconBtn,
  arrowSvg,
  openLockSvg,
  navChevronSvg,
  toolIconSvg,
} from "./dom.js";
import { dirLabel, lockLabel, platesDisplayOrder } from "./labels.js";
import { holeGrooveReadout } from "./tumblers.js";
import { gratitudeDonateBtn } from "./chrome.js";

// size: "focus" | "list" | "min"
function renderMoveCmd(move, size = "focus") {
  const isRight = move.dir === DIR.LEFT;
  return el(
    "span",
    {
      class: `move-cmd move-cmd--${size}`,
      "aria-label": t("move.aria", {
        lock: move.plate + 1,
        dir: dirLabel(move.dir),
      }),
    },
    [
      el("span", { class: "move-lock", text: lockLabel(move.plate) }),
      el(
        "span",
        {
          class: `move-arrow move-arrow--${isRight ? "right" : "left"}`,
          "aria-hidden": "true",
        },
        [arrowSvg(isRight)],
      ),
    ],
  );
}

function stepCounter(stepIndex, total, done) {
  if (done) {
    return el("span", { class: "wt-counter is-done" }, [
      el("span", { class: "wt-counter-open", "aria-hidden": "true" }, [openLockSvg()]),
    ]);
  }
  return el("span", { class: "wt-counter" }, [
    el("span", { class: "wt-counter-current", text: String(stepIndex + 1) }),
    el("span", { class: "wt-counter-total", text: `/ ${total}` }),
  ]);
}

// Post-value donation CTA, rendered inline within the solution area so it can
// sit between the walkthrough nav and the "show all steps" toggle. Visibility
// is decided by the controller (`ui.gratitudeRevealed`).
function gratitudeCtas(handlers) {
  return el("div", { class: "sequence-ctas" }, [
    el("p", { class: "gratitude-donate-reason", text: t("solution.donateReason") }),
    gratitudeDonateBtn(() => handlers.onGratitudeDonateClick?.()),
  ]);
}

// solution: undefined (not run), [] (already solved), Move[] (steps), or null (no safe path)
export function renderSolution(container, solution, walkthrough, ui, handlers) {
  if (ui?.blockedMessage) {
    container.replaceChildren(
      el("p", { class: "alert", text: ui.blockedMessage }),
    );
    return;
  }

  if (solution === undefined) {
    const hint = ui?.lockReady ? t("solution.hintReady") : t("solution.hintMap");
    container.replaceChildren(el("p", { class: "hint", text: hint }));
    return;
  }

  if (solution === null) {
    const isOob = ui?.failureReason === SolveFailureReason.OOB_START;
    const message = isOob ? t("solution.oob") : t("solution.noPath");
    const children = [
      el("p", { class: "alert", text: message }),
      el("p", { class: "hint solution-failure-hint", text: t("walkthrough.somethingOff") }),
    ];
    if (!isOob) {
      children.push(
        el("p", { class: "hint", text: t("solution.noPathHint") }),
      );
    }
    children.push(
      el("div", { class: "solution-failure-actions" }, [
        el("button", {
          class: "pill pill-ghost solution-guide-btn",
          type: "button",
          text: t("solution.openGuide"),
          onClick: () => handlers.onOpenGuide?.(GuideSource.FAILURE_NO_PATH),
        }),
        el("button", {
          class: "pill solution-example-btn",
          type: "button",
          text: t("solution.loadExample"),
          onClick: () => handlers.onLoadExampleFromFailure?.(),
        }),
      ]),
    );
    container.replaceChildren(el("div", { class: "solution-failure" }, children));
    return;
  }

  if (solution.length === 0) {
    container.replaceChildren(
      el("p", { class: "success", text: t("solution.alreadyOpen") }),
    );
    return;
  }

  if (ui?.minimized) {
    const minChildren = [renderMinimizedSummary(walkthrough, handlers)];
    if (ui?.gratitudeRevealed) minChildren.push(gratitudeCtas(handlers));
    container.replaceChildren(...minChildren);
    return;
  }

  const { stepIndex, showAll } = walkthrough;
  const steps = solution.map((move, i) => {
    const status = i < stepIndex ? "is-done" : i === stepIndex ? "is-current" : "is-upcoming";
    const target = i < stepIndex ? i : i + 1;
    const jump = () => handlers.onJumpTo(target);
    return el(
      "li",
      {
        class: `step ${status}`,
        role: "button",
        tabindex: "0",
        onClick: jump,
        onKeydown: (e) => {
          if (e.key === Key.ENTER || e.key === Key.SPACE) {
            e.preventDefault();
            jump();
          }
        },
      },
      [
        el("span", { class: "step-num", text: status === "is-done" ? "✓" : String(i + 1) }),
        el("span", { class: "step-text" }, [renderMoveCmd(move, "list")]),
      ],
    );
  });

  const toggle = el("button", {
    class: "pill pill-ghost step-toggle",
    text: showAll ? t("solution.hideAll") : t("solution.showAll", { n: solution.length }),
    onClick: () => handlers.onToggleSteps(),
  });

  const children = [renderWalkthrough(walkthrough, ui.state, handlers, ui)];
  if (ui?.gratitudeRevealed) children.push(gratitudeCtas(handlers));
  children.push(toggle);
  if (showAll) children.push(el("ol", { class: "step-list" }, steps));

  container.replaceChildren(...children);
}

export function renderSequencePanel(panel, solution, ui, handlers) {
  if (!panel) return;
  const actions = panel.querySelector("#sequence-actions");
  const hasMoves = Array.isArray(solution) && solution.length > 0;
  const minimized = Boolean(ui?.minimized && hasMoves);
  panel.classList.toggle("is-minimized", minimized);
  panel.classList.toggle("has-solution", hasMoves);
  // On mobile the panel is a sticky bottom bar; keep it dormant until the user
  // has entered lock data. CSS hides `.is-unmapped` on mobile (onboarding aside).
  panel.classList.toggle("is-unmapped", !ui?.lockMapped);

  if (!actions) return;
  if (!hasMoves) {
    actions.replaceChildren();
    return;
  }

  const panelTool = minimized
    ? { label: t("sequence.expand"), kind: "expand", onClick: handlers.onExpandSequence }
    : { label: t("sequence.minimize"), kind: "minimize", onClick: handlers.onMinimizeSequence };

  actions.replaceChildren(
    iconBtn({
      label: panelTool.label,
      className: "icon-btn--tool",
      onClick: panelTool.onClick,
      svg: toolIconSvg(panelTool.kind),
    }),
    iconBtn({
      label: t("sequence.clear"),
      className: "icon-btn--tool",
      onClick: handlers.onClearSolution,
      svg: toolIconSvg("clear"),
    }),
  );
}

function renderMinimizedSummary(walkthrough, handlers) {
  const { states, stepIndex, move } = walkthrough;
  const total = states.length - 1;
  const counter = stepCounter(stepIndex, total, !move);

  const arrowColChildren = [el("span", { class: "sequence-min-step", text: counter })];

  if (move) {
    const isRight = move.dir === DIR.LEFT;
    arrowColChildren.push(
      el(
        "span",
        {
          class: `move-arrow move-arrow--${isRight ? "right" : "left"}`,
          "aria-hidden": "true",
        },
        [arrowSvg(isRight)],
      ),
    );
  } else {
    arrowColChildren.push(el("span", { class: "sequence-min-done", text: t("solution.lockOpen") }));
  }

  const coreChildren = [
    move ? el("span", { class: "move-lock", text: lockLabel(move.plate) }) : null,
    el("div", { class: "sequence-min-arrow-col" }, arrowColChildren),
  ];

  const coreProps = { class: "sequence-min-core" };
  if (move) {
    coreProps["aria-label"] = t("move.aria", {
      lock: move.plate + 1,
      dir: dirLabel(move.dir),
    });
  }

  const core = el("div", coreProps, coreChildren);

  const navChildren = [
    iconBtn({
      label: t("nav.back"),
      onClick: () => handlers.onWalk(-1),
      disabled: stepIndex === 0,
      svg: navChevronSvg("back"),
    }),
    core,
    iconBtn({
      label: move ? t("nav.next") : t("nav.done"),
      onClick: () => handlers.onWalk(1),
      disabled: stepIndex === total,
      svg: navChevronSvg("next"),
    }),
  ];

  return el("div", { class: "sequence-min" }, [
    el("div", { class: "sequence-min-nav" }, navChildren),
  ]);
}

function renderWalkthrough(walkthrough, _state, handlers, ui = {}) {
  const { states, stepIndex, move } = walkthrough;
  const board = states[stepIndex];

  const pins = platesDisplayOrder(board.length).map((plate) => {
    const value = board[plate];
    const moving = move && move.plate === plate;
    return el(
      "div",
      { class: `wt-plate${moving ? " is-current" : ""}` },
      [
        el("span", { class: "wt-label", text: lockLabel(plate) }),
        holeGrooveReadout(value, { moving }),
      ],
    );
  });

  const total = states.length - 1;
  const pct = total === 0 ? 100 : Math.round((stepIndex / total) * 100);
  const counter = stepCounter(stepIndex, total, !move);

  const helpTrigger = move
    ? el("button", {
        class: `wt-help-trigger${ui.showMismatchTips ? " is-open" : ""}`,
        type: "button",
        text: ui.showMismatchTips ? t("walkthrough.hideTips") : t("walkthrough.somethingOff"),
        "aria-label": ui.showMismatchTips
          ? t("walkthrough.hideTips")
          : t("walkthrough.somethingOff"),
        "aria-expanded": ui.showMismatchTips ? "true" : "false",
        onClick: handlers.onStepMismatch,
      })
    : null;

  const current = move
    ? el("div", { class: "wt-current" }, [renderMoveCmd(move, "focus")])
    : el("div", { class: "wt-current is-open" }, [
        el("span", { class: "wt-open-text", text: t("walkthrough.lockOpen") }),
      ]);

  const children = [
    el("div", { class: "wt-progress" }, [
      el("div", { class: "wt-progress-head" }, [counter]),
      el("div", { class: "wt-bar" }, [
        el("div", { class: "wt-bar-fill", style: `width:${pct}%` }),
      ]),
    ]),
    current,
    el("div", { class: "wt-board" }, pins),
  ];

  if (helpTrigger) {
    children.push(el("div", { class: "wt-help-row" }, [helpTrigger]));
  }

  children.push(
    el("div", { class: "wt-nav" }, [
      el("button", {
        class: "pill",
        text: t("nav.backChevron"),
        disabled: stepIndex === 0 ? "" : null,
        onClick: () => handlers.onWalk(-1),
      }),
      el("button", {
        class: "pill pill-primary",
        text: move ? t("nav.nextChevron") : t("nav.done"),
        disabled: stepIndex === total ? "" : null,
        onClick: () => handlers.onWalk(1),
      }),
    ]),
  );

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, children);
}
