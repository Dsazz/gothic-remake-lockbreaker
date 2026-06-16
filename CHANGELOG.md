# Changelog

All notable changes to Gothic Lock Breaker are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Release rule:** bump `VERSION` in `src/version.js`, add a dated entry below,
and update the `Current release` line in `README.md` — one commit, one deploy.

## [1.20.6] - 2026-06-16

### Fixed

- Sequence Share and Tip ore — hidden until a solve returns steps (no longer shown on the empty pre-solve panel).

## [1.20.5] - 2026-06-16

### Changed

- Sequence section — Share and Tip ore stay visible in the header as compact side-by-side pills; post-solve gratitude banner and dismiss removed.
- Share button label — "Share" in EN and "Teilen" in DE (was "Share link" / "Link teilen").
- Header and footer donation buttons — subtle blue glow on the ore and button chrome.
- Minimized sequence walkthrough — small top padding below header actions.

## [1.20.4] - 2026-06-15

### Added

- Header Sleeper easter egg — slow red ember sparks around the medallion rim on idle, larger on hover when the Sleeper wakes; sparks sit behind the icon so they never cover the face.

## [1.20.3] - 2026-06-15

### Changed

- Header Sleeper icon — larger on desktop (128px); mobile size unchanged.

## [1.20.2] - 2026-06-15

### Changed

- Mobile header donation ore — icon-only (no pill chrome), aligned with locale switcher, larger tap target.
- Minimized Sequence minibar ore — moved to header icon row (first position), matches expand/clear tool styling.
- Minibar ore visibility — same eligibility as post-solve gratitude strip (share + donate); ore is the minimized mobile fallback.

## [1.20.1] - 2026-06-15

### Fixed

- Gratitude-strip donation link opens Ko-fi via native navigation instead of a popup-blocked `window.open`.
- PostHog error capture filters password-manager extension noise (`standardSelectors`).

### Changed

- Post-solve gratitude strip — centered headline, icon dismiss, stacked share/donate CTAs, shorter copy in all locales.
- Ore donation buttons (header, footer, minibar, gratitude) share hover lift and ore shimmer; share link gets link-icon wiggle on hover.

## [1.20.0] - 2026-06-15

### Added

- Graduated solve gate — block solve on empty mapping, amber warning on partial mapping, `mapping_completeness` analytics.
- Post-solve gratitude strip in The Sequence — one-time share link + donation CTA with minibar ore fallback on mobile walkthrough.
- Onboarding tour step 5 targeting Break the Lock; hash-failure coachmark for shared locks that do not solve.
- Analytics: `support_surface_shown`, `hash_banner_shown`, `translation_feedback_clicked`, `locale_auto_applied`; donation `plate_count` / `locale`; share `landing_type`.
- German locale suggest from browser language before geo resolves.
- Fixed spotlight ring overlay for solve-button coachmarks (avoids breaking sticky mobile layout).

### Changed

- Failure alerts persist until the next solve attempt; OOB failures get the same recovery CTAs as no-path.
- Tour completion scrolls to the solve button; i18n banner GitHub link tracks translation feedback separately from donations.
- PostHog error capture filters wallet and Firefox extension injection noise.

## [1.19.5] - 2026-06-15

### Added

- Cloudflare worker snippet to serve `robots.txt` on the PostHog reverse-proxy subdomain (`e.gothiclockbreaker.com`).
- SEO CI guards for single-URL sitemap with `xhtml:hreflang` alternates.

### Changed

- Sitemap lists one homepage URL with hreflang alternates instead of separate `?lang=` entries — aligns with Google canonicalization for the SPA.
- Locale switcher syncs `?lang=` to the address bar so localized links are shareable.

## [1.19.4] - 2026-06-13

### Changed

- Wipe lock confirmation uses a Gothic-styled in-app dialog with icon pill actions instead of the browser confirm dialog.

## [1.19.3] - 2026-06-13

### Changed

- Header support ore glow toned down — smaller blur, lower opacity, deeper navy blue instead of bright royal blue.

## [1.19.2] - 2026-06-13

### Fixed

- PostHog error capture no longer reports browser extension noise (`runtime.sendMessage(). Tab not found`).

## [1.19.1] - 2026-06-12

### Changed

- Header Sleeper icon sits slightly higher on mobile (below the `900px` desktop layout).

