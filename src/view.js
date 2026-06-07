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

function tumblerLabel(index) {
  return `T${index + 1}`;
}

// Danger of a pin by distance from the notch: at a wall (breaks the pick if
// pushed further) vs one nudge from a wall. Symmetric across both walls.
function dangerClass(value) {
  const distance = Math.abs(value);
  if (distance >= EDGE) return "at-edge";
  if (distance === NEAR_EDGE) return "near-edge";
  return "";
}

// Tumblers render top-down highest-first to match the in-game stack layout.
function platesTopDown(plateCount) {
  return Array.from({ length: plateCount }, (_, i) => plateCount - 1 - i);
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
  container.replaceChildren(
    el("span", { class: "field-label", text: "Tumblers" }),
    el("div", { class: "pill-row" }, counts),
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

export function renderMatrix(container, state, handlers) {
  const { plateCount, matrix } = state;

  // Convention: a column is the tumbler you TURN; each marked cell down that
  // column is a tumbler (its row) that REACTS. Cells map to matrix[row][col],
  // matching domain's matrix[reactor][turned], so stored locks render unchanged.
  const header = el("div", { class: "matrix-row matrix-head" }, [
    el("div", { class: "matrix-corner", text: "Turn ▸" }),
    ...Array.from({ length: plateCount }, (_, turned) =>
      el("div", { class: "matrix-colhead", text: tumblerLabel(turned) }),
    ),
  ]);

  const rows = platesTopDown(plateCount).map((reactor) => {
    const cells = Array.from({ length: plateCount }, (_, turned) => {
      if (reactor === turned) {
        return el("div", { class: "cell cell-self", text: "•" });
      }
      const link = matrix[reactor][turned];
      return el("button", {
        class: `cell ${LINK_CLASS[link]}`,
        text: LINK_LABEL[link],
        onClick: () => handlers.onCycleCell(reactor, turned),
      });
    });
    return el("div", { class: "matrix-row" }, [
      el("div", { class: "matrix-rowhead", text: tumblerLabel(reactor) }),
      ...cells,
    ]);
  });

  container.style.setProperty("--cols", String(plateCount));
  container.replaceChildren(header, ...rows);
}

function positionRow(plate, value, handlers) {
  const buttons = [];
  for (let v = POS_MIN; v <= POS_MAX; v++) {
    buttons.push(
      el("button", {
        class: `pos ${v === value ? "is-active" : ""} ${v === CENTER ? "is-center" : ""}`,
        text: v > 0 ? `+${v}` : String(v),
        onClick: () => handlers.onSetPosition(plate, v),
      }),
    );
  }
  return el("div", { class: `pos-card ${dangerClass(value)}` }, [
    el("div", { class: "pos-title", text: `Tumbler ${plate + 1}` }),
    el("div", { class: "pos-row" }, buttons),
  ]);
}

function wallLegend() {
  return el("div", { class: "pos-legend" }, [
    el("span", { class: "pos-legend-wall", text: "-3 · wall" }),
    el("span", { class: "pos-legend-mid", text: "0 · notch" }),
    el("span", { class: "pos-legend-wall", text: "wall · +3" }),
  ]);
}

export function renderPositions(container, state, handlers) {
  const rows = platesTopDown(state.plateCount).map((plate) =>
    positionRow(plate, state.positions[plate], handlers),
  );
  container.replaceChildren(wallLegend(), ...rows);
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

  const steps = solution.map((move, i) =>
    el("li", { class: `step ${i === walkthrough.stepIndex ? "is-current" : ""}` }, [
      el("span", { class: "step-num", text: String(i + 1) }),
      el("span", {
        class: "step-text",
        text: `${tumblerLabel(move.plate)} — turn ${DIR_LABEL[move.dir]} ${DIR_ARROW[move.dir]}`,
      }),
    ]),
  );

  container.replaceChildren(
    el("p", {
      class: "success",
      text: `Clean path found — ${solution.length} turn${solution.length === 1 ? "" : "s"}, none against the frame.`,
    }),
    renderWalkthrough(walkthrough, handlers),
    el("ol", { class: "step-list" }, steps),
  );
}

function renderWalkthrough(walkthrough, handlers) {
  const { states, stepIndex, move } = walkthrough;
  const board = states[stepIndex];

  const pins = board.map((value, plate) => {
    const moving = move && move.plate === plate;
    return el(
      "div",
      { class: `wt-plate ${moving ? "is-moving" : ""} ${dangerClass(value)}` },
      [
        el("span", { class: "wt-label", text: tumblerLabel(plate) }),
        el("span", {
          class: `wt-value ${value === CENTER ? "is-center" : ""}`,
          text: value > 0 ? `+${value}` : String(value),
        }),
      ],
    );
  });

  const total = states.length - 1;
  const caption = move
    ? `Up next: ${tumblerLabel(move.plate)} turns ${DIR_LABEL[move.dir]} ${DIR_ARROW[move.dir]}`
    : "The lock gives — open.";

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, [
    el("div", { class: "wt-nav" }, [
      el("button", {
        class: "pill",
        text: "‹ Prev",
        disabled: stepIndex === 0 ? "" : null,
        onClick: () => handlers.onWalk(-1),
      }),
      el("span", { class: "wt-counter", text: `Turn ${stepIndex} / ${total}` }),
      el("button", {
        class: "pill",
        text: "Next ›",
        disabled: stepIndex === total ? "" : null,
        onClick: () => handlers.onWalk(1),
      }),
    ]),
    el("div", { class: "wt-board" }, pins),
    el("div", { class: "wt-caption", text: caption }),
  ]);
}
