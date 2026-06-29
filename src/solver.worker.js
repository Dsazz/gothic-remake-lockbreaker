// Module worker: runs the pure BFS solver off the main thread so heavy locks
// (7 plates ≈ 800k states, ~1s+) never freeze the page. Thin adapter only — the
// algorithm and all correctness live in the pure `core/solver.js`.

import { solve } from "./core/solver.js";

self.onmessage = (event) => {
  const { start, matrix } = event.data;
  self.postMessage({ solution: solve(start, matrix) });
};
