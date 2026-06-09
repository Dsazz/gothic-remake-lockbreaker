// View layer: pure `state -> DOM` rendering. No business logic, no storage,
// no solving. Event handlers are injected by the controller via `handlers`.

import {
  LINK,
  DIR,
  POS_MIN,
  POS_MAX,
  CENTER,
  EDGE,
  NEAR_EDGE,
  MIN_PLATES,
  MAX_PLATES,
  MASTERY,
  masteryForId,
  countRemovedLinks,
  maxBreaksBudget,
  isInBounds,
  isPristineDefault,
} from "./domain.js";
import { CHANGELOG_URL } from "./version.js";

const LINK_LABEL = { [LINK.NONE]: "·", [LINK.SAME]: "With", [LINK.OPP]: "Against" };
const LINK_CLASS = { [LINK.NONE]: "link-none", [LINK.SAME]: "link-same", [LINK.OPP]: "link-opp" };
const MASTERY_TIERS = [MASTERY.UNTRAINED, MASTERY.TRAINED, MASTERY.MASTER];
// Game's horizontal axis is mirrored vs the solver's number line: increasing a
// pin's value (dir +1, toward +3) is a physical LEFT turn in-game, and vice versa.
const DIR_LABEL = { [DIR.LEFT]: "right", [DIR.RIGHT]: "left" };

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

function lockLabel(plate) {
  return `L${plate + 1}`;
}

const ARROW_PATH = {
  right: "M2 10 H11 V6 L22 12 L11 18 V14 H2 Z",
  left: "M22 10 H13 V6 L2 12 L13 18 V14 H22 Z",
};

function arrowSvg(isRight) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", isRight ? ARROW_PATH.right : ARROW_PATH.left);
  svg.append(path);
  return svg;
}

// size: "focus" | "list" | "min"
function renderMoveCmd(move, size = "focus") {
  const isRight = move.dir === DIR.LEFT;
  return el(
    "span",
    {
      class: `move-cmd move-cmd--${size}`,
      "aria-label": `Lock ${move.plate + 1}, turn ${DIR_LABEL[move.dir]}`,
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
  if (done) return `${total}/${total}`;
  return `${stepIndex + 1}/${total}`;
}

function iconBtn({ label, className = "", onClick, disabled, svg }) {
  return el(
    "button",
    {
      class: className ? `icon-btn ${className}` : "icon-btn",
      "aria-label": label,
      title: label,
      disabled: disabled ? "" : null,
      onClick,
    },
    [svg],
  );
}

function navChevronSvg(dir) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", dir === "back" ? "M14 6 L8 12 L14 18 Z" : "M10 6 L16 12 L10 18 Z");
  svg.append(path);
  return svg;
}

function toolIconSvg(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  if (kind === "expand") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 15l6-6 6 6");
    svg.append(path);
    return svg;
  }

  if (kind === "minimize") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M6 9l6 6 6-6");
    svg.append(path);
    return svg;
  }

  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute(
    "d",
    "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",
  );
  const base = document.createElementNS("http://www.w3.org/2000/svg", "path");
  base.setAttribute("d", "M22 21H7");
  svg.append(body, base);
  return svg;
}

function controlsIconSvg(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (kind === "link") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    );
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute(
      "d",
      "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    );
    svg.append(path, path2);
  } else {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    );
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", "10");
    line.setAttribute("y1", "11");
    line.setAttribute("x2", "10");
    line.setAttribute("y2", "17");
    const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "14");
    line2.setAttribute("y1", "11");
    line2.setAttribute("x2", "14");
    line2.setAttribute("y2", "17");
    svg.append(path, line, line2);
  }
  return svg;
}

function holeLabel(value) {
  return String(value + 4);
}

// Danger of a pin by distance from the notch: at a wall (breaks the pick if
// pushed further) vs one nudge from a wall. Symmetric across both walls.
function dangerClass(value) {
  const distance = Math.abs(value);
  if (distance >= EDGE) return "at-edge";
  if (distance === NEAR_EDGE) return "near-edge";
  return "";
}

