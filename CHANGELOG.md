# Changelog

All notable changes to Gothic Lock Breaker are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Release rule:** bump `VERSION` in `src/version.js`, add a dated entry below,
and update the `Current release` line in `README.md` — one commit, one deploy.

## [1.36.1] - 2026-07-18

### Removed

- Internal catalog bootstrap tooling and unused entry fields. Catalog data remains the checked-in first-party JSON.

## [1.36.0] - 2026-07-18

### Added

- Browse locks: open a searchable catalog of named in-game locks, filter by place, load one into the solver, and deep-link with `?lock=<id>`.
- When a catalog lock would replace mapped work or an active solution, confirm before overwriting.
- After loading from the catalog, The Sequence panel shows the lock name and place.

### Changed

- Browse locks and Reset lock use clear icons; on narrow screens they collapse to icon-only buttons on the same row as the lock-count pills.
- Catalog place filter is a single dropdown (not a wall of chips), with result count and Clear filters / Retry recovery actions.

### Fixed

- Reset lock now opens its confirm dialog again.
- Choosing a catalog lock while you already have work no longer looks like a dead tap — the replace confirm was rendering behind the sheet.
- Minimizing The Sequence no longer shows `[object Object]` in the step counter.

## [1.35.2] - 2026-07-03

### Changed

