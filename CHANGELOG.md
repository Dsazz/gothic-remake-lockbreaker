# Changelog

All notable changes to Gothic Lock Breaker are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Release rule:** bump `VERSION` in `src/version.js`, add a dated entry below,
and update the `Current release` line in `README.md` — one commit, one deploy.

## [1.3.2] - 2026-06-08

### Changed

- Minimized sequence bar: single-line nav — Back, lock label, move arrow, and Next on one row; step counter centered above the arrow.

### Fixed

- Minimized bar: L1 label vertically aligned with chevrons and move arrow.
- Minimized bar: step label and move-arrow glow no longer clipped by panel overflow.

## [1.3.1] - 2026-06-08

### Fixed

- Walkthrough readout: every active pin now shows a visible ring (was missing on safe positions).
- Walkthrough readout: pins at wall holes 1 and 7 use red danger styling even when that lock is the current turn; moving highlight no longer overrides edge danger.

## [1.3.0] - 2026-06-08

### Added

- Walkthrough readout: 7-hole plate grooves per lock (read-only, matching Section II).
- Section I icon toolbar: link (copy) and trash (wipe lock, with confirm).
- Sequence panel icons: chevron minimize/expand and eraser clear (replaces confusing cross).

### Changed

- Desktop: sticky sequence sidebar with scrollable solution; horizontal tumbler rows (title left, holes + chips right).
- Mobile: viewport-capped sequence panel; compact walkthrough grooves; internal `.solution` scroll.
- Tumblers and walkthrough: locks shown back-to-front (N at top, 1 at bottom) to match in-game stack.
- Walkthrough styling: iron-bordered rows; raised bronze on active pin at hole 4; recessed elsewhere.
- Move-arrow badges sized up so the chevron fits inside the circle.
- Removed **Reset pins** control.
- README screenshots refreshed (mobile walkthrough + desktop layout).

## [1.2.0] - 2026-06-08

### Added

- Gothic-style favicon (SVG, 32px PNG, apple-touch-icon) for browser tabs.
- Version badge in the page header (changelog link), in addition to the footer.
- Compact move commands with round arrow badges in the sequence panel.
- Minimizable sticky sequence bar with back/next step navigation.
- Icon toolbar buttons with hover tooltips on sequence panel actions.
- Makefile dev workflow (`make serve`, `make test`, `make check-version`).

### Changed

- Sequence walkthrough uses compact turn counts instead of verbose step copy.
- README: custom hero banner, refreshed screenshots, controls/danger-color docs, corrected architecture section.
- Local dev docs switched from `python3 -m http.server` to Makefile targets.

## [1.1.0] - 2026-06-07

### Added

- Per-tumbler cards: start hole and couplings on one plate-style card (no separate matrix).
- Holes 1–7 labeling (hole 4 = notch, 1 and 7 = walls) matching in-game counting.
- Desktop two-column layout with sticky sequence panel; mobile single-column stack.
- **Copy link** button to share the current lock via URL hash.
- Version display in the footer with changelog link.
- `scripts/check-version.js` to catch version drift across files.

### Changed

- Collapsed four panels into three: The Lock, Tumblers, The Sequence.
- Locks numbered 1 (front) through N (back), top to bottom.
- Wider responsive layout (up to 1100px) instead of a fixed 660px column.

## [1.0.0] - 2026-06-01

### Added

- Edge-safe BFS solver: shortest path that never grinds a pin past the frame.
- Coupling matrix UI, per-tumbler position tracks, and step-through walkthrough.
- URL hash and localStorage persistence for bookmarking and sharing locks.