// Locks N (back) through 1 (front), top to bottom — matches in-game view.
function platesDisplayOrder(plateCount) {
  return Array.from({ length: plateCount }, (_, i) => plateCount - 1 - i);
}

function masteryNoteText(state) {
  const tier = masteryForId(state.masteryLevel);
  const reset = tier.resetOnBreak ? "Lock resets on break." : "Progress kept on break.";
  let text = `${tier.mistakes} wall mistakes per pick. ${reset} Plate movement is unchanged by training.`;
  if (tier.id === MASTERY.MASTER.id) {
    text += " Each snapped pick removes one plate link.";
  }
  return text;
}

function breaksHintText(breaksBudget, removed) {
  if (breaksBudget <= 0) {
    return "Only if you've already snapped picks on this lock: raise the count — each break drops one coupling in-game.";
  }
  if (removed >= breaksBudget) {
    return "Removed links marked. Hit Break the Lock when your couplings and start holes are set.";
  }
  return `Tap Gone beside each coupling the game dropped (${removed} of ${breaksBudget}).`;
}

function renderMasterySelector(state, handlers) {
  const pills = MASTERY_TIERS.map((tier) =>
    el("button", {
      class: `pill ${tier.id === state.masteryLevel ? "is-active" : ""}`,
      text: tier.label,
      type: "button",
      onClick: () => handlers.onSetMasteryLevel(tier.id),
    }),
  );
  return el("div", { class: "mastery-block" }, [
    el("span", { class: "field-label", text: "Lockpicking tier" }),
    el("div", { class: "pill-row mastery-row" }, pills),
    el("p", { class: "mastery-note", text: masteryNoteText(state) }),
  ]);
}