- Community feedback routing: GitHub Discussions replaced with the [r/worldofgothic launch thread](https://www.reddit.com/r/worldofgothic/comments/1tz9wwa/i_built_a_lockpicking_solver_for_gothic_1_remake/) in README, CONTRIBUTING, and issue templates.

## [1.35.1] - 2026-06-29

### Added

- GitHub issue templates for bugs, translation fixes, and feature ideas — footer **Report an issue** opens the chooser; the translation banner links straight to the translation form.
- [CONTRIBUTING.md](CONTRIBUTING.md) — where to report problems, privacy rules (no lock URL in issues), and how to open a PR.

### Changed

- README adds a **Feedback & issues** section (templates, Discussions, Ko-fi).

## [1.35.0] - 2026-06-29

### Added

- "NEW" badges now flag recently-added features for returning players: if a feature shipped after your first visit, its button wears a small "NEW" pill until you open it. First-time visitors don't see them, so the cue only points at what's genuinely new to you. The keyboard shortcuts panel is the first feature to carry one.

## [1.34.0] - 2026-06-29

### Added

- Full keyboard control: map a lock without touching the mouse — arrow keys move the start hole and cycle a coupling, number keys set the start hole directly, and you can switch plates, break the lock, and tab between controls all from the keyboard.
- Keyboard navigation for the solution walkthrough — step forward and back through the moves with the arrow keys.
- A "Keyboard shortcuts" help panel, reachable from a header hint or a shortcut key, listing every walkthrough and mapping shortcut.

## [1.33.1] - 2026-06-29

### Changed

- Internal-only restructure of the source tree into cohesive subsystems and a split of the single stylesheet into cascade-ordered partials. No gameplay, solver, UI, or URL changes — this release exists purely as a clean rollback point for the reorganization.

## [1.33.0] - 2026-06-28

### Changed

- Polished the step-by-step sequence: the current turn now shows as a large, prominent step number alongside a clear "X / total" counter, and finishing every turn plays a small animated open-lock icon instead of a plain done count.
- Removed the redundant turn-count banner above the walkthrough; the solve result is now announced to screen readers as you reach it.
- Moved the "something feels off?" help link onto its own row beneath the current move so it no longer crowds the step counter.
- The thank-you / support prompt now appears once you're most of the way through a walkthrough rather than the instant a solution loads, so it lands after the tool has actually helped you.
- Lock-position warnings now use border style as well as color — a thick solid ring when a pin is against a wall and a dashed ring as it approaches one — so the danger cue stays visible for colorblind players.

## [1.32.3] - 2026-06-28

### Changed

- Hovering your selected camp banner now shows the camp's name in a styled Gothic tooltip that matches the rest of the header, instead of the browser's plain default tooltip.

## [1.32.2] - 2026-06-28

### Changed

- Refreshed the screaming Nameless Hero portrait (the face that appears when you hover the camp banner) and matched its styling to the calm face, dropping an inconsistent shadow.

### Fixed

- The Nameless Hero portrait no longer flickers while swapping from the calm to the screaming face on hover.

## [1.32.1] - 2026-06-28

### Fixed

- The camp banners (Old, New, and Swamp Camp) now render at higher resolution, so they stay crisp on high-DPI / Retina screens instead of looking soft.

## [1.32.0] - 2026-06-28

### Changed

- Refreshed the Old Camp, New Camp, and Swamp Camp banner artwork with higher-detail designs.
- The camp picker now speaks in faction terms — "Join a camp", "Choose your camp", "Join the Old Camp", "Leave the camps" — instead of the old generic "theme" wording.
- The neutral (no camp) banner is brighter so it clearly reads as a tappable control rather than a disabled placeholder.
- The "pick your camp" nudge now reappears on later visits (up to three sessions) until you open the picker, stays visible a little longer, and no longer disappears the instant you scroll on mobile.

### Fixed

- Hovering the Swamp Camp banner no longer floods it with green — the glow now stays as a clean outer halo, keeping the banner readable.

## [1.31.0] - 2026-06-28

### Removed

- Removed the "share this lock" feature. Usage data showed it was effectively dead — only ~0.7% of players who solved a lock ever copied a share link — so the post-solve share button and its prompt are gone. Solving, the step-by-step walkthrough, language switching, and opening a shared link someone sends you all keep working.

## [1.30.2] - 2026-06-26

### Fixed

- Fixed a rare crash that could occur when changing the language while the language menu was still open, which left the picker briefly unresponsive.

## [1.30.1] - 2026-06-24

### Changed

- Trimmed background usage analytics to a leaner set of events so the tool stays comfortably within its usage limits. No effect on solving, sharing, the step-by-step walkthrough, mastery selection, or language handling.

## [1.30.0] - 2026-06-23

### Added

- The donate buttons now show a short hint on hover explaining that an optional tip keeps the solver free and ad-free.

### Changed

- Shortened the support prompt shown after you solve a lock to a brief "keeps it free & ad-free" line, so it stays out of the way of the turn sequence.

### Fixed

- Corrected the Ukrainian wording describing how plates are positioned in the How-to-map guide.

## [1.29.0] - 2026-06-21

### Added

- German, Polish, and Ukrainian now have their own dedicated pages at `/de/`, `/pl/`, and `/uk/`, with translated titles, descriptions, and content baked into the HTML at build time. Search engines and AI tools can index the localized pages directly, so players land on a page already in their language instead of the English one.

### Changed

- Visiting `/de/`, `/pl/`, or `/uk/` now keeps the page in that language after it finishes loading, instead of briefly showing the translation and then snapping back to English.

### Fixed

- Lock artwork, camp banners, and the How-to-map diagram no longer appear broken on the German and Polish pages.
- The How-to-map diagram's callout labels (for example "Lock 6 · back") no longer overflow the image or overlap each other when shown in German or Polish.

## [1.28.2] - 2026-06-21

### Fixed

- Error reporting no longer treats bare "No response" promise rejections — background noise from browser extensions and aborted requests — as real errors, so the error feed stays focused on genuine app failures.

## [1.28.1] - 2026-06-21

### Changed

- Retuned the neutral, no-camp look from warm bronze/gold to a calmer steel-grey, giving the default state its own identity instead of borrowing the Old Camp's gold.
- Translucent accents — glows, hover fills, focus rings — now follow the active camp's colour everywhere, so switching camps re-tints the whole UI consistently instead of leaving stray gold highlights.
- Warmed and brightened the Old Camp gold so its palette reads as distinctly Old Camp.

## [1.28.0] - 2026-06-21

### Added

- A one-time, gentle hint now points out that the neutral header banner is a clickable **camp theme switcher**: the pennant softly pulses and its tip swaps to "Pick your camp" so first-time visitors notice the feature. It shows only when no camp is picked, never competes with the onboarding tour or the solve coachmark, and disappears for good once you interact with it or choose a camp. Localized across English, German, Polish, and Ukrainian.

## [1.27.0] - 2026-06-21

### Changed

- The **camp banner picker** is now a proper centered dialog: a dark scrim dims the page, each faction's banner shows under its name, and hovering a banner lights it with that camp's own colour so a pick feels deliberate. Leaving the camps is now its own blank-pennant "No Camp" banner instead of a stray text button, so the choices read as one coherent rack. Keyboard and focus handling are tighter — Escape and outside clicks close it, and focus returns to the trigger. Localized across English, German, Polish, and Ukrainian.
- Refreshed the Old Camp, New Camp, and neutral banner artwork.

## [1.26.0] - 2026-06-20

### Added

- A **camp banner theme switcher** in the header: pick the Old Camp, New Camp, or Swamp Camp and the whole site re-tints to that faction's colours, with a smooth transition. Your choice is remembered between visits. The neutral state shows the Nameless Hero, who mutters his predicament on hover ("Damn... I belong to no camp?") and opens the camp picker when clicked. Camp names and all picker labels are localized across English, German, Polish, and Ukrainian.

## [1.25.2] - 2026-06-19

### Changed

- The page title and description now lead with **"Lockpick Solver"** — matching how players actually search — instead of calling the tool a "calculator" it explicitly out-performs.

### Fixed

- Error reporting no longer leaks known browser and extension noise that arrives with a PostHog `Error:`/`TypeError:` type prefix — ignore patterns now match both the bare message and the prefixed form.

## [1.25.1] - 2026-06-19

### Changed

- The "share this lock" prompt now appears at most once per visit, and only after a genuinely tricky solve (a long solution, or a lock you cracked after a dead end) — instead of after every solve. Its button is honest about what it does ("Copy link for a friend"), the prompt reads "Stuck friend? Copy this exact lock and send it to them.", and it lays out cleanly without clipping the label. Localized across English, German, Polish, and Ukrainian. The post-solve tip-ore button is unaffected.

### Fixed

- Before a lock is solved, the mapping instructions no longer repeat themselves — you now see a single, concise hint instead of two near-identical lines.

## [1.25.0] - 2026-06-19

### Changed

- The help sections — **How to map your lock**, **Lockpicking Guide**, and **About this tool** — now open as centered modal dialogs with their own title and close (×) button, and the button you clicked stays in place instead of turning into the modal and disappearing. Close via the × button, the backdrop, or Escape. Added a localized **Close** label across English, German, Polish, and Ukrainian.

### Fixed

- The info icon in the **About this tool** button is now optically centered with its all-caps label.

## [1.24.1] - 2026-06-18

### Fixed

- On phones the language dropdown is no longer hidden behind the lock — the menu now renders above it.

## [1.24.0] - 2026-06-18

### Changed

- The in-app **Lockpicking Guide** is no longer a wall of text. Couplings are now a With / Against / None definition list, the puzzle mechanics and hard-lock tips are scannable bullet lists, and each section is separated for easier reading. Body copy uses higher contrast and looser line spacing. Localized across English, German, Polish, and Ukrainian.

## [1.23.1] - 2026-06-18

### Changed

- On phones the Sequence panel stays hidden until you actually map a lock (set a coupling or move a pin), so the bottom bar no longer takes up space before there's anything to solve. It now rises into view instead of popping in.

### Fixed

- A partially mapped lock no longer claims "Lock mapped — crack it open." The ready hint only shows once the lock is fully mapped; partial maps keep the mapping guidance.

## [1.23.0] - 2026-06-18

### Added

- **Gothic language dropdown** — the four flag buttons collapse into a single accessible listbox showing the active flag and short code (EN / DE / PL / UKR), with full keyboard support (arrow keys, Home/End, Enter, Escape, Tab) and screen-reader labels.
- **Help sections open as modals** — "How to map your lock" and the Lockpicking Guide now overlay the page instead of pushing it down, with a more distinguished circular close button.

### Changed

- Consistent hover feedback across every interactive control — pills, link chips, holes, the Break/Next buttons, and the help links — on pointer devices.
- Header language dropdown, tip-ore button, and version badge aligned to a uniform height and spacing.
- Tumbler reference moved to a per-card legend; the Tumblers panel note rewritten as a scannable bullet list.

## [1.22.0] - 2026-06-18

### Added

- New header portrait beside the Sleeper: a Gothic medallion that swaps to a screaming face on hover with the taunt "Really? Is that all you got?" (localized for German, Polish, and Ukrainian), linking to the tip jar.

## [1.21.3] - 2026-06-17

### Changed

- Header definition text brightened to full parchment for better contrast against the backdrop.
- Section titles dropped the Roman-numeral prefixes (I/II/III) to cut visual noise.
- Lockpicking tier description reformatted from a paragraph into a scannable bullet list.
- "Wipe lock" control relabeled **Reset lock** with a text button (no more ambiguous trash icon); confirm dialog copy updated to match.
- Sequence **Share** and **Tip ore** moved to their own full-width row, keeping text labels so they no longer truncate on mobile.

## [1.21.2] - 2026-06-17

### Fixed

- Onboarding spotlight no longer throws when the tour is skipped or advanced during mobile scroll (`Cannot set properties of null (setting 'hidden')`).
- PostHog error tracking drops DuckDuckGo iOS `WKWebView` postMessage noise via a `before_send` exception filter (defense in depth on top of client-side ignore rules).

## [1.21.1] - 2026-06-17

### Added

- **Lighthouse CI** on pull requests — builds `dist/` and gates SEO score (≥ 90); reports accessibility, performance, and best-practices as warnings.

### Fixed

- Invalid `aria-expanded` on the sequence panel `<section>` (PageSpeed / Agentic Browsing).
- Support-link accessible names — footer uses visible copy; header ore link keeps `aria-label` when the label is hidden on mobile.
- Coupling chip contrast for the unset (`link-none`) state.
- Layout shift on first paint — reserve space for six default tumbler cards before JS hydrates `#tumblers`.

## [1.21.0] - 2026-06-17

### Added

- In-app **Gothic Remake Lockpicking Guide** — collapsed reference in II · Tumblers (puzzle mechanics, couplings, skill tiers, trainer, edge-safe solving, hard-lock tips); static HTML for crawlers, localized in en/de/pl/ukr.
- Visible inline **H1** in the header definition sentence (replaces hidden sr-only title).

### Changed

- Footer FAQ trimmed to four product questions under **About this tool**; game-mechanic Q&As live in the lockpicking guide instead.
- `llms.txt` — lockpicking guide summary for AI crawlers; FAQ aligned with footer.
- `<html lang="en">` (was `en-GB`); SEO checks for guide section, visible H1, and footer FAQ count.

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
