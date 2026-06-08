// Controller: the only module that knows about both the store and the
// solver/view. Wires DOM events to store mutations, runs the solver, and feeds
// results to the view. Data flow is one-way: event -> store -> re-render.

import { createStore } from "./store.js";
import { solve, statesAlong } from "./solver.js";
import { VERSION } from "./version.js";
import * as view from "./view.js";

const els = {
  controls: document.getElementById("controls"),
  tumblers: document.getElementById("tumblers"),
  sequencePanel: document.querySelector(".panel--sequence"),
  solution: document.getElementById("solution"),
  solveBtn: document.getElementById("solve-btn"),
  version: document.getElementById("app-version"),
  foot: document.getElementById("app-foot"),
  ariaLive: document.getElementById("aria-live"),
};

const store = createStore();

// Transient UI state — the solution is derived, not part of the lock definition.
let solution; // undefined | null | Move[]
let stepIndex = 0;
let showAllSteps = false;
let sequenceMinimized = false;
let copyCopied = false;
let copyTimer;

function buildWalkthrough(state) {
  if (!solution || solution.length === 0) return null;
  const states = statesAlong(state.positions, state.matrix, solution);
  const clamped = Math.min(stepIndex, states.length - 1);
  stepIndex = clamped;
  return { states, stepIndex: clamped, move: solution[clamped] ?? null, showAll: showAllSteps };
}

function renderSolutionArea(state) {
  const walkthrough = buildWalkthrough(state);
  const hasMoves = Array.isArray(solution) && solution.length > 0;
  const minimized = sequenceMinimized && hasMoves;
  view.renderSequencePanel(els.sequencePanel, solution, { minimized }, handlers);
  view.renderSolution(els.solution, solution, walkthrough, { minimized }, handlers);
}

function renderAll(state) {
  view.renderVersionBadge(els.version, VERSION);
  view.renderControls(els.controls, state, handlers, { copyCopied });
  view.renderTumblers(els.tumblers, state, handlers);
  renderSolutionArea(state);
  view.renderFooter(els.foot, VERSION);
}

function invalidateSolution() {
  solution = undefined;
  stepIndex = 0;
  showAllSteps = false;
  sequenceMinimized = false;
}

async function copyShareUrl(url) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }
  const area = document.createElement("textarea");
  area.value = url;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

function showCopyFeedback() {
  copyCopied = true;
  if (els.ariaLive) els.ariaLive.textContent = "Link copied to clipboard.";
  renderAll(store.getState());
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyCopied = false;
    if (els.ariaLive) els.ariaLive.textContent = "";
    renderAll(store.getState());
  }, 2000);
}

const handlers = {
  onSetPlateCount(n) {
    invalidateSolution();
    store.setPlateCount(n);
  },
  onCycleCell(mover, affected) {
    invalidateSolution();
    store.cycleMatrixCell(mover, affected);
  },
  onSetPosition(plate, value) {
    invalidateSolution();
    store.setPosition(plate, value);
  },
  onResetPositions() {
    invalidateSolution();
    store.resetPositions();
  },
  onClearAll() {
    invalidateSolution();
    store.clearAll();
  },
  async onCopyShareLink() {
    try {
      await copyShareUrl(location.href);
      showCopyFeedback();
    } catch {
      if (els.ariaLive) els.ariaLive.textContent = "Could not copy link.";
    }
  },
  onWalk(delta) {
    stepIndex += delta;
    renderSolutionArea(store.getState());
  },
  onJumpTo(index) {
    const total = solution?.length ?? 0;
    stepIndex = Math.max(0, Math.min(index, total));
    renderSolutionArea(store.getState());
  },
  onToggleSteps() {
    showAllSteps = !showAllSteps;
    renderSolutionArea(store.getState());
  },
  onMinimizeSequence() {
    sequenceMinimized = true;
    showAllSteps = false;
    renderSolutionArea(store.getState());
  },
  onExpandSequence() {
    sequenceMinimized = false;
    renderSolutionArea(store.getState());
    els.sequencePanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },
  onClearSolution() {
    invalidateSolution();
    renderAll(store.getState());
  },
};

function onSolve() {
  const state = store.getState();
  solution = solve(state.positions, state.matrix);
  stepIndex = 0;
  showAllSteps = false;
  renderSolutionArea(state);
}

els.solveBtn.addEventListener("click", onSolve);
store.subscribe(renderAll);
renderAll(store.getState());
