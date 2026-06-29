// Pure solver: breadth-first search over the bounded lock state space.
// Returns the shortest sequence of edge-safe nudges that centers every pin,
// [] if already solved, or null if no edge-safe solution exists.
// Depends only on the domain layer. No DOM, no storage, no globals.

import { applyMove, isInBounds, isSolved, DIR } from "./domain.js";

const DIRECTIONS = [DIR.RIGHT, DIR.LEFT];

function keyOf(state) {
  return state.join(",");
}

function reconstruct(cameFrom, endKey) {
  const moves = [];
  let key = endKey;
  for (let entry = cameFrom.get(key); entry?.move; entry = cameFrom.get(key)) {
    moves.push(entry.move);
    key = entry.parentKey;
  }
  return moves.reverse();
}

/**
 * @param {number[]} start
 * @param {number[][]} matrix
 * @returns {import("./domain.js").Move[] | null}
 */
export function solve(start, matrix) {
  if (!isInBounds(start)) return null;
  if (isSolved(start)) return [];

  const startKey = keyOf(start);
  const cameFrom = new Map([[startKey, { parentKey: null, move: null }]]);
  const queue = [start];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const currentKey = keyOf(current);

    for (let plate = 0; plate < current.length; plate++) {
      for (const dir of DIRECTIONS) {
        const next = applyMove(current, matrix, plate, dir);
        if (!isInBounds(next)) continue;

        const nextKey = keyOf(next);
        if (cameFrom.has(nextKey)) continue;

        cameFrom.set(nextKey, { parentKey: currentKey, move: { plate, dir } });
        if (isSolved(next)) return reconstruct(cameFrom, nextKey);
        queue.push(next);
      }
    }
  }
  return null;
}

// Replays a solution from `start`, returning every intermediate board state
// (length = moves.length + 1). Useful for the step-through walkthrough.
export function statesAlong(start, matrix, moves) {
  const states = [start.slice()];
  let current = start;
  for (const move of moves) {
    current = applyMove(current, matrix, move.plate, move.dir);
    states.push(current);
  }
  return states;
}