## [1.19.0] - 2026-06-12

### Added

- Header **Sleeper** Ko-fi easter egg — top-right on desktop, sleep-to-awake hover, Gothic tooltip (*Der Schläfer erwache!*), transparent WebP assets.
- PostHog `support_link_clicked` with `source: header_sleeper` when the Sleeper icon is opened.

## [1.18.0] - 2026-06-12

### Added

- Press-referrer auto-locale: visitors from pcgames.de, buffed.de, gamestar.de, and ithardware.pl load German or Polish UI on first paint (respects locale suggest dismiss for the session).
- "Load example lock" recovery button on no-path solve failures — loads the Old Camp example and auto-solves.

### Changed

- Share prompt CTA copy aligned with clipboard action ("Copy link" in all locales); suppressed while the shared-lock hash banner is visible.
- Footer Ko-fi tap target bumped to 44px on mobile with focus-visible parity.

## [1.17.2] - 2026-06-12

### Fixed

- PostHog error capture no longer reports iOS in-app browser noise (`Error: he`, DuckDuckGo `WKWebView` postMessage failures).

## [1.17.1] - 2026-06-12

### Fixed

- Locale switcher and suggest-bar no longer throw unhandled `TypeError: Failed to fetch` when the network is unavailable (offline, ad blocker, DNS failure).

## [1.17.0] - 2026-06-12

### Changed

- Support button moved from hidden top-right corner to an inline pill in the header bar — ore icon + "Toss an ore" label, visible in the natural reading flow on desktop and mobile.
- New ore icon asset with transparent background, trimmed to content.
- Ore glow shifted to deep royal blue across header pill, idle pulse animation, and footer strip hover.

### Fixed

- Removed web-presence `$pageview` ping that fired every 45 s on visible tabs, inflating pageview metrics ~12× during peak traffic. Real once-per-load pageviews are unaffected.

## [1.16.0] - 2026-06-11

### Changed

- Footer "Featured in" shows only PC Games (Buffed link removed from noscript fallback, JS-rendered footer, and JSON-LD `subjectOf`).

### Removed

- Makefile `serve` and `check-version` targets; `serve` npm dependency (88 packages); `PORT` / `SERVE_BIN` variables. Use `make preview` instead of `make serve`.

## [1.15.4] - 2026-06-11

### Changed

- Shortened header definition paragraph to prevent overlap with lang switcher and version on narrow viewports.
- Definition text vertically centered between the hero image title and the lang/version controls.

## [1.15.3] - 2026-06-11

### Changed

- Shortened the header definition paragraph so it no longer overlaps the lang switcher and version on narrow viewports.

## [1.15.2] - 2026-06-11

### Changed

- CI workflow fires on pull requests only; deploy workflow handles push-to-main (no more duplicate runs).
- Branch protection on `main`: require `ci` status check, block direct/force pushes, enforced for admins.
- Docs (AGENTS.md, README, release skill) updated for PR-based workflow.

## [1.15.1] - 2026-06-11

### Fixed

- Cold-landing layout shift from the tour opt-in chip injecting on a second paint (Web Vitals CLS).

### Changed

- Boot startup split into pure landing policy (`src/startup.js`), DOM event binding, and phase-ordered appliers; cold chip eligibility lives in `onboarding.enterColdLanding()`.

## [1.15.0] - 2026-06-11

### Added

- Vite 6 production build (`vite build` → `dist/`) with separate chunks for onboarding and analytics.
- GitHub Actions CI (Biome lint + tests) and Pages deploy workflow.
- `public/` symlinks so dev and build serve `assets/`, `locales/`, and root static files.
- Self-hosted Cinzel WOFF2 fonts — no Google Fonts round trip on first load.
- Lazy onboarding how-to image (WebP) via `src/how-to-map-image.js`.
- `src/onboarding-stub.js` — placeholder until the onboarding chunk loads on cold landing.
- `src/analytics/posthog-init.js` — PostHog stub + deferred SDK load after first paint.
- Footer FAQ (`<details>`) with three common questions in en/de/pl/ukr.
- `hreflang` alternates for en, de, pl, uk, and x-default.
- `AGENTS.md`, Cursor rule, and `stop` hook (`make lint && make test` after agent turns).
- Biome linter (`biome.json`) replacing ESLint.

### Changed

