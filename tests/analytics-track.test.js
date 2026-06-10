import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("track.js exports locale analytics helpers", async () => {
  const text = await readFile(join(root, "src/analytics/track.js"), "utf8");
  assert.match(text, /export function trackLocaleResolved/);
  assert.match(text, /export function trackLocaleChanged/);
  assert.match(text, /initial_locale/);
  assert.match(text, /change_direction/);
  assert.match(text, /is_revert_to_default/);
  assert.match(text, /locale_switch_count/);
});

test("events.js defines locale session events", async () => {
  const text = await readFile(join(root, "src/analytics/events.js"), "utf8");
  assert.match(text, /LOCALE_RESOLVED/);
  assert.match(text, /LOCALE_CHANGED/);
  assert.match(text, /LOCALE_SESSION_END/);
  assert.match(text, /I18N_BANNER_SHOWN/);
});

test("trackLanding accepts locale and localeSource", async () => {
  const text = await readFile(join(root, "src/analytics/track.js"), "utf8");
  assert.match(text, /export function trackLanding\(\{ landingType, locale, localeSource \}\)/);
  assert.match(text, /locale_source: localeSource/);
});

test("locale-engagement installs pagehide tracking", async () => {
  const text = await readFile(join(root, "src/analytics/locale-engagement.js"), "utf8");
  assert.match(text, /export function installLocaleEngagementTracking/);
  assert.match(text, /staying_on_translation/);
  assert.match(text, /pagehide/);
});
