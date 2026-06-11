---
name: app-release
description: >-
  Prepare and ship Gothic Lock Breaker releases — semver bump, CHANGELOG,
  README badge, SEO dates, verification, and deploy. Use when the user asks
  to prepare, cut, ship, or tag a release; bump version; or update CHANGELOG
  for deploy.
---

# Gothic Lock Breaker — app release

Read [AGENTS.md](../../../AGENTS.md) boundaries first. One commit per release; push `main` triggers deploy.

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
- [ ] Commit + push (only if user asked)
```

`make check-version` does **not** check the README badge — update it manually.

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

**Do not commit** unless the user explicitly asks. When they do, one commit with all release files + any pending feature work for that release.

## Deploy (after push to main)

1. GitHub **Settings → Pages → Build and deployment** → source **GitHub Actions** (not branch root)
2. [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml): CI → `vite build` → Pages artifact
3. Confirm Actions green; spot-check [gothiclockbreaker.com](https://gothiclockbreaker.com/)

## Do not

- Commit `dist/`, `node_modules/`, secrets
- Split version bump and changelog across multiple release commits
- Bump version without a dated CHANGELOG entry
- Add FAQPage JSON-LD (`check-seo.js` rejects it)
