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
const DIR_ARROW = { [DIR.LEFT]: "→", [DIR.RIGHT]: "←" };

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
export function renderSolution(container, solution, walkthrough, handlers) {
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
        el("span", {
          class: "step-text",
          text: `${lockLabel(move.plate)} — turn ${DIR_LABEL[move.dir]} ${DIR_ARROW[move.dir]}`,
        }),
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
      class: "success",
      text: `Clean path found — ${solution.length} turn${solution.length === 1 ? "" : "s"}, none against the frame.`,
    }),
    renderWalkthrough(walkthrough, handlers),
    toggle,
  ];
  if (showAll) children.push(el("ol", { class: "step-list" }, steps));

  container.replaceChildren(...children);
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
  const counter = move ? `Step ${stepIndex + 1} of ${total}` : `${total} of ${total} done`;
  const headline = move
    ? `${lockLabel(move.plate)} — turn ${DIR_LABEL[move.dir]} ${DIR_ARROW[move.dir]}`
    : "Lock open — every pin in the notch.";

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, [
    el("div", { class: "wt-progress" }, [
      el("span", { class: "wt-counter", text: counter }),
      el("div", { class: "wt-bar" }, [
        el("div", { class: "wt-bar-fill", style: `width:${pct}%` }),
      ]),
    ]),
    el("div", { class: `wt-current ${move ? "" : "is-open"}`, text: headline }),
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
        text: move ? "Done — next ›" : "Done",
        disabled: stepIndex === total ? "" : null,
        onClick: () => handlers.onWalk(1),
      }),
    ]),
  ]);
}

export function renderFooter(container, version) {
  container.replaceChildren(
    el("p", {
      class: "app-foot-note",
      text: "This lock travels in the page link and your browser, ready to revisit or hand off.",
    }),
    el("p", { class: "app-foot-meta" }, [
      el("a", {
        class: "app-foot-version",
        href: CHANGELOG_URL,
        target: "_blank",
        rel: "noopener noreferrer",
        text: `v${version}`,
      }),
    ]),
  );
}