- SEO title and meta repositioned as **Gothic Remake Lockbreaker — Free Lockpicking Calculator**; JSON-LD `alternateName` for Gothic Remake Lockbreaker / Gothic Remake Lock Breaker.
- `llms.txt` branding aligned with Gothic Remake Lock Breaker naming.
- English locale bundled in `i18n.js`; de/pl/ukr still fetched on demand.
- Analytics and onboarding load via dynamic `import()` after first render.
- Footer layout: support strip, press mentions, FAQ, then version and issues.
- `Makefile`: `dev`, `build`, `preview`, `clean`; README updated for Vite workflow.
- Deploy docs: GitHub Pages source must be **GitHub Actions**, not branch root.

### Removed

- ESLint and `eslint.config.js`.

## [1.14.3] - 2026-06-11

### Added

- `src/analytics/web-presence.js` — 45s visibility `$pageview` ping so Web Analytics Live stays accurate during long solves (replaces autocapture activity).
- `runWhenPostHogReady` in `transport.js`; `landing` waits for SDK `loaded`.

### Changed

- Re-enabled SDK `capture_pageview: true` (one pageview on load with full `$current_url` / referrer metadata).
- Removed duplicate manual `$pageview` from `trackLanding` (was incomplete and raced SDK init).

## [1.14.2] - 2026-06-11

### Added

- `src/analytics/attribution.js` — first-touch `referrer`, `referrer_host`, and UTM params on `landing` and session props.
- One manual `$pageview` per session (with `$referring_domain`) so PostHog Web Analytics Live referrers stay populated while auto pageviews remain off.

## [1.14.1] - 2026-06-11

### Added

- `is-near-slot` on walkthrough readout holes 2 and 6; CSS contract test for moving-hole glow styles.

### Changed

- Walkthrough sequence panel: unified solid-fill active pins (parchment safe, amber near-edge, bronze notch, red wall).
- Moving pin on the current step: slow outer `drop-shadow` pulse per danger state; static halo under `prefers-reduced-motion`.
- Inactive groove landmarks (notch, wall, near-edge slots): faint rim and dim label so empty slots do not read as active pins.

## [1.14.0] - 2026-06-11

### Added

- Tutor **opt-in chip** (bottom-left) instead of auto-starting the tour on cold landing.
- `no_path` failure hint and **Open guide** button (`guide_opened` with `failure_no_path` source); en/de/pl/ukr copy.
- `walkthrough_session_summary` — one aggregated event per session instead of per-step navigation spam.
- `src/walkthrough-summary.js` with `pagehide` flush from solve controller.

### Changed

- Solve failure UX: scroll solution panel on all outcomes, `aria-live` on failure messages.
- Locale suggest bar moved to **top of page**; visible during onboarding; decline stored in **sessionStorage** only.
- PostHog lean init: autocapture, pageview/pageleave, performance/web vitals, session replay, surveys, heatmaps, rageclick, dead clicks, and feature flags disabled; `stopSessionRecording` on load.
- Removed high-volume custom events: `walkthrough_step_changed`, `walkthrough_ui_toggled`, `onboarding_step_viewed`, `tutor_next_clicked` (funnel covered by `onboarding_dismissed` / `tutor_skipped`).

## [1.13.2] - 2026-06-10

### Added

- `llms.txt` comparison table, “why players use” bullets, and query-shaped FAQ for beginner/best-tool LLM queries.
- JSON-LD `featureList` on `WebApplication` (compact UI, walkthrough, mobile, free).

### Changed

- SEO title/description, `app.definition`, and meta tags emphasize beginner-friendly compact UI and step-by-step walkthrough (en/de/pl/ukr).
- `llms.txt` preferred citation and press blurbs highlight ease of use and mobile support.
- `check-seo.js` guards comparison section, beginner positioning, and `featureList`.

## [1.13.1] - 2026-06-10

### Added

- Footer **Featured in PC Games · Buffed** linking to German press coverage of the solver.
- Expanded `llms.txt` for AI crawlers: press links, FAQ, localized URLs, preferred citation.
- Page-head link to `llms.txt`; JSON-LD `subjectOf` (PC Games, Buffed articles), `HowTo`, and language metadata on `WebApplication`.
- `scripts/check-seo.js` — CI guard for press URL parity, JSON-LD validity, and `llms.txt` / `sitemap.xml` dates vs changelog.

### Changed

