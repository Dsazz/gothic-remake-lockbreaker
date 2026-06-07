// Controller: the only module that knows about both the store and the
// solver/view. Wires DOM events to store mutations, runs the solver, and feeds
// results to the view. Data flow is one-way: event -> store -> re-render.

import { createStore } from "./store.js";
import { solve, statesAlong } from "./solver.js";
import * as view from "./view.js";

const els = {
  controls: document.getElementById("controls"),
  matrix: document.getElementById("matrix"),
  positions: document.getElementById("positions"),
  solution: document.getElementById("solution"),
  solveBtn: document.getElementById("solve-btn"),
};

const store = createStore();

// Transient UI state — the solution is derived, not part of the lock definition.
let solution; // undefined | null | Move[]
let stepIndex = 0;

function buildWalkthrough(state) {
  if (!solution || solution.length === 0) return null;
  const states = statesAlong(state.positions, state.matrix, solution);
  const clamped = Math.min(stepIndex, states.length - 1);
  stepIndex = clamped;
  return { states, stepIndex: clamped, move: solution[clamped] ?? null };
}

function renderSolutionArea(state) {
  view.renderSolution(els.solution, solution, buildWalkthrough(state), handlers);
}

function renderAll(state) {
  view.renderControls(els.controls, state, handlers);
  view.renderMatrix(els.matrix, state, handlers);
  view.renderPositions(els.positions, state, handlers);
  renderSolutionArea(state);
}

// Any change to the lock definition invalidates the previous solution.
function invalidateSolution() {
  solution = undefined;
  stepIndex = 0;
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
  onWalk(delta) {
    stepIndex += delta;
    renderSolutionArea(store.getState());
  },
};

function onSolve() {
  const state = store.getState();
  solution = solve(state.positions, state.matrix);
  stepIndex = 0;
  renderSolutionArea(state);
}

els.solveBtn.addEventListener("click", onSolve);
store.subscribe(renderAll);
renderAll(store.getState());
