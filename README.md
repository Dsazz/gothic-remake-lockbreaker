<div align="center">

<img src="assets/hero.webp" alt="Gothic Lock Breaker" width="100%" />

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
[![Tip jar](https://img.shields.io/badge/tip-Ko--fi-e9b969?style=for-the-badge)](https://ko-fi.com/swarmconductor)
&nbsp;
![Version](https://img.shields.io/badge/version-1.8.5-e9b969?style=for-the-badge)
&nbsp;
![Dev deps only](https://img.shields.io/badge/npm-dev%20deps%20only-7fb47a?style=for-the-badge)
&nbsp;
![Vanilla JS](https://img.shields.io/badge/built%20with-vanilla%20JS-f4cf85?style=for-the-badge)
&nbsp;
![Works on iPhone](https://img.shields.io/badge/runs%20on-your%20phone-d68a76?style=for-the-badge)

<br />

**Current release: v1.8.5** — see [CHANGELOG.md](CHANGELOG.md) for what changed.

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
<img src="assets/walkthrough.png" alt="Mobile sequence walkthrough: step 6 of 15 — L2 turn left, with 7-hole readout grooves for each lock" width="62%" />
</div>

You get a numbered run of turns and a step-through board. Pins against the frame glow
**red**; pins one nudge away glow **amber** — on the tumbler cards and in the walkthrough —
so you can watch the sequence stay clear of every wall as you go.

> Garbage in, garbage out: the solver is only as good as the couplings you feed it.
> If a step doesn't match the game, a link on one of the lock cards is wrong — re-check that lock.
> Training with Fingers does **not** change how plates move; tap **Something off?** in the
> walkthrough for a checklist. At **Master**, set picks snapped and tap **Gone** beside dropped couplings.

## Mastery vs solver

| Tier | Mistakes | On pick break | Solver impact |
| --- | --- | --- | --- |
| Untrained | 2 | Lock resets | Edge-safe BFS on your mapped couplings |
| Trained | 4 | Progress kept | Same plate physics — more room for mistakes in-game |
| Master | 6 | One link removed per snap | Set picks snapped, tap gone links on tumbler cards |

The BFS never asks you to grind a pin past the wall. Mastery only changes how many wall
mistakes you can afford in-game and (at Master) which couplings still exist after a break.

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
<img src="assets/app-screenshot.png" alt="Gothic Lock Breaker on desktop: horizontal tumbler rows with start holes and coupling chips, sticky sequence sidebar with groove readout walkthrough" width="62%" />
</div>

<br />

1. **The Lock** — choose your **lockpicking tier** (Untrained / Trained / Master), how many
   locks the mechanism has (4–7; defaults to **6**), and at Master how many **picks you've
   snapped** on this lock so you can mark dropped couplings on the tumbler cards. Once you change
   the setup, **Wipe lock** (trash icon) clears couplings, mastery, and returns the count to 6
   — with a confirm prompt.
2. **Tumblers** — for each lock (numbered 1 front through N back), mark its **start hole**
   and which other locks move when you turn it: `·` none, `With` same way, `Against`
   opposite.
3. **Break the Lock** — read the focus card, then **Next** to walk the sequence one turn
   at a time. Each lock row shows a read-only 7-hole groove (like the tumbler cards).
   After a solve with steps, a **Share lock** banner copies the URL for the current lock.
   **Minimize** collapses the panel to a compact bar; **Clear** (eraser) drops the
   solved sequence. Open **Show all N steps** for the full list.

Your lock is saved locally and encoded in the page URL, so you can bookmark a tricky
lock or paste the copied link to a friend. The footer shows the running version and
links to the changelog.

## Running locally

Plain static files — no build step. Run `make install` once for the local dev server.
The page loads Cinzel from Google Fonts; everything else is self-contained.

```bash
make install        # first time only
make serve          # http://localhost:8000
make test
make check-version
```

Override the port with `make serve PORT=3000`. Run `make` with no args to list targets.

## Architecture

Native ES modules. `app.js` is the only wiring layer; `store`, `solver`, and `view` stay pure and all depend on `domain`:

| File | Responsibility |
| --- | --- |
| `src/domain.js` | Constants (`POS_MIN/MAX`, `CENTER`, `LINK`, `DIR`, `MASTERY`) and pure helpers including `effectiveMatrix()`. No DOM, no storage. |
| `src/solver.js` | Pure `solve()` BFS + `statesAlong()`. Depends only on the domain. |
| `src/store.js` | Single source of truth for the lock; persistence (localStorage + URL hash) hidden inside. Depends only on the domain. |
| `src/view.js` | Pure `state -> DOM` rendering; handlers injected. Reads domain constants; no store access. |
| `src/app.js` | Wires DOM events to the store and solver output to the view. |
| `src/analytics/` | Product analytics facade; PostHog wired only in `transport.js`, init in `index.html`. |
| `src/version.js` | Release version and changelog URL for the footer badge. |
| `index.html`, `styles.css` | Shell and theme. |

## Analytics

Production builds send **anonymous** usage data to [PostHog EU](https://eu.posthog.com) (hosted in the EU). We do not collect accounts, names, or personal information. Autocapture covers pageviews and clicks; custom events cover landing type, mapping milestones, solve funnel (with `solve_source`), walkthrough interaction, tutor/onboarding, share prompts, guide opens, and lock wipe. No lock couplings, pin positions, or URL hash are sent. Analytics is disabled on `localhost` and `127.0.0.1` during local development.

## Deploy your own

1. Push to `main`.
2. **Settings → Pages → Build and deployment**: source **Deploy from a branch**,
   branch **`main`**, folder **`/ (root)`**.
3. It goes live at `https://<your-user>.github.io/<repo>/`.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Stanislav Stepanenko (Dsazz).

## Credits

A fan-made helper for the [Gothic 1 Remake](https://gothicremake.com/) by Alkimia
Interactive. Not affiliated with or endorsed by the developers or publisher. All
artwork here is original and themed, not taken from the game.