- README badges: PC Games and Buffed replace Reddit.
- Reddit removed from `index.html` structured data (`sameAs`); historical Reddit link kept in `llms.txt` only.

## [1.13.0] - 2026-06-10

### Added

- Locale suggest bar for first-time English-default visitors: opt-in DE/PL switch from referrer hints (`pcgames.de`, `buffed.de`, `gamestar.de`, `ithardware.pl`) or async PostHog geo (`DE` / `AT` / `CH` / `PL`).
- `src/locale-suggest.js`, `src/analytics/geo-hint.js`; `renderLocaleSuggest` UI with English prompt copy.
- PostHog `locale_suggest_shown`, `locale_suggest_accepted`, `locale_suggest_declined`; `LocaleChangeSource.SUGGEST_BAR`; `LocaleSource.SUGGEST` on accept.
- `StorageKeys.LOCALE_SUGGEST_DISMISSED`; `localeSuggest` strings in `locales/en.json`.
- Composition-root refactor: `solve-controller`, `lock-controller`, `locale-chrome-controller`, `app-renderer`, `ui-prefs`, `landing`, `app-elements`.

### Changed

- `app.js` is the composition root only; lock/solve/locale chrome logic moved into dedicated controllers.
- `setLocale` accepts `changeSource` and `localeSource` for switcher vs suggest-bar tracking.
- Onboarding and solve coachmark defer the locale suggest bar (same as i18n quality banner).
- i18n quality banner shows only on translated locales and stays hidden while locale suggest is visible.

### Fixed

- Geo locale hint is stored during onboarding/coachmark deferral and shown when eligible; geo poll retries after timeout.
- Locale suggest uses `role="region"` instead of misused `role="dialog"`.

## [1.12.2] - 2026-06-10

### Added

- PostHog i18n instrumentation: `locale_resolved` (initial query/storage/default resolution), `i18n_banner_shown`, and `locale` + `locale_source` on `landing`; `locale_changed` includes `source: switcher`, `change_direction`, and `locale_switch_count`.
- `locale_session_end` on page hide with `staying_on_translation` and `reverted_to_default` for retention vs revert analysis.
- Session super-properties `initial_locale`, `initial_locale_source`, `ever_used_translation`, and `ever_reverted_to_default`.
- `support_link_clicked` with `source: i18n_banner` for the translation-feedback GitHub link.
- `Locale` constants in `src/i18n.js`; query `?lang=` persistence; canonical and `og:url` sync on locale switch; sitemap entries for localized URLs.

### Changed

- Locale switcher mounts once and updates in place (perf and keyboard focus).
- Solve coachmark and onboarding defer the i18n translation banner until they finish.

### Fixed

- Bootstrap survives failed non-English catalog fetch (falls back to English UI).
- `locale` session property now registers on bootstrap (after `initI18n`), not only on switcher click — deeplink and stored-locale sessions are segmentable from the first event.

## [1.12.1] - 2026-06-10

### Added

- Ukrainian (`ukr`) locale: Tier C prose, UA flag in header switcher, `hreflang` and SEO meta (`?lang=ukr`).

## [1.12.0] - 2026-06-10

### Added

- Hybrid i18n (v1): German and Polish Tier C prose; English frozen for compact UI chips (`With` / `Against` / `Gone`, solve CTA, nav, mastery pills, turn labels).
- Header language switcher with inline SVG flags (GB / DE / PL); opt-in only — English default, no browser auto-detect.
- `locales/en.json`, `locales/de.json`, `locales/pl.json`; `src/i18n.js`, `src/static-content.js`, `src/locale-switcher.js`.
- Dynamic SEO meta and `hreflang` alternates on locale switch (`en-GB` / `de` / `pl` on `<html lang>`).
- PostHog `locale_changed` event and `locale` session property.

### Changed

- Footer **Discuss on Reddit** replaced with **Report an issue** (GitHub Issues).
- Onboarding and solve coachmark use measured card height for mobile scroll margins.
- Solve button and sequence minimap label CSS hardened for longer translated copy.

## [1.11.5] - 2026-06-10

### Changed

- Social preview image: dedicated footer band with **Gothic Lock Breaker** title and **Break the Lock** CTA, Cinzel typography, and anchor-based alignment (1200×630).
- Added `scripts/generate-og-image.py`, `assets/og-screenshot-source.png`, and bundled Cinzel font for reproducible OG image builds.

