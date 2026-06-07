// View layer: pure `state -> DOM` rendering. No business logic, no storage,
// no solving. Event handlers are injected by the controller via `handlers`.

import {
  LINK,
  DIR,
  POS_MIN,
  POS_MAX,
  CENTER,
  MIN_PLATES,
  MAX_PLATES,
  isInBounds,
} from "./domain.js";

const LINK_LABEL = { [LINK.NONE]: "—", [LINK.SAME]: "Same", [LINK.OPP]: "Opp." };
const LINK_CLASS = { [LINK.NONE]: "link-none", [LINK.SAME]: "link-same", [LINK.OPP]: "link-opp" };
const DIR_LABEL = { [DIR.LEFT]: "Left", [DIR.RIGHT]: "Right" };
const DIR_ARROW = { [DIR.LEFT]: "←", [DIR.RIGHT]: "→" };

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

function plateLabel(index) {
  return `P${index + 1}`;
}

// Plates render top-down highest-first to match the in-game stack layout.
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
    el("span", { class: "field-label", text: "Plates" }),
    el("div", { class: "pill-row" }, counts),
    el("button", {
      class: "pill pill-ghost",
      text: "Reset positions",
      onClick: handlers.onResetPositions,
    }),
    el("button", {
      class: "pill pill-ghost",
      text: "Clear all",
      onClick: handlers.onClearAll,
    }),
  );
}

export function renderMatrix(container, state, handlers) {
  const { plateCount, matrix } = state;

  const header = el("div", { class: "matrix-row matrix-head" }, [
    el("div", { class: "matrix-corner", text: "Plate ↓" }),
    ...Array.from({ length: plateCount }, (_, j) =>
      el("div", { class: "matrix-colhead", text: plateLabel(j) }),
    ),
  ]);

  const rows = platesTopDown(plateCount).map((mover) => {
    const cells = Array.from({ length: plateCount }, (_, affected) => {
      if (mover === affected) {
        return el("div", { class: "cell cell-self", text: "Self" });
      }
      const link = matrix[mover][affected];
      return el("button", {
        class: `cell ${LINK_CLASS[link]}`,
        text: LINK_LABEL[link],
        onClick: () => handlers.onCycleCell(mover, affected),
      });
    });
    return el("div", { class: "matrix-row" }, [
      el("div", { class: "matrix-rowhead", text: plateLabel(mover) }),
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
  return el("div", { class: "pos-card" }, [
    el("div", { class: "pos-title", text: `Plate ${plate + 1}` }),
    el("div", { class: "pos-row" }, buttons),
  ]);
}

export function renderPositions(container, state, handlers) {
  const rows = platesTopDown(state.plateCount).map((plate) =>
    positionRow(plate, state.positions[plate], handlers),
  );
  container.replaceChildren(...rows);
}

// solution: undefined (not run), [] (already solved), Move[] (steps), or null (no safe path)
export function renderSolution(container, solution, walkthrough, handlers) {
  if (solution === undefined) {
    container.replaceChildren(
      el("p", { class: "hint", text: "Set your lock above, then press Solve." }),
    );
    return;
  }

  if (solution === null) {
    container.replaceChildren(
      el("p", {
        class: "alert",
        text: "No edge-safe solution from this position. Double-check the interactions and current pins.",
      }),
    );
    return;
  }

  if (solution.length === 0) {
    container.replaceChildren(
      el("p", { class: "success", text: "Already solved — every pin is centered." }),
    );
    return;
  }

  const steps = solution.map((move, i) =>
    el("li", { class: `step ${i === walkthrough.stepIndex ? "is-current" : ""}` }, [
      el("span", { class: "step-num", text: String(i + 1) }),
      el("span", {
        class: "step-text",
        text: `Plate ${move.plate + 1}: nudge ${DIR_LABEL[move.dir]} ${DIR_ARROW[move.dir]}`,
      }),
    ]),
  );

  container.replaceChildren(
    el("p", {
      class: "success",
      text: `Solved in ${solution.length} edge-safe move${solution.length === 1 ? "" : "s"}.`,
    }),
    renderWalkthrough(walkthrough, handlers),
    el("ol", { class: "step-list" }, steps),
  );
}

function renderWalkthrough(walkthrough, handlers) {
  const { states, stepIndex, move } = walkthrough;
  const board = states[stepIndex];

  const pins = board.map((value, plate) => {
    const atEdge = value === POS_MIN || value === POS_MAX;
    const moving = move && move.plate === plate;
    return el(
      "div",
      { class: `wt-plate ${moving ? "is-moving" : ""} ${atEdge ? "at-edge" : ""}` },
      [
        el("span", { class: "wt-label", text: `P${plate + 1}` }),
        el("span", {
          class: `wt-value ${value === CENTER ? "is-center" : ""}`,
          text: value > 0 ? `+${value}` : String(value),
        }),
      ],
    );
  });

  const total = states.length - 1;
  const caption = move
    ? `Next: Plate ${move.plate + 1} ${DIR_ARROW[move.dir]} ${DIR_LABEL[move.dir]}`
    : "Done — lock open.";

  return el("div", { class: "walkthrough", "data-inbounds": String(isInBounds(board)) }, [
    el("div", { class: "wt-nav" }, [
      el("button", {
        class: "pill",
        text: "‹ Prev",
        disabled: stepIndex === 0 ? "" : null,
        onClick: () => handlers.onWalk(-1),
      }),
      el("span", { class: "wt-counter", text: `Step ${stepIndex} / ${total}` }),
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
