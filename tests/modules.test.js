import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("browser modules parse without syntax errors", async () => {
  await import("../src/domain.js");
  await import("../src/store.js");
  await import("../src/solver.js");
  await import("../src/view.js");
  await import("../src/analytics/values.js");
  await import("../src/storage-keys.js");
  await import("../src/solve-coachmark.js");
  await import("../src/solve-coachmark-schedule.js");
  await import("../src/i18n.js");
  await import("../src/static-content.js");
  await import("../src/locale-switcher.js");
  await import("../src/locale-suggest.js");
  await import("../src/analytics/geo-hint.js");
  await import("../src/ui-prefs.js");
  await import("../src/landing.js");
  await import("../src/solve-controller.js");
  await import("../src/lock-controller.js");
  await import("../src/locale-chrome-controller.js");
  await import("../src/app-renderer.js");
  await import("../src/app-elements.js");
});

test("footer links to GitHub issues and press coverage", async () => {
  const versionText = await readFile(join(root, "src/version.js"), "utf8");
  const viewText = await readFile(join(root, "src/view.js"), "utf8");
  assert.match(versionText, /GITHUB_ISSUES_URL/);
  assert.match(versionText, /PRESS_PCGAMES_URL/);
  assert.match(versionText, /PRESS_BUFFED_URL/);
  assert.doesNotMatch(versionText, /REDDIT_DISCUSS_URL/);
  assert.match(viewText, /githubIssuesLink/);
  assert.match(viewText, /pressMentionsLine/);
  assert.match(viewText, /footer\.issues/);
  assert.match(viewText, /press\.pcgames/);
});

test("app defers solve coachmark until onboarding tour ends", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const solveText = await readFile(join(root, "src/solve-controller.js"), "utf8");
  const onboardingText = await readFile(join(root, "src/onboarding.js"), "utf8");
  assert.match(appText, /flushPendingCoachmark/);
  assert.match(solveText, /pendingSolveCoachmark/);
  assert.match(solveText, /flushPendingCoachmark/);
  assert.match(solveText, /resolveSolveCoachmarkTrigger/);
  assert.match(solveText, /onboarding\.isActive\(\)/);
  assert.match(onboardingText, /isActive:\s*\(\)\s*=>\s*active/);
});

test("view.js has no duplicate function declarations", async () => {
  const text = await readFile(join(root, "src/view.js"), "utf8");
  const seen = new Set();
  const dupes = [];
  for (const match of text.matchAll(/^function (\w+)/gm)) {
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

test("renderControls hides wipe until lock differs from default; share is banner-only", async () => {
  const viewText = await readFile(join(root, "src/view.js"), "utf8");
  const solveText = await readFile(join(root, "src/solve-controller.js"), "utf8");
  assert.match(viewText, /isPristineDefault/);
  assert.match(viewText, /showLockActions/);
  assert.match(viewText, /\.\.\.\(showLockActions \? \[actionsBlock\] : \[\]\)/);
  assert.match(viewText, /controls\.wipeLock/);
  assert.doesNotMatch(viewText, /controls-share/);
  assert.match(viewText, /renderSharePrompt/);
  assert.match(solveText, /sharePromptVisible && hasMoves/);
  assert.doesNotMatch(solveText, /SHARE_PROMPT_KEY/);
});

test("walkthrough uses tertiary help trigger, not pill mismatch button", async () => {
  const text = await readFile(join(root, "src/view.js"), "utf8");
  assert.match(text, /wt-help-trigger/);
  assert.match(text, /walkthrough\.somethingOff/);
  assert.match(text, /renderHelpOverlay/);
  assert.doesNotMatch(text, /wt-mismatch-btn/);
  assert.doesNotMatch(text, /This step doesn't match/);
  assert.doesNotMatch(text, /children\.push\(renderHelpPanel/);
});

test("walkthrough layout avoids fixed min column widths that cause horizontal scroll", async () => {
  const css = await readFile(join(root, "styles.css"), "utf8");
  assert.match(css, /\.wt-plate\s*\{[^}]*grid-template-columns:\s*2\.5rem minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.wt-plate \.plate-holes--readout\s*\{[^}]*repeat\(7,\s*minmax\(0,\s*1fr\)\)/s);
  assert.doesNotMatch(css, /repeat\(7,\s*minmax\(26px/);
});

test("static-content.js does not hydrate footer press", async () => {
  const staticContentText = await readFile(join(root, "src/static-content.js"), "utf8");
  assert.doesNotMatch(staticContentText, /applyPressStaticContent/);
  assert.doesNotMatch(staticContentText, /PRESS_PCGAMES_URL/);
});

test("index.html includes SEO metadata", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const css = await readFile(join(root, "styles.css"), "utf8");
  assert.match(html, /<meta\s+name="description"/);
  assert.match(html, /<link\s+rel="canonical"/);
  assert.match(html, /href="\/llms\.txt"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /app-definition/);
  assert.match(html, /app-foot-press-static/);
  assert.match(html, /app-foot-press app-foot-press-static/);
  assert.match(html, /"availableLanguage"/);
  assert.match(html, /"HowTo"/);
  assert.match(html, /"subjectOf"/);
  assert.match(html, /"featureList"/);
  assert.match(html, /beginner-friendly/i);
  assert.match(html, /https:\/\/gothiclockbreaker\.com\//);
  assert.doesNotMatch(html, /"FAQPage"/);
  assert.doesNotMatch(html, /panel--faq/);
  assert.doesNotMatch(html, /app-faq/);
  assert.doesNotMatch(html, /reddit\.com/);
  assert.match(css, /\.app-foot-press,\s*\n\.app-foot-press-static/);
});

test("README and llms.txt promote press, not Reddit in README", async () => {
  const readme = await readFile(join(root, "README.md"), "utf8");
  const llms = await readFile(join(root, "llms.txt"), "utf8");
  const en = JSON.parse(await readFile(join(root, "locales/en.json"), "utf8"));
  assert.match(readme, /pcgames\.de/);
  assert.match(readme, /buffed\.de/);
  assert.doesNotMatch(readme, /reddit\.com/);
  assert.match(llms, /## Press coverage/);
  assert.match(llms, /## Comparison/);
  assert.match(llms, /## FAQ/);
  assert.match(llms, /beginner-friendly/i);
  assert.match(en.app.definition, /beginner-friendly/i);
  assert.match(en.seo.title, /Beginner-Friendly/);
  assert.match(llms, /reddit\.com/);
});

test("locale suggest uses region semantics, not dialog", async () => {
  const viewText = await readFile(join(root, "src/view.js"), "utf8");
  const fnStart = viewText.indexOf("export function renderLocaleSuggest");
  const fnEnd = viewText.indexOf("export function renderI18nBanner");
  const fnBody = viewText.slice(fnStart, fnEnd);
  assert.match(fnBody, /role: "region"/);
  assert.doesNotMatch(fnBody, /role: "dialog"/);
});

test("app bootstraps with catch and splits locale chrome from renderAll", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const rendererText = await readFile(join(root, "src/app-renderer.js"), "utf8");
  const localeText = await readFile(join(root, "src/locale-chrome-controller.js"), "utf8");
  const switcherText = await readFile(join(root, "src/locale-switcher.js"), "utf8");
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
