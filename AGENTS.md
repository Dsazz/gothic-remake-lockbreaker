# Gothic Lock Breaker — agent instructions

Vanilla ES-module SPA for Gothic 1 Remake lockpicking. Vite builds to `dist/`; GitHub Actions deploys to Pages. Live: [gothiclockbreaker.com](https://gothiclockbreaker.com/).

Read this whole file before non-trivial changes. Product context lives in [README.md](README.md).

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
| Pure | `domain.js`, `solver.js`, `store.js` | No DOM, no `window` |
| View | `view.js` | State → DOM; handlers injected; no store |
| Controllers | `*-controller.js` | Orchestration, session UX |
| Root | `app.js` | Bootstrap and wiring only |

Dependency flow: `app.js` → controllers → `view.js` / `store.js` → `domain.js`; `solver.js` → `domain.js`.

Boot-sensitive files:

- `src/i18n.js` — English catalog imported synchronously; `FROZEN_KEYS` keep compact UI in English
- `src/analytics/posthog-init.js` — lean PostHog, deferred after first paint
- `public/` — symlinks to `assets/`, `locales/`, `CNAME`, `robots.txt`, `sitemap.xml`, `llms.txt` (Vite copies to `dist/`)

## Code conventions

- ES modules only; no framework
- Storage keys: `src/storage-keys.js` — no magic strings
- Analytics enums/events: `src/analytics/values.js`, `src/analytics/events.js`
- User-facing copy: `locales/{en,de,pl,ukr}.json` via `t()` / `tCount()`; Tier C keys need all four locales
- `innerHTML` only for trusted first-party locale strings (see `src/static-content.js`)

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
