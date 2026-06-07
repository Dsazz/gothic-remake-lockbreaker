# Gothic Lock Breaker

An **edge-safe** solver for the Gothic 1 Remake lockpicking minigame. It returns a
step-by-step sequence that centers every pin **without ever shoving a pin into a wall**,
which is the failure that breaks lockpicks (and the reason most other solvers don't help).

Open it on your phone, transcribe the lock, press **Solve**, follow the steps.

## Why this one is different

Most solvers compute the *net* number of turns per plate using linear algebra. That
ignores move ordering and the `-3 … +3` walls, so when you execute their answer a pin
slams into an edge mid-sequence and your pick breaks. This tool instead does a
breadth-first search over the actual bounded state space, rejecting any move that would
push a linked pin out of range. The result is the **shortest sequence of safe nudges**,
or a clear "no safe path" message.

State space is at most `7^7 ≈ 820k` states, so the search is instant.

## How the lock works

- Each plate's pin sits at a position from `-3` to `+3`. The lock opens when **every pin is at `0`** (the center hole).
- Moving a plate one notch also moves its **linked** plates one notch — `Same` direction or `Opp.` (opposite). Links are directional: moving A may affect B even if moving B does not affect A.
- If a move would force any pin past `±3`, it is illegal (in-game it rattles and damages your pick), so the solver never produces such a move.

## How to use it

1. **Plates** — pick how many plates the lock has (4–7).
2. **Interactions** — for each row "when I move Plate X", tap the cell under each other plate to record what you observed in-game: `—` none, `Same`, or `Opp.`.
3. **Current pins** — set where each pin currently sits.
4. **Solve** — read the ordered steps, and use Prev/Next to walk the board one move at a time.

Your lock is saved to `localStorage` and encoded in the page URL, so you can bookmark or share a specific lock.

## Run the tests

Pure logic (domain + solver) is covered by zero-dependency tests, including the Old Camp
tower door case transcribed from real screenshots:

```bash
node --test
```

## Architecture

Zero build step — native ES modules served as static files. Strict one-way dependency
direction `ui -> state -> domain`:

- `src/domain.js` — constants (`POS_MIN/MAX`, `CENTER`, `LINK`, `DIR`) and pure helpers (`applyMove`, `isInBounds`, `isSolved`). No DOM, no storage.
- `src/solver.js` — pure `solve()` BFS + `statesAlong()`. Depends only on the domain.
- `src/store.js` — single source of truth for the lock, with a hidden persistence adapter (localStorage + URL hash). Nothing else touches storage.
- `src/view.js` — pure `state -> DOM` rendering; event handlers are injected.
- `src/app.js` — the only module wiring events to the store and feeding solver results to the view.
- `index.html`, `styles.css` — shell and theme.

## Deploy to GitHub Pages

It's all static, so just push and enable Pages:

1. Push to `main`.
2. Repo **Settings -> Pages -> Build and deployment**: source **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**.
3. Open `https://dsazz.github.io/gothic-remake-lockbreaker/` on your iPhone.
