// Main-thread client for the off-thread solver. Keeps the UI responsive while a
// heavy lock is being solved: a fresh request terminates any in-flight worker
// (latest-wins), so re-solving never queues behind a stale 1s+ computation.
//
// Falls back to running the pure solver inline when Workers are unavailable
// (Node test runner, ancient browsers) so callers get one consistent contract.

let activeWorker = null;

function spawnWorker() {
  return new Worker(new URL("./solver.worker.js", import.meta.url), {
    type: "module",
  });
}

function solveInline(start, matrix) {
  return import("./core/solver.js").then(({ solve }) => solve(start, matrix));
}

/**
 * @param {number[]} start
 * @param {number[][]} matrix
 * @returns {Promise<import("./core/solver.js").Move[] | null>}
 */
export function solveAsync(start, matrix) {
  if (typeof Worker === "undefined") return solveInline(start, matrix);

  cancelSolve();
  const worker = spawnWorker();
  activeWorker = worker;

  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      disposeIfActive(worker);
      resolve(event.data.solution);
    };
    worker.onerror = (event) => {
      disposeIfActive(worker);
      reject(event.error ?? new Error("solver worker failed"));
    };
    worker.postMessage({ start, matrix });
  });
}

// Aborts any in-flight solve. Pending `solveAsync` promises are abandoned (never
// settle) by design — callers guard stale results with their own request token.
export function cancelSolve() {
  if (!activeWorker) return;
  activeWorker.terminate();
  activeWorker = null;
}

function disposeIfActive(worker) {
  worker.terminate();
  if (activeWorker === worker) activeWorker = null;
}
