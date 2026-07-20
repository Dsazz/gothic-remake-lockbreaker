import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readViewSource, readStyles } from "./read-sources.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("src JS references assets with root-absolute paths (subpath-safe for /de/ /pl/)", async () => {
  const entries = await readdir(join(root, "src"), { recursive: true });
  const offenders = [];
  for (const entry of entries.filter((f) => f.endsWith(".js"))) {
    const text = await readFile(join(root, "src", entry), "utf8");
    // Relative "assets/..." resolves against the current path, so it 404s on /de/ and /pl/.
    if (/["'`]assets\//.test(text)) offenders.push(entry);
  }
  assert.deepEqual(
    offenders,
    [],
    `use "/assets/..." (root-absolute) so prerendered subpaths load: ${offenders.join(", ")}`,
  );
});

test("how-to-map labels use foreignObject and stay wired to static-content selectors", async () => {
  const indexHtml = await readFile(join(root, "index.html"), "utf8");
  const staticContent = await readFile(join(root, "src", "i18n", "static-content.js"), "utf8");

  // Clipping fix: long DE/PL labels overflowed as SVG <text>; foreignObject lets the HTML wrap.
  assert.equal(
    (indexHtml.match(/class="map-label-fo"/g) || []).length,
    4,
    "expected 4 foreignObject map labels — reverting to <text> reintroduces locale clipping",
  );

  // Coupling guard: every class static-content.js localizes must exist in the markup,
  // otherwise the setMapLabel() selectors silently no-op and labels stay English.
  const selectors = [...staticContent.matchAll(/setMapLabel\(\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(selectors.length >= 4, "static-content.js no longer wires the map labels");
  const classes = [
    ...new Set(selectors.flatMap((sel) => sel.split(/\s+/)).map((part) => part.replace(/^\./, ""))),
  ];
  const missing = classes.filter((cls) => !indexHtml.includes(cls));
  assert.deepEqual(
    missing,
    [],
    `static-content.js targets classes absent from index.html: ${missing.join(", ")}`,
  );
});

test("browser modules parse without syntax errors", async () => {
  await import("../src/core/domain.js");
  await import("../src/core/store.js");
  await import("../src/core/solver.js");
  await import("../src/core/feature-badges.js");
  await import("../src/controllers/whats-new.js");
  await import("../src/view/index.js");
  await import("../src/view/links.js");
  await import("../src/analytics/values.js");
  await import("../src/storage/keys.js");
  await import("../src/onboarding/solve-coachmark.js");
  await import("../src/onboarding/spotlight-ring.js");
  await import("../src/onboarding/solve-coachmark-schedule.js");
  await import("../src/i18n/index.js");
  await import("../src/i18n/static-content.js");
  await import("../src/bootstrap/how-to-map-image.js");
  await import("../src/controllers/info-modal.js");
  await import("../src/onboarding/stub.js");
  await import("../src/analytics/posthog-init.js");
  await import("../src/i18n/locale-switcher.js");
  await import("../src/i18n/locale-suggest.js");
  await import("../src/analytics/geo-hint.js");
  await import("../src/storage/prefs.js");
  await import("../src/bootstrap/landing.js");
  await import("../src/controllers/solve.js");
  await import("../src/controllers/lock.js");
  await import("../src/controllers/locale-chrome.js");
  await import("../src/controllers/camp.js");
  await import("../src/bootstrap/app-renderer.js");
  await import("../src/bootstrap/app-elements.js");
  await import("../src/view/focus.js");
  await import("../src/controllers/keyboard.js");
  await import("../src/breakpoints.js");
});

test("footer links to GitHub issues, Reddit thread, and press coverage", async () => {
  const viewText = await readViewSource();
  const linksText = await readFile(join(root, "src/view/links.js"), "utf8");
  assert.match(viewText, /GITHUB_ISSUES_URL/);
  assert.match(linksText, /issues\/new\/choose/);
  assert.match(viewText, /GITHUB_TRANSLATION_ISSUE_URL/);
  assert.match(linksText, /template=translation\.yml/);
  assert.match(viewText, /PRESS_PCGAMES_URL/);
  // Reddit footer link was removed in v1.12.0 (replaced by "Report an issue") and
  // re-added here as an active community/update channel — not the same historical
  // link that v1.13.1 demoted to llms.txt-only. Reuses REDDIT_THREAD_URL (JSON-LD
  // sameAs since v1.37.0), not the retired REDDIT_DISCUSS_URL constant.
  assert.match(viewText, /REDDIT_THREAD_URL/);
  assert.match(viewText, /footerIssuesLink/);
  assert.match(viewText, /footerRedditLink/);
  assert.match(viewText, /footerUtility/);
  assert.match(viewText, /app-foot-stack/);
  assert.match(viewText, /app-foot-band/);
  assert.match(viewText, /app-foot-utility/);
  assert.match(viewText, /pressMentionsLine/);
  assert.match(viewText, /footerFaq/);
  assert.match(viewText, /footer\.faq\.q1/);
  assert.match(viewText, /footer\.issues/);
  assert.match(viewText, /footer\.reddit/);
  assert.match(viewText, /press\.pcgames/);
});

test("tour opt-in start does not re-render controls and orphan step 1 spotlight", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const rendererText = await readFile(join(root, "src/bootstrap/app-renderer.js"), "utf8");
  const onStart = appText.slice(
    appText.indexOf("onTutorOptInStart"),
    appText.indexOf("onTutorOptInDismiss"),
  );
  assert.doesNotMatch(onStart, /renderAll\(store\.getState\(\)\)/);
  assert.match(onStart, /renderTutorChip\(\)/);
  assert.match(rendererText, /function renderTutorChip/);
});

test("app defers solve coachmark until onboarding tour ends", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const solveText = await readFile(join(root, "src/controllers/solve.js"), "utf8");
  const onboardingText = await readFile(join(root, "src/onboarding/tour.js"), "utf8");
  assert.match(appText, /flushPendingCoachmark/);
  assert.match(solveText, /pendingSolveCoachmark/);
  assert.match(solveText, /flushPendingCoachmark/);
  assert.match(solveText, /resolveSolveCoachmarkTrigger/);
  assert.match(solveText, /onboarding\.isActive\(\)/);
  assert.match(onboardingText, /isActive:\s*\(\)\s*=>\s*active/);
});

test("camp hint re-shows per session, neutral-only, deferred past tour/coachmark, and is instrumented", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const campText = await readFile(join(root, "src/controllers/camp.js"), "utf8");
  const uiPrefsText = await readFile(join(root, "src/storage/prefs.js"), "utf8");
  const css = await readStyles();

  // Persistence: re-show gating (picker-opened + per-session + lifetime cap)
  // replaces the old one-time seen flag.
  assert.match(uiPrefsText, /isCampPickerOpened/);
  assert.match(uiPrefsText, /markCampPickerOpened/);
  assert.match(uiPrefsText, /recordCampHintShown/);
  assert.match(uiPrefsText, /wasCampHintShownThisSession/);
  assert.match(uiPrefsText, /campHintShownCount/);
  assert.doesNotMatch(uiPrefsText, /isCampHintSeen|markCampHintSeen/);

  // Controller owns the visual + dismissal lifecycle and the CTA copy, and
  // surfaces the funnel through injected callbacks (no analytics import).
  assert.match(campText, /showHint/);
  assert.match(campText, /hideHint/);
  assert.match(campText, /camp\.hintCta/);
  assert.match(campText, /onHintShown/);
  assert.match(campText, /onPickerOpened/);
  // Decoupled: enums are fine, but no analytics transport/track calls here.
  assert.doesNotMatch(campText, /trackCamp|analytics\/track|analytics\/index/);
  // Scroll must not dismiss the hint (mobile users scroll within ~1-2s of paint).
  assert.doesNotMatch(campText, /"scroll",\s*hideHint/);

  // App owns the gating: picker-opened + per-session + lifetime cap, neutral
  // state, and no competing nudges.
  assert.match(appText, /maybeShowCampHint/);
  assert.match(appText, /uiPrefs\.isCampPickerOpened\(\)/);
  assert.match(appText, /uiPrefs\.wasCampHintShownThisSession\(\)/);
  assert.match(appText, /uiPrefs\.campHintShownCount\(\) >= CAMP_HINT_MAX_SESSIONS/);
  assert.match(appText, /uiPrefs\.recordCampHintShown\(\)/);
  assert.match(appText, /campSelector\.getCamp\(\) !== null/);
  assert.match(appText, /solveCoachmark\?\.isActive\(\)/);
  assert.match(appText, /onboarding\?\.isActive\?\.\(\)/);
  // Opening the picker is persisted (suppresses future hints) and tracked.
  assert.match(appText, /uiPrefs\.markCampPickerOpened\(\)/);
  assert.match(appText, /trackCampHintShown/);
  assert.match(appText, /trackCampPickerOpened/);

  // CSS reveal plus a reduced-motion guard for the pulse.
  assert.match(css, /\.camp-trigger--neutral\.is-hinting \.camp-hero-tip/);
  assert.match(css, /@keyframes camp-hint-pulse/);
  assert.match(
    css,
    /prefers-reduced-motion: reduce[\s\S]*\.camp-trigger--neutral\.is-hinting \.camp-banner-img\s*\{\s*animation:\s*none/,
  );

  // Tier C parity: the CTA exists in every locale.
  for (const code of ["en", "de", "pl", "ukr"]) {
    const locale = JSON.parse(await readFile(join(root, `locales/${code}.json`), "utf8"));
    assert.ok(locale.camp.hintCta, `camp.hintCta missing in ${code}.json`);
  }
});

test("active camp trigger names the camp via a styled tip, not a native title", async () => {
  const campText = await readFile(join(root, "src/controllers/camp.js"), "utf8");
  const css = await readStyles();

  // The active visual renders the styled tip with the camp's name; the native
  // `title` tooltip is gone (replaced by .camp-trigger-tip).
  assert.match(campText, /campTip\(campName\(camp\)\)/);
  assert.match(campText, /class: "camp-trigger-tip"/);
  assert.doesNotMatch(campText, /\btitle:/);

  // CSS reveals the active tip on hover and keyboard focus.
  assert.match(css, /\.camp-trigger--active:hover \.camp-trigger-tip/);
  assert.match(css, /\.camp-trigger--active:focus-visible \.camp-trigger-tip/);

  // The old title key is fully retired across every locale.
  for (const code of ["en", "de", "pl", "ukr"]) {
    const locale = JSON.parse(await readFile(join(root, `locales/${code}.json`), "utf8"));
    assert.ok(!locale.camp.changeTitle, `camp.changeTitle should be removed from ${code}.json`);
  }
});

test("header sleeper support link tracks header_sleeper source", async () => {
  const viewText = await readViewSource();
  const start = viewText.indexOf("export function renderHeadSleeper");
  const end = viewText.indexOf("export function renderHeadSupport");
  const body = viewText.slice(start, end);
  assert.match(body, /SupportSource\.HEADER_SLEEPER/);
  assert.match(body, /handlers\.onSupportClick/);
});

test("view layer has no duplicate function declarations across modules", async () => {
  const text = await readViewSource();
  const seen = new Set();
  const dupes = [];
  for (const match of text.matchAll(/^(?:export )?function (\w+)/gm)) {
    const name = match[1];
    if (seen.has(name)) dupes.push(name);
    seen.add(name);
  }
  assert.deepEqual(
    dupes,
    [],
    dupes.length ? `duplicate function declarations: ${dupes.join(", ")}` : undefined,
  );
});

test("view layer renders only — no module imports store.js", async () => {
  const dir = join(root, "src", "view");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  const offenders = [];
  for (const file of files.map((f) => join(dir, f))) {
    const text = await readFile(file, "utf8");
    if (/from\s+["'][./]*store\.js["']/.test(text)) offenders.push(file);
  }
  assert.deepEqual(
    offenders,
    [],
    `view layer must not import store.js (render-only, handlers injected): ${offenders.join(", ")}`,
  );
});

test("renderControls hides wipe until lock differs from default; gratitude prompt is donate-only", async () => {
  const viewText = await readViewSource();
  const solveText = await readFile(join(root, "src/controllers/solve.js"), "utf8");
  assert.match(viewText, /isPristineDefault/);
  assert.match(viewText, /showLockActions/);
  assert.match(viewText, /controls\.wipeLock/);
  assert.match(viewText, /showLockActions\s*\?\s*\[/);
  assert.doesNotMatch(viewText, /controls-share/);
  // Donation CTA is folded into the solution area, gated by `gratitudeRevealed`,
  // and rendered between the walkthrough and the show-all-steps toggle.
  assert.match(viewText, /gratitudeCtas/);
  assert.match(viewText, /ui\?\.gratitudeRevealed/);
  assert.match(viewText, /gratitudeDonateBtn/);
  assert.doesNotMatch(viewText, /renderGratitudePrompt/);
  // The share-out feature was removed; no share button or share offer remains.
  assert.doesNotMatch(viewText, /gratitudeShareBtn/);
  assert.doesNotMatch(viewText, /showShare/);
  assert.match(solveText, /gratitudeRevealed: session\.gratitudeRevealed/);
  assert.doesNotMatch(solveText, /renderGratitudePrompt/);
  assert.doesNotMatch(solveText, /maybeOfferShare/);
  assert.doesNotMatch(solveText, /ShareTrigger/);
});

test("hole legend renders per tumbler card, not once above the list", async () => {
  const viewText = await readViewSource();
  const css = await readStyles();
  assert.match(viewText, /function tumblerLegend/);
  assert.match(viewText, /tumbler-legend/);
  assert.match(viewText, /container\.replaceChildren\(\.\.\.cards\)/);
  assert.doesNotMatch(viewText, /function holeLegend/);
  assert.doesNotMatch(css, /\.hole-legend\b/);
  assert.match(css, /\.tumbler-legend\s*\{[^}]*repeat\(7,\s*1fr\)/s);
});

test("unset coupling chip drops the dot glyph and uses a clear aria label", async () => {
  const viewText = await readViewSource();
  const en = JSON.parse(await readFile(join(root, "locales/en.json"), "utf8"));
  assert.match(viewText, /isUnset/);
  assert.match(viewText, /tumbler\.couplingUnsetAria/);
  assert.match(viewText, /isUnset \? lockLabel\(reactor\)/);
  assert.match(en.tumbler.couplingUnsetAria, /\{lock\}/);
});

test("help sections are progressively enhanced into modals", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const modalText = await readFile(join(root, "src/controllers/info-modal.js"), "utf8");
  const css = await readStyles();
  assert.match(appText, /wireInfoModals/);
  assert.match(modalText, /info-modal-open/);
  assert.match(modalText, /info-modal-backdrop/);
  assert.match(modalText, /Escape/);
  assert.match(modalText, /#how-to-map/);
  assert.match(modalText, /\.lockpicking-guide/);
  assert.match(modalText, /\.app-foot-faq/);
  assert.match(css, /\.how-to-map\[open\]/);
  assert.match(css, /\.lockpicking-guide\[open\]/);
  assert.match(css, /\.app-foot-faq\[open\]/);
});

test("core controls have hover feedback gated for touch", async () => {
  const css = await readStyles();
  assert.match(css, /@media \(hover: hover\)/);
  assert.match(css, /\.solve-btn:hover/);
  assert.match(css, /\.hole:hover/);
});

test("no_path failure offers catalog browse recovery", async () => {
  const viewText = await readViewSource();
  assert.match(viewText, /solution\.browseLocks/);
  assert.match(viewText, /onOpenCatalog/);
  assert.match(viewText, /searchSvg/);
  assert.match(viewText, /solution-browse-btn/);
});

test("controls browse CTA uses search icon with label", async () => {
  const controls = await readFile(join(root, "src/view/controls.js"), "utf8");
  assert.match(controls, /searchSvg/);
  assert.doesNotMatch(controls, /openLockSvg/);
  assert.match(controls, /controls-browse-btn/);
  assert.match(controls, /catalog\.browse/);
});

test("controls wipe CTA uses reset icon with label for mobile icon-only collapse", async () => {
  const controls = await readFile(join(root, "src/view/controls.js"), "utf8");
  const css = await readFile(join(root, "styles/controls.css"), "utf8");
  assert.match(controls, /resetSvg/);
  assert.match(controls, /controls-wipe-label/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /\.controls-wipe-label/);
});

test("wipe lock onClearAll re-renders so the confirm overlay can mount", async () => {
  const lockText = await readFile(join(root, "src/controllers/lock.js"), "utf8");
  assert.match(
    lockText,
    /onClearAll\(\)\s*\{\s*wipeConfirmOpen\s*=\s*true;\s*onRerender\(\);/s,
  );
});

test("walkthrough uses tertiary help trigger, not pill mismatch button", async () => {
  const text = await readViewSource();
  assert.match(text, /wt-help-trigger/);
  assert.match(text, /walkthrough\.somethingOff/);
  assert.match(text, /renderHelpOverlay/);
  assert.doesNotMatch(text, /wt-mismatch-btn/);
  assert.doesNotMatch(text, /This step doesn't match/);
  assert.doesNotMatch(text, /children\.push\(renderHelpPanel/);
});

test("wipe lock uses in-app confirm modal instead of native confirm", async () => {
  const lockText = await readFile(join(root, "src/controllers/lock.js"), "utf8");
  const viewText = await readViewSource();
  const rendererText = await readFile(join(root, "src/bootstrap/app-renderer.js"), "utf8");
  assert.doesNotMatch(lockText, /confirm\(/);
  assert.match(lockText, /wipeConfirmOpen/);
  assert.match(lockText, /onConfirmWipe/);
  assert.match(lockText, /onCancelWipe/);
  assert.match(viewText, /renderWipeConfirmOverlay/);
  assert.match(viewText, /pill-danger/);
  assert.match(viewText, /controls-wipe-btn/);
  assert.doesNotMatch(viewText, /controlsIconSvg\("wipe"\)/);
  assert.match(viewText, /confirm-dialog-actions[\s\S]*text: t\("confirm\.cancel"\)/);
  assert.match(rendererText, /renderWipeConfirmOverlay/);
  assert.match(rendererText, /getWipeConfirmVisible/);
});

test("ghost pills (Reset lock, Cancel, Clear filters) use full-contrast text, not the dim token", async () => {
  const css = await readFile(join(root, "styles/controls.css"), "utf8");
  const block = css.match(/\.pill-ghost\s*\{[^}]+\}/s)?.[0] ?? "";
  assert.match(block, /color:\s*var\(--parchment\);/, "ghost pill text must not fall back to --parchment-dim");
});

test("src does not use native confirm dialogs", async () => {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(join(root, "src"), { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const filePath = join(entry.parentPath, entry.name);
    const text = await readFile(filePath, "utf8");
    assert.doesNotMatch(text, /confirm\(/, `${filePath} must not use confirm()`);
  }
});

test("walkthrough layout avoids fixed min column widths that cause horizontal scroll", async () => {
  const css = await readStyles();
  assert.match(css, /\.wt-plate\s*\{[^}]*grid-template-columns:\s*2\.5rem minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.wt-plate \.plate-holes--readout\s*\{[^}]*repeat\(7,\s*minmax\(0,\s*1fr\)\)/s);
  assert.doesNotMatch(css, /repeat\(7,\s*minmax\(26px/);
});

test("walkthrough moving hole styles use thin-border glow without spread rings", async () => {
  const css = await readStyles();
  assert.match(css, /\.wt-plate\.is-current \.hole\.is-active\.is-moving/);
  assert.match(css, /@keyframes hole-moving-glow/);
  assert.match(css, /hole-moving-glow 3s ease-in-out infinite/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.wt-plate\.is-current \.hole\.is-active\.is-moving/);
  assert.doesNotMatch(css, /\.walkthrough:has\(\.wt-plate\.is-current\)[\s\S]*opacity:\s*0\.45/);
  const movingBlock = css.match(
    /\.wt-plate\.is-current \.hole\.is-active\.is-moving[\s\S]*?@keyframes hole-moving-glow-at-edge/,
  )?.[0] ?? "";
  assert.doesNotMatch(movingBlock, /0 0 0 2px/);
});

test("static-content.js does not hydrate footer press or FAQ", async () => {
  const staticContentText = await readFile(join(root, "src/i18n/static-content.js"), "utf8");
  assert.doesNotMatch(staticContentText, /applyPressStaticContent/);
  assert.doesNotMatch(staticContentText, /PRESS_PCGAMES_URL/);
  assert.doesNotMatch(staticContentText, /app-foot-faq/);
  assert.doesNotMatch(staticContentText, /footer\.faq/);
});

test("index.html includes SEO metadata", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const css = await readStyles();
  assert.match(html, /<meta\s+name="description"/);
  assert.match(html, /<link\s+rel="canonical"/);
  assert.match(html, /href="\/llms\.txt"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /app-definition/);
  assert.match(html, /app-title/);
  assert.match(html, /lockpicking-guide/);
  assert.match(html, /app-foot-press-static/);
  assert.match(html, /app-foot-press app-foot-press-static/);
  assert.match(html, /"availableLanguage"/);
  assert.match(html, /"HowTo"/);
  assert.match(html, /"subjectOf"/);
  assert.match(html, /"featureList"/);
  assert.match(html, /beginner-friendly/i);
  assert.match(html, /https:\/\/gothiclockbreaker\.com\//);
  assert.match(html, /Gothic Remake Lockbreaker/);
  assert.match(html, /Gothic Remake Lock Breaker/);
  assert.match(html, /lockpicking calculator/i);
  assert.match(html, /Gothic Remake Lockbreaker[\s\S]*Gothic Remake Lock Breaker/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="x-default"/);
  assert.match(html, /app-foot-faq/);
  assert.doesNotMatch(html, /"FAQPage"/);
  assert.doesNotMatch(html, /panel--faq/);
  assert.doesNotMatch(html, /app-faq/);
  // Reddit belongs in JSON-LD sameAs / docs — not in visible body chrome.
  const withoutJsonLd = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
    "",
  );
  assert.doesNotMatch(withoutJsonLd, /reddit\.com/);
  assert.match(html, /reddit\.com\/r\/worldofgothic/);
  assert.match(css, /\.app-foot-press,\s*\n\.app-foot-press-static/);
});

test("README routes community to Reddit; llms.txt keeps Community section", async () => {
  const readme = await readFile(join(root, "README.md"), "utf8");
  const llms = await readFile(join(root, "llms.txt"), "utf8");
  const contributing = await readFile(join(root, "CONTRIBUTING.md"), "utf8");
  const issueConfig = await readFile(join(root, ".github/ISSUE_TEMPLATE/config.yml"), "utf8");
  const featureRequest = await readFile(join(root, ".github/ISSUE_TEMPLATE/feature_request.yml"), "utf8");
  const en = JSON.parse(await readFile(join(root, "locales/en.json"), "utf8"));
  const redditThread =
    /reddit\.com\/r\/worldofgothic\/comments\/1tz9wwa/i;
  const discussionsUrl = /github\.com\/Dsazz\/gothic-remake-lockbreaker\/discussions/i;

  assert.match(readme, /pcgames\.de/);
  assert.match(readme, /buffed\.de/);
  assert.match(readme, redditThread);
  assert.doesNotMatch(readme, discussionsUrl);
  assert.match(contributing, redditThread);
  assert.doesNotMatch(contributing, discussionsUrl);
  assert.match(issueConfig, redditThread);
  assert.doesNotMatch(issueConfig, discussionsUrl);
  assert.match(featureRequest, redditThread);
  assert.doesNotMatch(featureRequest, discussionsUrl);
  assert.match(llms, /## Press coverage/);
  assert.match(llms, /## Comparison/);
  assert.match(llms, /## FAQ/);
  assert.match(llms, /beginner-friendly/i);
  assert.match(en.app.definitionBody, /beginner-friendly/i);
  assert.match(en.app.srTitle, /Gothic Remake Lock Breaker/);
  assert.match(en.seo.title, /Gothic Remake Lockbreaker/);
  assert.match(en.seo.description, /lockpicking calculator/i);
  assert.match(llms, redditThread);
});

test("locale suggest uses region semantics, not dialog", async () => {
  const viewText = await readViewSource();
  const fnStart = viewText.indexOf("export function renderLocaleSuggest");
  const fnEnd = viewText.indexOf("export function renderI18nBanner");
  const fnBody = viewText.slice(fnStart, fnEnd);
  assert.match(fnBody, /role: "region"/);
  assert.doesNotMatch(fnBody, /role: "dialog"/);
});

test("app bootstraps with catch and splits locale chrome from renderAll", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const rendererText = await readFile(join(root, "src/bootstrap/app-renderer.js"), "utf8");
  const localeText = await readFile(join(root, "src/controllers/locale-chrome.js"), "utf8");
  const switcherText = await readFile(join(root, "src/i18n/locale-switcher.js"), "utf8");
  assert.match(appText, /bootstrap\(\)\.catch/);
  assert.match(appText, /function wireApp/);
  assert.match(appText, /createAppRenderer/);
  assert.match(localeText, /solveCoachmark\.isActive\(\)/);
  assert.match(localeText, /renderLocaleSuggest/);
  assert.match(localeText, /maybeStartGeoHintWait/);
  assert.match(localeText, /!localeSuggestVisible && !isDefaultLocale\(locale\)/);
  assert.match(localeText, /function syncTracking/);
  assert.match(appText, /locale\.syncTracking\(\)/);
  const renderStart = localeText.indexOf("function render(handlers, tracking)");
  const renderEnd = localeText.indexOf("function handleLocaleChange");
  const renderBody = localeText.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderBody, /syncTracking\(/);
  assert.doesNotMatch(rendererText, /renderLocaleSwitcher/);
  assert.doesNotMatch(rendererText, /renderFooter/);
  assert.doesNotMatch(rendererText, /renderHeadSupport/);
  assert.match(switcherText, /function mountLocaleSwitcher/);
  assert.match(switcherText, /function updateLocaleSwitcher/);
});

test("locale switcher is a combobox + listbox with short codes", async () => {
  const switcherText = await readFile(join(root, "src/i18n/locale-switcher.js"), "utf8");
  const css = await readStyles();
  assert.match(switcherText, /aria-haspopup", "listbox"/);
  assert.match(switcherText, /role", "listbox"/);
  assert.match(switcherText, /role", "option"/);
  assert.match(switcherText, /function shortCode/);
  assert.match(switcherText, /locale\.toUpperCase\(\)/);
  assert.match(switcherText, /case Key\.ESCAPE:/);
  // Guards for the review fixes: no focus/scroll race, no leaked listeners.
  assert.match(switcherText, /preventScroll: true/);
  assert.match(switcherText, /new AbortController\(\)/);
  assert.match(switcherText, /\{ signal \}/);
  assert.match(css, /\.locale-switcher-menu\s*\{[^}]*max-height/s);
});

test("locale switcher update resolves the portaled menu by id, not via the group", async () => {
  const switcherText = await readFile(join(root, "src/i18n/locale-switcher.js"), "utf8");
  const updateStart = switcherText.indexOf("function updateLocaleSwitcher");
  const updateEnd = switcherText.indexOf("export function renderLocaleSwitcher");
  const updateBody = switcherText.slice(updateStart, updateEnd);
  // openMenu() portals the listbox to <body>, so resolving it via group.querySelector
  // returns null during an async re-render and setAttribute throws (issue #57).
  assert.match(updateBody, /document\.getElementById\(LISTBOX_ID\)/);
  assert.doesNotMatch(updateBody, /group\.querySelector\(["'`]\.locale-switcher-menu/);
});

test("sequence hint only claims 'mapped' when the lock is ready, not merely partial", async () => {
  const solveText = await readFile(join(root, "src/controllers/solve.js"), "utf8");
  const viewText = await readViewSource();
  // Controller must derive lockReady from READY and stop passing the partial-true `mapped`.
  assert.match(solveText, /lockReady = completeness === MappingCompleteness\.READY/);
  assert.doesNotMatch(solveText, /lockReady:\s*mapped/);
  assert.match(solveText, /lockMapped: isLockMapped\(state\)/);
  // View picks the hint from lockReady, so partial locks fall back to hintMap.
  assert.match(viewText, /ui\?\.lockReady \? t\("solution\.hintReady"\)/);
});

test("sequence panel stays dormant on mobile until the lock has data", async () => {
  const viewText = await readViewSource();
  const css = await readStyles();
  const html = await readFile(join(root, "index.html"), "utf8");
  // View toggles the dormant class from injected lockMapped flag.
  assert.match(viewText, /classList\.toggle\("is-unmapped", !ui\?\.lockMapped\)/);
  // Mobile hides the dormant panel, but a started tour keeps it for the solve spotlight.
  assert.match(css, /body:not\(\.onboarding-active\) \.panel--sequence\.is-unmapped\s*\{\s*display:\s*none/s);
  // Reduced-motion override must win by specificity, not source order.
  assert.match(css, /body:not\(\.onboarding-active\) \.panel\.panel--sequence:not\(\.is-unmapped\)\s*\{\s*animation:\s*none/s);
  assert.match(css, /@keyframes sequence-rise/);
  // Static markup ships dormant so the bottom bar never flashes on cold mobile landing.
  assert.match(html, /panel--sequence is-unmapped/);
});

test("roving-focus DOM contract lives only in view/focus.js", async () => {
  // The selectors + dataset reads the view writes and the keyboard controller
  // reads must have one owner. A copy-pasted literal anywhere else is the exact
  // drift this refactor removed — fail the build if it reappears.
  const CONTRACT_OWNER = "view/focus.js";
  const contractPatterns = [
    /\.plate-holes\[role=/,
    /\.link-chip-row\[role=/,
    /\[aria-checked="true"\]/,
    /\.dataset\.plate\b/,
    /\.dataset\.value\b/,
    /\.dataset\.reactor\b/,
  ];

  const entries = await readdir(join(root, "src"), { recursive: true });
  const offenders = [];
  for (const entry of entries.filter((f) => f.endsWith(".js"))) {
    const rel = entry.split("\\").join("/");
    if (rel === CONTRACT_OWNER) continue;
    const text = await readFile(join(root, "src", entry), "utf8");
    if (contractPatterns.some((re) => re.test(text))) offenders.push(rel);
  }
  assert.deepEqual(
    offenders,
    [],
    `roving-focus contract literals must come from view/focus.js, not: ${offenders.join(", ")}`,
  );
});

test("focus contract consumers import from view/focus.js", async () => {
  const keyboard = await readFile(join(root, "src/controllers/keyboard.js"), "utf8");
  const renderer = await readFile(join(root, "src/bootstrap/app-renderer.js"), "utf8");
  assert.match(keyboard, /from "\.\.\/view\/focus\.js"/);
  assert.match(renderer, /from "\.\.\/view\/focus\.js"/);
  // The lateral controller->bootstrap import this refactor removed must stay gone.
  assert.doesNotMatch(keyboard, /from "\.\.\/bootstrap\//);
});
