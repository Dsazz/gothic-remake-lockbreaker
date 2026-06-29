# Gothic Lock Breaker — agent instructions

Vanilla ES-module SPA for Gothic 1 Remake lockpicking. Vite builds to `dist/`; GitHub Actions deploys to Pages. Live: [gothiclockbreaker.com](https://gothiclockbreaker.com/).

Read this whole file before non-trivial changes. Product context lives in [README.md](README.md).

## Upstream game version

Solver validated against Gothic 1 Remake v1.0.2 (CL 169494). Patches 1.0.1/1.0.2 introduced no lockpicking mechanic changes — only an in-game difficulty indicator (1.0.1) and a small XP reward on solve (1.0.2), neither modeled here. Audit the next patch as a diff against this baseline.

Changelog source: `https://files.gothic-game.com/changelogs/G1R_Patch_<version>.txt` (e.g. [1.0.2](https://files.gothic-game.com/changelogs/G1R_Patch_1.0.2.txt), [1.0.1](https://files.gothic-game.com/changelogs/G1R_Patch_1.0.1.txt)).

## Commands

```bash
make install          # once after clone
make dev              # Vite dev server — http://localhost:5173
make lint && make test   # Biome + node --test
make check-version    # VERSION / CHANGELOG / README drift
make build            # output in dist/ (gitignored)
make preview          # build + vite preview — use this, not parallel builds
make clean            # rm -rf dist/
```

Override dev port: `npm run dev -- --port 3000`.

Tests import `src/` directly — never point tests at `dist/`.

## Architecture

| Layer | Files | Rules |
| --- | --- | --- |
| Pure | `core/{domain,solver,store,examples}.js` | No DOM, no `window` |
| View | `view/index.js` (barrel) + `view/*.js` | State → DOM; handlers injected; no store |
| Controllers | `controllers/*.js` | Orchestration, session UX |
| i18n | `i18n/*.js` (`index` catalog + `locale-suggest`, `locale-switcher`, `referrer-hints`, `static-content`) | Locale resolution, copy, static-content hydration |
| Onboarding | `onboarding/*.js` (`tour`, `stub`, `solve-coachmark`, `solve-coachmark-schedule`, `spotlight-ring`) | First-run tour + post-solve coachmark UX |
| Bootstrap | `bootstrap/*.js` (`app-renderer`, `app-elements`, `startup`, `landing`, `mapped-transition`, `how-to-map-image`) | App wiring, render loop |
| Storage | `storage/*.js` (`keys` constants + `prefs` adapter) | localStorage/sessionStorage keys + persistence façade |
| Root | `app.js` (entry) + cross-cutting primitives (`version`, `keyboard-keys`) | Composition root + shared constants |

Dependency flow: `app.js` → `bootstrap/` + `controllers/` → `view/` / `core/store.js` → `core/domain.js`; `core/solver.js` → `core/domain.js`. Async solving runs off-thread via `solver/worker.js` + `solver/client.js`.

### Where does new code go?

Decision list (first match wins):

- Pure logic, no DOM / no `window` → `core/`
- Pure `state → DOM` rendering → `view/` (+ the `view/index.js` barrel)
- Session / UX orchestration → `controllers/*.js`
- App lifecycle / render wiring → `bootstrap/` (the entry is `app.js` at root)
- Part of a cohesive cross-feature subsystem → `i18n/` | `analytics/` | `onboarding/` | `solver/` | `storage/`
- Cross-cutting primitive/constant used by 3+ layers → `src/` root (`version`, `keyboard-keys`)

Two principles behind that list:

1. **Features are cross-cutting, not folders.** A user-facing feature (camp, walkthrough, locale) lives across its layer homes by design — e.g. camp = `controllers/camp.js` + camp rendering in `view/` + `styles/camp-*.css` + locale keys. Do not create per-feature folders.
2. **A subsystem earns its own folder** only when it's a cohesive concern reused across features (the bar that `i18n` / `analytics` / `onboarding` / `solver` / `storage` clear). Otherwise it belongs in a layer folder.

`src/view/index.js` is a re-export barrel over per-surface modules in `src/view/` (`dom`, `labels`, `controls`, `tumblers`, `solution`, `banners`, `overlays`, `chrome`); consumers import `view/index.js`. `src/view/links.js` is the external-link registry (changelog, support, issues, press) consumed by the chrome/banner surfaces. `styles.css` is an `@import` entry over cascade-ordered partials in `styles/` — Vite flattens it into one render-blocking stylesheet (keep the import order = the original section order).

Boot-sensitive files:

- `src/i18n/index.js` — English catalog imported synchronously; `FROZEN_KEYS` keep compact UI in English
- `src/analytics/posthog-init.js` — lean PostHog, deferred after first paint
- `public/` — symlinks to `assets/`, `locales/`, `CNAME`, `robots.txt`, `sitemap.xml`, `llms.txt` (Vite copies to `dist/`)

## Code conventions

- ES modules only; no framework
- Storage keys: `src/storage/keys.js` — no magic strings
- Analytics enums/events: `src/analytics/values.js`, `src/analytics/events.js`
- User-facing copy: `locales/{en,de,pl,ukr}.json` via `t()` / `tCount()`; Tier C keys need all four locales
- `innerHTML` only for trusted first-party locale strings (see `src/i18n/static-content.js`)

## Analytics events

Catalog of all PostHog events so you don't have to grep `src/analytics/`. Most events carry `app_version`; gameplay events add `plate_count`; solve/share events add `landing_type`. Enums live in `src/analytics/values.js`.

- **Landing/lifecycle:** `landing` (+ referrer/UTM attribution, registers session props).
- **Solve & lock:** `lock_solved` (`move_count`, `is_first_solve`), `lock_already_solved`, `lock_no_solution` (`failure_reason`), `lock_became_mappable`, `example_lock_loaded`, `step_mismatch_clicked`, `steps_revealed` (`move_count`, `step_index`; fired at most once per page load on first "Show all steps" expand — usage signal to decide if the toggle earns its keep).
- **Onboarding/tutor:** `tutor_started`, `tutor_not_shown` (`reason`), `tutor_skipped`, `onboarding_dismissed` (`action`/`completed`).
- **Guide:** `guide_opened` (`source`).
- **Prompts:** `prompt_dismissed` (`prompt` = `hash_banner` / `i18n_banner`). Generic dismissal event for inline banners; not share-related.
- **Locale/i18n:** `locale_changed` (`change_direction`), `locale_session_end` (pagehide summary), `locale_auto_applied`, `i18n_banner_shown`, `locale_suggest_shown`/`_accepted`/`_declined`, `translation_feedback_clicked`, `hash_banner_shown`. Note: locale still rides every event via registered session properties (set during locale resolution and on each `locale_changed`).
- **Support:** `support_link_clicked` (`source`, `locale`).
- **Camp:** `camp_selected` (`camp`, `previous_camp`), `camp_hint_shown` (discovery nudge surfaced), `camp_picker_opened` (`source` = hint/manual, `had_camp`).
- **Keyboard:** `shortcuts_opened` (`source` = icon/key; mirrors `guide_opened`), `keyboard_nav_used` (`surface` = walkthrough/mapping; fires at most once per session on first keyboard navigation).

Source of truth: `src/analytics/events.js` (names) and `src/analytics/track.js` + `src/analytics/locale-engagement.js` (props). Update this list when adding events.

Removed with the share feature in v1.31.0 (dead feature — ~0.7% of solvers ever shared; see CHANGELOG): `share_prompt_clicked`, `share_link_copied`, `share_link_copy_failed`.

Removed to stay under PostHog quota (emitted by old cached clients only, referenced by zero saved insights/notebooks/cohorts): `solve_button_clicked` (redundant with the `lock_*` solve-result events), `walkthrough_session_summary`, `share_prompt_shown`, `locale_resolved` (locale already rides every event), `lock_cleared`, `mastery_tier_changed`, `support_surface_shown`.

## Camp themes

Cosmetic faction theme switcher in `src/controllers/camp.js` — a banner picker in the header. Pure UI + persistence; no coupling to `store.js`, `solver.js`, or `domain.js`. Analytics flows only through injected callbacks (`onSelect` -> `camp_selected`, `onHintShown` -> `camp_hint_shown`, `onPickerOpened` -> `camp_picker_opened`); the controller imports no analytics.

- Three camps: `old` (gold), `new` (blue), `swamp` (green); neutral = no theme (grey default). Ids in `CampId` (`src/analytics/values.js`).
- Theme = accent palette swap via a `data-camp` attribute on `<html>`. Palettes live in `styles.css` under `:root[data-camp="..."]`, overriding registered `@property` custom props (`--bronze*`, `--bg-vignette`) so switches animate.
- `initCampTheme()` applies the persisted camp before first paint (avoids neutral flash); `createCampSelector()` builds the trigger + popover. Both wired in `src/app.js`.
- Persistence: `StorageKeys.CAMP`. The discovery hint re-shows at most once per session (`CAMP_HINT_SESSION_SHOWN`) for up to `CAMP_HINT_MAX_SESSIONS` visits, then stops once the picker is ever opened (`CAMP_PICKER_OPENED`) or the lifetime cap (`CAMP_HINT_SHOWN_COUNT`) is hit; it stays deferred so it never competes with onboarding.
- Labels are localized via `t("camp.*")` — Tier C keys need all four locales.

## Testing

- Runner: `node --test` in `tests/`
- Many tests assert source invariants (grep-based); read the failing test before changing production code
- `scripts/check-version.js` and `scripts/check-seo.js` run via the test suite
- Add tests only for real behavior; skip trivial assertions

## Cursor hooks

After each agent turn, [`.cursor/hooks.json`](.cursor/hooks.json) runs `make lint && make test` via the `stop` hook ([`.cursor/hooks/verify.mjs`](.cursor/hooks/verify.mjs)). Failures auto-submit a follow-up (up to 3 loops). On success the hook returns `{}` and the turn ends.

## Release and deploy

Canonical checklist: [.cursor/skills/app-release/SKILL.md](.cursor/skills/app-release/SKILL.md) — semver, CHANGELOG, README badge, SEO dates, verify, deploy.

### Branch protection

`main` is protected — no direct pushes, no force pushes, no deletion. All changes go through a **pull request**. The `ci` status check must pass before merge, enforced for admins too.

### Workflow

1. **Create a feature/release branch** off `main`.
2. **Open a PR → `main`:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint + test. Merge is blocked until `ci` passes.
3. **Merge PR → `main`:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — CI → `vite build` → GitHub Pages. Pages source must be **GitHub Actions** (not branch root).

`ci.yml` fires on PRs only; `deploy.yml` fires on push to `main` only (with its own CI gate). No duplicate runs.

## Boundaries

**Always**

- Work on a branch; merge via PR (direct push to `main` is blocked)
- Run `make lint && make test` before finishing
- Minimal diff; match existing module boundaries and naming
- Keep PostHog lean (no autocapture, replay, heatmaps unless explicitly requested)

**Ask first**

- New npm dependencies
- New analytics events (quota + privacy)
- SEO / JSON-LD / press URL changes
- Breaking URL hash format or solver semantics

**Never**

- Commit `dist/`, `node_modules/`, or secrets
- Treat repo root as production (only `dist/` ships)
- Send lock couplings, pin positions, or URL hash to analytics
- Add FAQPage JSON-LD (`scripts/check-seo.js` rejects it)

## Must-read

- [README.md](README.md) — product and architecture table
- [CHANGELOG.md](CHANGELOG.md) — release history and release rule
- [Makefile](Makefile) — full command list
