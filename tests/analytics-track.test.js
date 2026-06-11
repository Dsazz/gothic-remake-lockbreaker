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
  assert.match(text, /LOCALE_SUGGEST_SHOWN/);
  assert.match(text, /LOCALE_SUGGEST_ACCEPTED/);
  assert.match(text, /LOCALE_SUGGEST_DECLINED/);
});

test("values.js defines locale suggest change source", async () => {
  const text = await readFile(join(root, "src/analytics/values.js"), "utf8");
  assert.match(text, /SUGGEST_BAR/);
  assert.match(text, /LocaleSuggestDeclineAction/);
});

test("track.js exports locale suggest helpers", async () => {
  const text = await readFile(join(root, "src/analytics/track.js"), "utf8");
  assert.match(text, /export function trackLocaleSuggestShown/);
  assert.match(text, /export function trackLocaleSuggestAccepted/);
  assert.match(text, /export function trackLocaleSuggestDeclined/);
  assert.match(text, /decline_action/);
});

test("trackLanding accepts locale and localeSource", async () => {
  const text = await readFile(join(root, "src/analytics/track.js"), "utf8");
  assert.match(text, /export function trackLanding\(\{ landingType, locale, localeSource \}\)/);
  assert.match(text, /locale_source: localeSource/);
  assert.match(text, /readLandingAttribution/);
  assert.match(text, /runWhenPostHogReady/);
  const attribution = await readFile(join(root, "src/analytics/attribution.js"), "utf8");
  assert.match(attribution, /referrer_host/);
  assert.match(attribution, /utm_source/);
  assert.match(attribution, /\$referring_domain/);
});

test("locale-engagement installs pagehide tracking", async () => {
  const text = await readFile(join(root, "src/analytics/locale-engagement.js"), "utf8");
  assert.match(text, /export function installLocaleEngagementTracking/);
  assert.match(text, /staying_on_translation/);
  assert.match(text, /pagehide/);
});

test("track.js exports walkthrough session summary", async () => {
  const text = await readFile(join(root, "src/analytics/track.js"), "utf8");
  assert.match(text, /export function trackWalkthroughSessionSummary/);
  assert.match(text, /steps_viewed_max/);
});

test("values.js defines failure guide source", async () => {
  const text = await readFile(join(root, "src/analytics/values.js"), "utf8");
  assert.match(text, /FAILURE_NO_PATH/);
});

test("posthog-init uses lean PostHog init (quota-safe defaults)", async () => {
  const text = await readFile(join(root, "src/analytics/posthog-init.js"), "utf8");
  const leanFlags = [
    "autocapture: false",
    "capture_pageview: true",
    "capture_pageleave: false",
    "capture_performance: false",
    "capture_exceptions: false",
    "rageclick: false",
    "disable_session_recording: true",
    "disable_surveys: true",
    "enable_heatmaps: false",
    "capture_dead_clicks: false",
    "advanced_disable_flags: true",
    "stopSessionRecording",
  ];
  for (const flag of leanFlags) {
    assert.match(text, new RegExp(flag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(text, /defaults:\s*["']2026-05-30["']/);
  assert.match(text, /posthog:ready/);
});

test("web-presence refreshes visible sessions for Web Analytics Live", async () => {
  const text = await readFile(join(root, "src/analytics/web-presence.js"), "utf8");
  assert.match(text, /45_000/);
  assert.match(text, /\$pageview/);
  assert.match(text, /visibilitychange/);
});

test("track.js does not export removed high-volume walkthrough/tutor events", async () => {
  const text = await readFile(join(root, "src/analytics/track.js"), "utf8");
  assert.doesNotMatch(text, /export function trackWalkthroughStepChanged/);
  assert.doesNotMatch(text, /export function trackWalkthroughUiToggled/);
  assert.doesNotMatch(text, /export function trackOnboardingStepViewed/);
  assert.doesNotMatch(text, /export function trackTutorNextClicked/);
});

test("events.js omits removed high-volume event names", async () => {
  const text = await readFile(join(root, "src/analytics/events.js"), "utf8");
  assert.doesNotMatch(text, /walkthrough_step_changed/);
  assert.doesNotMatch(text, /walkthrough_ui_toggled/);
  assert.doesNotMatch(text, /onboarding_step_viewed/);
  assert.doesNotMatch(text, /tutor_next_clicked/);
});
