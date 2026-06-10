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
});

test("footer links to GitHub issues", async () => {
  const versionText = await readFile(join(root, "src/version.js"), "utf8");
  const viewText = await readFile(join(root, "src/view.js"), "utf8");
  assert.match(versionText, /GITHUB_ISSUES_URL/);
  assert.doesNotMatch(versionText, /REDDIT_DISCUSS_URL/);
  assert.match(viewText, /githubIssuesLink/);
  assert.match(viewText, /footer\.issues/);
});

test("app defers solve coachmark until onboarding tour ends", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const onboardingText = await readFile(join(root, "src/onboarding.js"), "utf8");
  assert.match(appText, /pendingSolveCoachmark/);
  assert.match(appText, /flushPendingSolveCoachmark/);
  assert.match(appText, /resolveSolveCoachmarkTrigger/);
  assert.match(appText, /onboarding\.isActive\(\)/);
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
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  assert.match(viewText, /isPristineDefault/);
  assert.match(viewText, /showLockActions/);
  assert.match(viewText, /\.\.\.\(showLockActions \? \[actionsBlock\] : \[\]\)/);
  assert.match(viewText, /controls\.wipeLock/);
  assert.doesNotMatch(viewText, /controls-share/);
  assert.match(viewText, /renderSharePrompt/);
  assert.match(appText, /sharePromptVisible && hasMoves/);
  assert.doesNotMatch(appText, /SHARE_PROMPT_KEY/);
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

test("index.html includes SEO metadata", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.match(html, /<meta\s+name="description"/);
  assert.match(html, /<link\s+rel="canonical"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /app-definition/);
  assert.match(html, /https:\/\/gothiclockbreaker\.com\//);
  assert.doesNotMatch(html, /panel--faq/);
});

test("app bootstraps with catch and splits locale chrome from renderAll", async () => {
  const appText = await readFile(join(root, "src/app.js"), "utf8");
  const switcherText = await readFile(join(root, "src/locale-switcher.js"), "utf8");
  assert.match(appText, /bootstrap\(\)\.catch/);
  assert.match(appText, /function renderLocaleChrome/);
  assert.match(appText, /function wireApp/);
  assert.match(appText, /solveCoachmark\.isActive\(\)/);
  const renderAllStart = appText.indexOf("function renderAll(state)");
  const renderAllEnd = appText.indexOf("function invalidateSolution");
  const renderAllBody = appText.slice(renderAllStart, renderAllEnd);
  assert.doesNotMatch(renderAllBody, /renderLocaleSwitcher/);
  assert.doesNotMatch(renderAllBody, /renderFooter/);
  assert.doesNotMatch(renderAllBody, /renderHeadSupport/);
  assert.match(switcherText, /function mountLocaleSwitcher/);
  assert.match(switcherText, /function updateLocaleSwitcher/);
});