function renderBreaksStepper(state, handlers) {
  if (state.masteryLevel !== MASTERY.MASTER.id) return null;
  const max = maxBreaksBudget(state.plateCount);
  const removed = countRemovedLinks(state.removedLinks);
  return el("div", { class: "breaks-stepper" }, [
    el("span", { class: "field-label", text: "Picks snapped on this lock" }),
    el("div", { class: "breaks-stepper-controls" }, [
      el("button", {
        class: "pill breaks-step",
        type: "button",
        text: "−",
        "aria-label": "Fewer broken picks",
        disabled: state.breaksBudget <= 0 ? "" : null,
        onClick: () => handlers.onAdjustBreaksBudget(-1),
      }),
      el("span", { class: "breaks-value", text: String(state.breaksBudget) }),
      el("button", {
        class: "pill breaks-step",
        type: "button",
        text: "+",
        "aria-label": "More broken picks",
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

function mismatchChecklist(state) {
  const items = [
    "Re-check With/Against on each coupling — links are directional (column of the turned lock).",
    "If a step moves the wrong way, try the opposite direction label (game mirror).",
    "Confirm each lock's start hole matches in-game.",
  ];
  if (state.masteryLevel === MASTERY.MASTER.id && state.breaksBudget > 0) {
    items.push(
      "Snapped picks? Set the count under Master, then tap Gone beside each dropped coupling.",
    );
  }
  return el("ul", { class: "mismatch-checklist" }, items.map((text) => el("li", { text })));
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
    el("span", { class: "field-label", text: "Locks" }),
    el("div", { class: "pill-row locks-row" }, counts),
  ]);
  const actionsBlock = el("div", { class: "controls-actions" }, [
    iconBtn({
      label: "Wipe lock",
      className: "icon-btn--tool",
      onClick: handlers.onClearAll,
      svg: controlsIconSvg("wipe"),
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

function linkChips(turned, state, handlers) {
  const { plateCount, matrix, removedLinks, masteryLevel, breaksBudget } = state;
  const masterGone = masteryLevel === MASTERY.MASTER.id && breaksBudget > 0;
  const removedCount = countRemovedLinks(removedLinks);
  const chips = [];

  for (let reactor = 0; reactor < plateCount; reactor++) {
    if (reactor === turned) continue;
    const link = matrix[reactor][turned];
    const removed = removedLinks[reactor][turned];
    const couplingChip = el("button", {
      class: ["link-chip", LINK_CLASS[link], removed ? "link-removed" : ""].filter(Boolean).join(" "),
      text: `${lockLabel(reactor)} ${LINK_LABEL[link]}`,
      type: "button",
      "aria-label": `${lockLabel(reactor)} ${LINK_LABEL[link]} coupling`,
      onClick: () => handlers.onCycleCell(reactor, turned),
    });

    if (!masterGone || link === LINK.NONE) {
      chips.push(couplingChip);
      continue;
    }

    const canMarkGone = removed || removedCount < breaksBudget;
    const goneBtn = el("button", {
      class: `link-gone-btn${removed ? " is-active" : ""}`,
      text: removed ? "Gone ✓" : "Gone",
      type: "button",
      "aria-label": removed
        ? `${lockLabel(reactor)} marked gone — tap to undo`
        : `Mark ${lockLabel(reactor)} coupling as gone`,
      disabled: canMarkGone ? null : "",
      onClick: () => handlers.onToggleLinkRemoved(reactor, turned),
    });

    chips.push(el("div", { class: "link-chip-group" }, [couplingChip, goneBtn]));
  }
  return chips;
}

function holeClassList(v, value, { moving = false } = {}) {
  const active = v === value;
  return [
    "hole",
    active ? "is-active" : "",
    v === CENTER ? "is-notch" : "",
    v === POS_MIN || v === POS_MAX ? "is-wall" : "",
    active ? dangerClass(value) : "",
    active && moving ? "is-moving" : "",
  ]
    .filter(Boolean)
    .join(" ");
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
          "aria-label": `Hole ${hole}`,
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

function holeGrooveReadout(value, { moving = false } = {}) {
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
      el("h3", { class: "tumbler-title", text: `Lock ${plate + 1}` }),
      el("span", {
        class: "tumbler-sub",
        text: plate === 0 ? "front plate" : plate === state.plateCount - 1 ? "back plate" : "",
      }),
    ]),
    el("div", { class: "tumbler-start" }, [
      el("span", { class: "tumbler-field-label", text: "Start hole" }),
      positionGroove(plate, value, handlers),
    ]),
    el("div", { class: "tumbler-links" }, [
      el("span", { class: "tumbler-field-label", text: "Turning this moves" }),
      el("div", { class: "link-chip-row" }, linkChips(plate, state, handlers)),
    ]),
  ]);
}

function holeLegend() {
  return el("div", { class: "hole-legend" }, [
    el("span", { class: "hole-legend-wall", text: "1 · wall" }),
    el("span", { class: "hole-legend-notch", text: "4 · notch" }),
    el("span", { class: "hole-legend-wall", text: "wall · 7" }),
  ]);
}

export function renderTumblers(container, state, handlers, ui = {}) {
  const cards = platesDisplayOrder(state.plateCount).map((plate) =>
    tumblerCard(plate, state, handlers),
  );
  container.classList.toggle("is-pulse", Boolean(ui.pulse));
  container.replaceChildren(holeLegend(), ...cards);
}

export function renderSolveButton(button, { mapped, justEnabled }) {
  if (!button) return;
  button.disabled = !mapped;
  button.setAttribute("aria-disabled", mapped ? "false" : "true");
  button.classList.toggle("is-disabled", !mapped);
  button.classList.toggle("is-ready-flash", Boolean(justEnabled));
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
      el("p", { class: "hash-banner-text", text: "Shared lock — sequence ready below." }),
      el("button", {
        class: "pill pill-ghost hash-banner-link",
        type: "button",
        text: "How to map your own lock",
        onClick: handlers.onOpenGuide,
      }),
      el("button", {
        class: "icon-btn icon-btn--tool hash-banner-dismiss",
        type: "button",
        "aria-label": "Dismiss",
        onClick: handlers.onDismissHashBanner,
        svg: (() => {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", "0 0 24 24");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", "M6 6 L18 18 M18 6 L6 18");
          path.setAttribute("stroke", "currentColor");
          path.setAttribute("stroke-width", "2");
          svg.append(path);
          return svg;
        })(),
      }),
    ]),
  );
}

export function renderSharePrompt(container, ui, handlers) {
  if (!container) return;
  if (!ui?.visible) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }
  const copied = Boolean(ui?.copyCopied);
  container.hidden = false;
  container.replaceChildren(
    el("div", { class: "share-prompt" }, [
      el("p", { class: "share-prompt-text", text: "Copy link to share this exact lock." }),
      el("button", {
        class: `pill pill-primary share-prompt-btn${copied ? " is-copied" : ""}`,
        type: "button",
        text: copied ? "Copied!" : "Share lock",
        "aria-label": copied ? "Copied!" : "Share lock",
        onClick: handlers.onSharePromptClick,
      }),
      el("button", {
        class: "pill pill-ghost share-prompt-dismiss",
        type: "button",
        text: "Dismiss",
        onClick: handlers.onDismissSharePrompt,
      }),
    ]),
  );
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
    const hint = ui?.lockReady
      ? "Lock mapped — crack it open."
      : "Set each lock's start hole and couplings above, then crack it open.";
    container.replaceChildren(el("p", { class: "hint", text: hint }));
    return;
  }

  if (solution === null) {
    container.replaceChildren(
      el("p", {
        class: "alert",
        text: "No clean path from here — some pin would hit the frame. Re-check the coupling and the starting pins.",
      }),
    );
    return;
  }

  if (solution.length === 0) {
    container.replaceChildren(
      el("p", { class: "success", text: "Nothing to do — every pin already rests in the notch." }),
    );
    return;
  }

  if (ui?.minimized) {
    container.replaceChildren(renderMinimizedSummary(walkthrough, handlers));
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
          if (e.key === "Enter" || e.key === " ") {
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
    text: showAll ? "Hide full list ▲" : `Show all ${solution.length} steps ▼`,
    onClick: () => handlers.onToggleSteps(),
  });

  const children = [
    el("p", {
      class: "success solution-count",
      text: `${solution.length} turn${solution.length === 1 ? "" : "s"}`,
    }),
    renderWalkthrough(walkthrough, ui.state, handlers, ui),
    toggle,
  ];
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
  panel.setAttribute("aria-expanded", String(!minimized));

  if (!actions) return;
  if (!hasMoves) {
    actions.replaceChildren();
    return;
  }

  const panelTool = minimized
    ? { label: "Expand", kind: "expand", onClick: handlers.onExpandSequence }
    : { label: "Minimize", kind: "minimize", onClick: handlers.onMinimizeSequence };

  actions.replaceChildren(
    iconBtn({
      label: panelTool.label,
      className: "icon-btn--tool",
      onClick: panelTool.onClick,
      svg: toolIconSvg(panelTool.kind),
    }),
    iconBtn({
      label: "Clear",
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
    arrowColChildren.push(el("span", { class: "sequence-min-done", text: "Lock open" }));
  }

  const coreChildren = [
    move ? el("span", { class: "move-lock", text: lockLabel(move.plate) }) : null,
    el("div", { class: "sequence-min-arrow-col" }, arrowColChildren),
  ];

  const coreProps = { class: "sequence-min-core" };
  if (move) {
    coreProps["aria-label"] = `Lock ${move.plate + 1}, turn ${DIR_LABEL[move.dir]}`;
  }

  const core = el("div", coreProps, coreChildren);

  return el("div", { class: "sequence-min" }, [
    el("div", { class: "sequence-min-nav" }, [
      iconBtn({
        label: "Back",
        onClick: () => handlers.onWalk(-1),
        disabled: stepIndex === 0,
        svg: navChevronSvg("back"),
      }),
      core,
      iconBtn({
        label: move ? "Next" : "Done",
        onClick: () => handlers.onWalk(1),
        disabled: stepIndex === total,
        svg: navChevronSvg("next"),
      }),
    ]),
  ]);
}

const HELP_OVERLAY_ID = "wt-help-overlay";
let helpEscapeListener = null;

function clearHelpEscapeListener() {
  if (!helpEscapeListener) return;
  document.removeEventListener("keydown", helpEscapeListener);
  helpEscapeListener = null;
}

export function renderHelpOverlay({ visible, state }, handlers) {
  clearHelpEscapeListener();
  const existing = document.getElementById(HELP_OVERLAY_ID);

  if (!visible) {
    existing?.remove();
    document.body.classList.remove("wt-help-open");
    return;
  }

  const close = () => handlers.onStepMismatch();
  helpEscapeListener = (e) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", helpEscapeListener);

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const sheet = el(
    "div",
    {
      class: `wt-help-sheet${isMobile ? " wt-help-sheet--bottom" : ""}`,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "wt-help-sheet-title",
    },
    [
      el("div", { class: "wt-help-sheet-head" }, [
        el("h2", {
          id: "wt-help-sheet-title",
          class: "wt-help-sheet-title",
          text: "Something off?",
        }),
        el("button", {
          class: "wt-help-sheet-close",
          type: "button",
          "aria-label": "Close tips",
          text: "×",
          onClick: close,
        }),
      ]),
      el("p", {
        class: "wt-help-lead",
        text: "Usually a mapping issue, not your tier.",
      }),
      mismatchChecklist(state),
    ],
  );

  const host = el("div", { id: HELP_OVERLAY_ID, class: "wt-help-overlay" }, [
    el("button", {
      class: "wt-help-backdrop",
      type: "button",
      "aria-label": "Close tips",
      onClick: close,
    }),
    el(
      "div",
      { class: `wt-help-sheet-host${isMobile ? " wt-help-sheet-host--bottom" : ""}` },
      [sheet],
    ),
  ]);

  if (existing) existing.replaceWith(host);
  else document.body.append(host);
  document.body.classList.add("wt-help-open");
  requestAnimationFrame(() => {
    host.querySelector(".wt-help-sheet-close")?.focus();
  });
}

function renderWalkthrough(walkthrough, state, handlers, ui = {}) {
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

  const progressHeadChildren = [el("span", { class: "wt-counter", text: counter })];
  if (move) {
    progressHeadChildren.push(
      el("button", {
        class: `wt-help-trigger${ui.showMismatchTips ? " is-open" : ""}`,
        type: "button",
        text: ui.showMismatchTips ? "Hide tips" : "Something off?",
        "aria-label": ui.showMismatchTips ? "Hide troubleshooting tips" : "Troubleshoot this step",
        "aria-expanded": ui.showMismatchTips ? "true" : "false",
        onClick: handlers.onStepMismatch,
      }),
    );
  }

  const current = move
    ? el("div", { class: "wt-current" }, [renderMoveCmd(move, "focus")])
    : el("div", { class: "wt-current is-open" }, [
        el("span", { class: "wt-open-text", text: "Lock open — every pin in the notch." }),
      ]);

  const children = [
    el("div", { class: "wt-progress" }, [
      el("div", { class: "wt-progress-head" }, progressHeadChildren),
      el("div", { class: "wt-bar" }, [
        el("div", { class: "wt-bar-fill", style: `width:${pct}%` }),
      ]),
    ]),
    current,
    el("div", { class: "wt-board" }, pins),
  ];

  children.push(
    el("div", { class: "wt-nav" }, [
      el("button", {
        class: "pill",
        text: "‹ Back",
        disabled: stepIndex === 0 ? "" : null,
        onClick: () => handlers.onWalk(-1),
      }),
      el("button", {
        class: "pill pill-primary",
        text: move ? "Next ›" : "Done",
        disabled: stepIndex === total ? "" : null,
        onClick: () => handlers.onWalk(1),
      }),
    ]),
  );

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, children);
}

function versionLink(version) {
  return el("a", {
    class: "app-version",
    href: CHANGELOG_URL,
    target: "_blank",
    rel: "noopener noreferrer",
    text: `v${version}`,
  });
}

export function renderVersionBadge(container, version) {
  container.replaceChildren(versionLink(version));
}

export function renderFooter(container, version) {
  container.replaceChildren(
    el("p", {
      class: "app-foot-note",
      text: "This lock travels in the page link and your browser, ready to revisit or hand off.",
    }),
    el("p", { class: "app-foot-meta" }, [versionLink(version)]),
  );
}
