---
name: app-release
description: >-
  Prepare and ship Gothic Lock Breaker releases — semver bump, CHANGELOG,
  README badge, SEO dates, verification, and deploy. Use when the user asks
  to prepare, cut, ship, or tag a release; bump version; or update CHANGELOG
  for deploy.
---

# Gothic Lock Breaker — app release

Read [AGENTS.md](../../../AGENTS.md) boundaries first. One commit per release; merge PR to `main` triggers deploy. Direct push to `main` is blocked by branch protection.

## When to bump

| Level | Use when |
| --- | --- |
| **patch** (x.y.**Z**) | Bug fixes, copy tweaks, analytics tuning, lint-only |
| **minor** (x.**Y**.0) | New features, perf wins, build/CI changes, new locales keys |
| **major** (**X**.0.0) | Breaking URL hash format, solver semantics, or saved-lock compatibility |

Source of truth: `src/version.js` → `export const VERSION`.

## Release checklist

Copy and track:

```
- [ ] Review git diff since last tag — group into Added / Changed / Fixed / Removed
- [ ] Pick semver (patch / minor / major)
- [ ] src/version.js — VERSION
- [ ] CHANGELOG.md — new ## [X.Y.Z] - YYYY-MM-DD at top (Keep a Changelog sections)
- [ ] README.md — Current release: vX.Y.Z
- [ ] README.md — version badge (shields.io line)
- [ ] llms.txt + sitemap.xml — Last updated / lastmod date = changelog date (if SEO-relevant)
- [ ] make lint && make test (includes check-version and check-seo)
- [ ] Optional: make build && make preview — smoke fonts, locales, hash, cold onboarding
- [ ] Commit on release branch + open/merge PR to `main` (only if user asked)
```

`main` is protected — all changes via PR, `ci` status check required. `make check-version` does **not** check the README badge — update it manually.

## CHANGELOG entry

Format (match existing [CHANGELOG.md](../../../CHANGELOG.md)):

```markdown
## [1.15.0] - 2026-06-11

### Added
- …

### Changed
- …

### Removed
- …
```

- User-facing outcomes, not file lists
- Omit empty sections
- Date = UTC calendar day of the release commit

## SEO dates

When the release touches SEO, positioning, press URLs, JSON-LD, or `llms.txt` content:

- `llms.txt` — `## Last updated` block must include the changelog date string
- `sitemap.xml` — every `<lastmod>` must include that same date

`node scripts/check-seo.js` enforces parity with the latest CHANGELOG heading date.

## Verify

```bash
make lint && make test
```

`check-version` and `check-seo` run inside `npm test`.

## Commit message

```text
Release vX.Y.Z — one-line summary of the headline change.
```

Example: `Release v1.15.0 — Vite build, GitHub Actions deploy, first-load perf, Biome.`

**Do not commit** unless the user explicitly asks. When they do, one commit on a release branch with all release files + any pending feature work for that release. Open a PR to `main`; merge after CI passes.

## Deploy (after PR merge to main)

1. GitHub **Settings → Pages → Build and deployment** → source **GitHub Actions** (not branch root)
2. Merging the PR triggers [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml): CI → `vite build` → Pages artifact
3. Confirm Actions green; spot-check [gothiclockbreaker.com](https://gothiclockbreaker.com/)

Branch protection requires the `ci` status check to pass before merge; force pushes and direct pushes to `main` are blocked.

## Tag + GitHub Release (automated — do not do by hand)

The `release` job in [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) runs on every push to `main`:

1. Reads `VERSION` from `src/version.js` → tag `vX.Y.Z`.
2. Skips if that tag already exists on the remote (idempotent — re-runs and unrelated merges are no-ops).
3. Otherwise creates the tag at the merge commit and a GitHub Release whose body is the matching `CHANGELOG.md` section, extracted by [`scripts/changelog-notes.js`](../../../scripts/changelog-notes.js).

Implications for this checklist:

- **Never** create tags or run `gh release create` manually — the workflow owns it.
- A release only happens if `src/version.js` was bumped **and** a matching `## [X.Y.Z]` CHANGELOG entry exists. Both are already in the checklist; the Release section now depends on them.
- The CHANGELOG entry *is* the public release notes — write it for players, not as a file list.

## Do not

- Commit `dist/`, `node_modules/`, secrets
- Split version bump and changelog across multiple release commits
- Bump version without a dated CHANGELOG entry
- Add FAQPage JSON-LD (`check-seo.js` rejects it)
