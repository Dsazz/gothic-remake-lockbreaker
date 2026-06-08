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
  isInBounds,
} from "./domain.js";
import { CHANGELOG_URL } from "./version.js";

const LINK_LABEL = { [LINK.NONE]: "·", [LINK.SAME]: "With", [LINK.OPP]: "Against" };
const LINK_CLASS = { [LINK.NONE]: "link-none", [LINK.SAME]: "link-same", [LINK.OPP]: "link-opp" };
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
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  if (kind === "expand") {
    path.setAttribute("d", "M4 10 V4h6M14 4h6v6M10 20H4v-6M20 14v6h-6");
  } else if (kind === "minimize") {
    path.setAttribute("d", "M4 14h6v6M10 10h4M14 4h6v6M20 10v4h-6");
  } else {
    path.setAttribute("d", "M6 6l12 12M18 6L6 18");
  }
  svg.append(path);
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

// Locks 1 (front) through N (back), top to bottom.
function platesFrontFirst(plateCount) {
  return Array.from({ length: plateCount }, (_, i) => i);
}

export function renderControls(container, state, handlers, ui = {}) {
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
  container.replaceChildren(
    el("span", { class: "field-label", text: "Locks" }),
    el("div", { class: "pill-row" }, counts),
    el("button", {
      class: `pill pill-ghost ${ui.copyCopied ? "is-copied" : ""}`,
      text: ui.copyCopied ? "Copied!" : "Copy link",
      onClick: handlers.onCopyShareLink,
    }),
    el("button", {
      class: "pill pill-ghost",
      text: "Reset pins",
      onClick: handlers.onResetPositions,
    }),
    el("button", {
      class: "pill pill-ghost",
      text: "Wipe lock",
      onClick: handlers.onClearAll,
    }),
  );
}

function linkChips(turned, plateCount, matrix, handlers) {
  const chips = [];
  for (let reactor = 0; reactor < plateCount; reactor++) {
    if (reactor === turned) continue;
    const link = matrix[reactor][turned];
    chips.push(
      el("button", {
        class: `link-chip ${LINK_CLASS[link]}`,
        text: `${lockLabel(reactor)} ${LINK_LABEL[link]}`,
        onClick: () => handlers.onCycleCell(reactor, turned),
      }),
    );
  }
  return chips;
}

function positionGroove(plate, value, handlers) {
  const holes = [];
  for (let v = POS_MIN; v <= POS_MAX; v++) {
    const hole = holeLabel(v);
    holes.push(
      el("button", {
        class: `hole ${v === value ? "is-active" : ""} ${v === CENTER ? "is-notch" : ""} ${v === POS_MIN || v === POS_MAX ? "is-wall" : ""}`,
        text: hole,
        "aria-label": `Hole ${hole}`,
        onClick: () => handlers.onSetPosition(plate, v),
      }),
    );
  }
  return el("div", { class: "plate-holes" }, holes);
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
      el("div", { class: "link-chip-row" }, linkChips(plate, state.plateCount, state.matrix, handlers)),
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

export function renderTumblers(container, state, handlers) {
  const cards = platesFrontFirst(state.plateCount).map((plate) =>
    tumblerCard(plate, state, handlers),
  );
  container.replaceChildren(holeLegend(), ...cards);
}

// solution: undefined (not run), [] (already solved), Move[] (steps), or null (no safe path)
export function renderSolution(container, solution, walkthrough, ui, handlers) {
  if (solution === undefined) {
    container.replaceChildren(
      el("p", { class: "hint", text: "Map the lock above, then crack it open." }),
    );
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
    renderWalkthrough(walkthrough, handlers),
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

  return el("div", { class: "sequence-min" }, [
    el("span", { class: "sequence-min-step", text: counter }),
    el("div", { class: "sequence-min-nav" }, [
      iconBtn({
        label: "Back",
        onClick: () => handlers.onWalk(-1),
        disabled: stepIndex === 0,
        svg: navChevronSvg("back"),
      }),
      move
        ? renderMoveCmd(move, "min")
        : el("span", { class: "sequence-min-done", text: "Lock open" }),
      iconBtn({
        label: move ? "Next" : "Done",
        onClick: () => handlers.onWalk(1),
        disabled: stepIndex === total,
        svg: navChevronSvg("next"),
      }),
    ]),
  ]);
}

function renderWalkthrough(walkthrough, handlers) {
  const { states, stepIndex, move } = walkthrough;
  const board = states[stepIndex];

  const pins = platesFrontFirst(board.length).map((plate) => {
    const value = board[plate];
    const moving = move && move.plate === plate;
    return el(
      "div",
      { class: `wt-plate ${moving ? "is-moving" : ""} ${dangerClass(value)}` },
      [
        el("span", { class: "wt-label", text: lockLabel(plate) }),
        el("span", {
          class: `wt-value ${value === CENTER ? "is-center" : ""}`,
          text: holeLabel(value),
        }),
      ],
    );
  });

  const total = states.length - 1;
  const pct = total === 0 ? 100 : Math.round((stepIndex / total) * 100);
  const counter = stepCounter(stepIndex, total, !move);
  const current = move
    ? el("div", { class: "wt-current" }, [renderMoveCmd(move, "focus")])
    : el("div", {
        class: "wt-current is-open",
        text: "Lock open — every pin in the notch.",
      });

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, [
    el("div", { class: "wt-progress" }, [
      el("span", { class: "wt-counter", text: counter }),
      el("div", { class: "wt-bar" }, [
        el("div", { class: "wt-bar-fill", style: `width:${pct}%` }),
      ]),
    ]),
    current,
    el("div", { class: "wt-board" }, pins),
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
  ]);
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
