<div align="center">

<img src="assets/hero.png" alt="Gothic Lock Breaker" width="100%" />

# Gothic Lock Breaker

### An edge-safe solver for the Gothic 1 Remake lockpicking puzzle

Stop snapping picks on the Old Camp tower door. Map the lock, hit **Break the Lock**,
and get the exact run of turns that seats every pin in the notch — without ever grinding
one against the frame.

<br />

[**Open the solver →**](https://dsazz.github.io/gothic-remake-lockbreaker/)

<br />

[![Live on GitHub Pages](https://img.shields.io/badge/play-GitHub%20Pages-e9b969?style=for-the-badge)](https://dsazz.github.io/gothic-remake-lockbreaker/)
&nbsp;
![Version](https://img.shields.io/badge/version-1.1.0-e9b969?style=for-the-badge)
&nbsp;
![No dependencies](https://img.shields.io/badge/dependencies-none-7fb47a?style=for-the-badge)
&nbsp;
![Vanilla JS](https://img.shields.io/badge/built%20with-vanilla%20JS-f4cf85?style=for-the-badge)
&nbsp;
![Works on iPhone](https://img.shields.io/badge/runs%20on-your%20phone-d68a76?style=for-the-badge)

<br />

**Current release: v1.1.0** — see [CHANGELOG.md](CHANGELOG.md) for what changed.

</div>

---

## Why this exists

The Gothic 1 Remake lockpicking minigame is a slider puzzle: each plate's pin must
end at the **center hole**, but the plates are wired together so moving one drags
others along. The trap is the wall — force a pin past the edge and your pick takes
damage, then breaks.

Most "solver" tools just tell you the *net* number of turns per plate. That answer is
useless in practice, because executing it in the wrong order drives a pin into the edge
halfway through and snaps your pick. **This one never does that.** It searches the real
state space and only ever returns moves that keep every pin in range.

<div align="center">
<img src="assets/walkthrough.png" alt="Old Camp lock solved: focus card with L1 — turn left, hole positions 1–7, and step navigation" width="62%" />
</div>

You get a numbered run of turns and a step-through board. Pins resting against the frame
glow red, so you can watch the sequence stay clear of every wall as you go.

> Garbage in, garbage out: the solver is only as good as the couplings you feed it.
> If a step doesn't match the game, a link on one of the lock cards is wrong — re-check that lock.

## How it works

- Every pin sits in one of **seven holes (1–7)** on its plate. The lock opens when **all pins reach hole 4** (the center notch). Holes 1 and 7 are the walls.
- Turning a lock one notch also turns its coupled locks one notch — `With` (same
  way) or `Against` (opposite way). On each lock's card, **Turning this moves** lists
  every other lock that reacts when you turn that one. Coupling is directional, so turning
  lock A can move B even if turning B does nothing to A.
- The solver runs a breadth-first search over the bounded state space and **discards any
  turn that would grind a coupled pin past `±3`**. You get the shortest fully-safe
  sequence, or an honest "no clean path from here" if one truly doesn't exist.

State space tops out at `7^7 ≈ 820,000` states, so it solves instantly.

## Using it

<div align="center">
<img src="assets/app-screenshot.png" alt="The Gothic Lock Breaker v1.1 interface: lock count, per-tumbler plate cards with holes 1–7 and link chips, and the sequence panel" width="62%" />
</div>

<br />

1. **The Lock** — choose how many locks the mechanism has (4–7). Use **Copy link** to
   share the current setup.
2. **Tumblers** — for each lock (numbered 1 front through N back), mark its **start hole**
   and which other locks move when you turn it: `·` none, `With` same way, `Against`
   opposite.
3. **Break the Lock** — read the focus card, then use **Done — next** to walk the
   sequence one turn at a time. Expand **Show all steps** if you want the full list.

Your lock is saved locally and encoded in the page URL, so you can bookmark a tricky
lock or paste the copied link to a friend.

## Running locally

It's plain static files — no build, no install.

```bash
# serve the folder any way you like
python3 -m http.server 8000
# then open http://localhost:8000
```

Run the test suite (solver logic + version drift check, zero dependencies):

```bash
node --test
```

Verify version strings stay in sync across `src/version.js`, `CHANGELOG.md`, and this README:

```bash
node scripts/check-version.js
```

## Architecture

Native ES modules, strict one-way dependencies `ui -> state -> domain`:

| File | Responsibility |
| --- | --- |
| `src/domain.js` | Constants (`POS_MIN/MAX`, `CENTER`, `LINK`, `DIR`) and pure helpers. No DOM, no storage. |
| `src/solver.js` | Pure `solve()` BFS + `statesAlong()`. Depends only on the domain. |
| `src/store.js` | Single source of truth for the lock; persistence (localStorage + URL hash) hidden inside. |
| `src/view.js` | Pure `state -> DOM` rendering; handlers injected. |
| `src/app.js` | The only seam wiring events to the store and solver output to the view. |
| `index.html`, `styles.css` | Shell and theme. |

## Deploy your own

1. Push to `main`.
2. **Settings → Pages → Build and deployment**: source **Deploy from a branch**,
   branch **`main`**, folder **`/ (root)`**.
3. It goes live at `https://<your-user>.github.io/<repo>/`.

## Credits

A fan-made helper for the [Gothic 1 Remake](https://gothicremake.com/) by Alkimia
Interactive. Not affiliated with or endorsed by the developers or publisher. All
artwork here is original and themed, not taken from the game.