## [1.11.4] - 2026-06-10

### Changed

- Social and search metadata: shorter title (~53 chars) and description (~121 chars) so Google, X, and LinkedIn previews do not truncate.
- Open Graph: `og:site_name`, dedicated `assets/og-image.png` at 1200×630 (1.91:1), and `og:image:width` / `og:image:height`; Twitter card uses the same image.

## [1.11.3] - 2026-06-09

### Fixed

- PostHog error capture: re-entrancy guard stops capture feedback loops; cross-origin `Script error.` and iOS `showSearchResults` noise are no longer reported.

### Changed

- PostHog ingestion uses the `e.gothiclockbreaker.com` reverse proxy (`ui_host` still EU).

## [1.11.2] - 2026-06-09

### Changed

- Header support ore: subtle slow blue glow pulse; pauses on link hover/focus.

## [1.11.1] - 2026-06-09

### Removed

- Hash-arrival banner **How to map your own lock** link — guide stays in Section II; **Open guide** remains on solve failure.

## [1.11.0] - 2026-06-09

### Added

- Custom domain `gothiclockbreaker.com` via GitHub Pages `CNAME` and Cloudflare DNS.

### Changed

- Canonical, Open Graph, Twitter, JSON-LD, `sitemap.xml`, `robots.txt`, and `llms.txt` now point at `https://gothiclockbreaker.com/`.
- README play badge and solver link use the custom domain.

## [1.10.0] - 2026-06-09

### Added

- On-page and social SEO: document title, meta description, canonical URL, Open Graph / Twitter cards, and JSON-LD `WebApplication` schema.
- `llms.txt`, `robots.txt`, and `sitemap.xml` for search and AI crawlers.
- Footer **Discuss on Reddit** link and README badge; `REDDIT_DISCUSS_URL` in `src/version.js`.

### Changed

- Hero scrim: removed duplicate tagline over in-image title; kept a single SEO definition line plus version badge.

### Fixed

- Mobile solution walkthrough no longer scrolls horizontally — walkthrough grids use `minmax(0, 1fr)` and clip overflow on narrow screens.

## [1.9.0] - 2026-06-09

### Added

- `src/analytics/values.js` and `src/storage-keys.js` — frozen enums for analytics property values and localStorage keys (no magic strings in touched modules).
- Deferred **solve coachmark** for cold visitors: one-shot spotlight on **Break the Lock** when the lock first becomes mappable (`solve_coachmark_seen_v1`); shown only after the onboarding tour ends if mapping completes during steps 3–4.
- `failure_reason` on `lock_no_solution` (`oob_start` vs `no_path`) with differentiated recovery UI and **Open guide** on unsolvable paths.
- `is_first_solve` property on first `lock_solved` per browser.
- Onboarding dismiss key bumped to `onboarding_dismissed_v3` so prior v2 skippers see the tour again.

### Changed

- Share prompt dismisses only after a successful copy; banner scrolls into view after solve.
- Mobile touch targets: plate holes and toolbar icons at least 44px at ≤768px.
- Hash and example auto-solve scroll the sequence panel into view.

### Fixed

- Share prompt no longer dismisses when clipboard copy fails.

## [1.8.5] - 2026-06-09

### Added

- Header **ore** link (icon-only, top-right on hero) — Gothic tooltip on hover/focus; opens Ko-fi. Footer support strip unchanged.
- PostHog `support_link_clicked` source `header_ore` for header placement.

## [1.8.4] - 2026-06-09

### Changed

- Footer **Tip jar** replaced with a visible support strip: ore icon (`assets/ore.webp`), **Toss an ore** CTA, and **Keeps the solver free** subline — bronze banner styling, distinct from the version badge.
- PostHog `support_link_clicked` source updated to `footer_strip`.

## [1.8.3] - 2026-06-09

### Added

- Optional **Tip jar** link in the footer (Ko-fi) and README badge row — voluntary tips for support and upkeep; solver stays free.
- PostHog event `support_link_clicked` when the footer tip link is opened.
- Header **hero** background (`assets/hero.webp`) — compact band with tagline and version overlaid on a bottom scrim; artwork title in-image; `<h1>` for screen readers only.

## [1.8.2] - 2026-06-09

### Changed

- **Share lock** moved to Section III only: post-solve banner is the sole share affordance (shown after a walkthrough with steps).
- Share banner dismiss is session-scoped — re-solve brings it back; permanent localStorage dismiss removed.
- **Wipe lock** stays in Section I; toolbar still hidden on the pristine default lock.

### Removed

- Section I **Share lock** button and `.controls-share` styles.

## [1.8.1] - 2026-06-09

### Changed

- **Share lock** and **Wipe lock** toolbar icons hidden until the lock differs from the default setup (6 plates, untrained, no couplings, pins at notch).

## [1.8.0] - 2026-06-09

### Added

- **Lockpicking tier** selector (Untrained / Trained / Master) with inline mistake-budget note; plate physics unchanged across tiers.
- **Master pick-break modeling**: stepper for picks snapped and per-coupling **Gone** control on tumbler cards; solver uses `effectiveMatrix()` with dropped links cleared.
- Walkthrough **Something off?** link with troubleshooting checklist in a mobile bottom sheet / desktop dialog (backdrop, Escape, auto-close on step change).
- Optional URL hash segments for mastery tier, break budget, and removed-link mask (legacy 3-part links still work).
- Analytics: `mastery_tier_changed`, `step_mismatch_clicked`.
- Onboarding tour: 4 steps (mastery tier, plate count, start holes, couplings) with fixed spotlight targets.
- Tests: store hash round-trip, mastery `effectiveMatrix`, onboarding targets, view module smoke.

### Changed

- Wipe lock resets mastery tier and Master link removals.
- Guide documents Fingers training tiers and Master link-removal workflow.
- Onboarding dismiss key bumped to v2 so the updated tour can show after the mastery UI landed.
- **Locks** count control grouped under its own label in the controls footer.

## [1.7.0] - 2026-06-09

### Added

- PostHog UX analytics: mapping (`lock_became_mappable`, `example_lock_loaded`, `guide_opened`), walkthrough (`walkthrough_step_changed`, `walkthrough_ui_toggled`), tutor (`tutor_started`, `tutor_not_shown`, `tutor_next_clicked`, `tutor_skipped`), and prompt dismissals (`prompt_dismissed`, `share_link_copy_failed`).
- `solve_source` on solve-outcome events (`manual`, `hash`, `example`); `landing_type` and `app_version` as PostHog super properties.
- Enriched `onboarding_dismissed` with `step_id`, `step_index`, `action`, and `total_steps`.

### Changed

- README analytics section updated for expanded event coverage.

### Removed

- Dead `lock_solve_blocked` event (solve button is disabled until lock is mapped).

## [1.6.1] - 2026-06-09

### Fixed

- Mobile onboarding coach marks on steps 2–3: spotlight and scroll now target Lock 1 correctly instead of leaving controls hidden under the sticky sequence panel.

## [1.6.0] - 2026-06-09

### Added

- First-visit coach marks (3 steps) with mobile bottom-sheet layout; skipped on mapped hash arrivals.
- Collapsible **How to map your lock** guide with annotated in-game screenshot and Old Camp example lock.
- Hash arrival auto-solve for shared, mapped locks plus dismissible banner.
- Solve readiness gate: **Break the Lock** disabled until a coupling or start hole is set.
- Split analytics events: `landing`, `solve_button_clicked`, `lock_already_solved`, `lock_solve_blocked`, onboarding and share-prompt events.
- One-time share prompt after first successful solve; **Share lock** control with text label.
- Lightweight client error capture to PostHog on production.

### Changed

- Shorter tumblers panel note; With/Against disambiguation in guide.
- Mobile: sticky solve button (≤768px), larger coupling chip touch targets.

### Fixed

- First-map transition (example button, first coupling or pin) no longer crashes render with stack overflow while still updating the URL hash.

## [1.4.0] - 2026-06-08

### Added

- PostHog EU analytics: pageviews and autocaptured clicks on production; custom events for solve result, share-link copy, and lock wipe.
- `src/analytics/` module — layered facade (`events`, `transport`, `track`, `index`); PostHog isolated to `transport.js`, init in `index.html`.
- Analytics disabled on `localhost` / `127.0.0.1` during local dev.

### Changed

- README: architecture table and short analytics section.

## [1.3.3] - 2026-06-08

### Changed

- Section III walkthrough: the lock being turned this step is highlighted with a bronze border and glow on its row, matching the focus card.

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
