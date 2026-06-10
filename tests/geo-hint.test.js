import { test, mock } from "node:test";
import assert from "node:assert/strict";

import { readGeoCountryCode, waitForGeoCountryCode } from "../src/analytics/geo-hint.js";

test("readGeoCountryCode returns PostHog geo property when set", () => {
  const original = globalThis.posthog;
  globalThis.posthog = {
    get_property: (key) => (key === "$geoip_country_code" ? "DE" : null),
  };
  try {
    assert.equal(readGeoCountryCode(), "DE");
  } finally {
    globalThis.posthog = original;
  }
});

test("readGeoCountryCode returns null when PostHog is missing or property empty", () => {
  const original = globalThis.posthog;
  globalThis.posthog = undefined;
  assert.equal(readGeoCountryCode(), null);
  globalThis.posthog = { get_property: () => "" };
  assert.equal(readGeoCountryCode(), null);
  globalThis.posthog = original;
});

test("waitForGeoCountryCode resolves immediately when geo is already available", () => {
  const original = globalThis.posthog;
  globalThis.posthog = { get_property: () => "PL" };
  const resolved = mock.fn();

  try {
    waitForGeoCountryCode({ onResolved: resolved, timeoutMs: 1000, intervalMs: 50 });
    assert.equal(resolved.mock.callCount(), 1);
    assert.equal(resolved.mock.calls[0].arguments[0], "PL");
  } finally {
    globalThis.posthog = original;
  }
});

test("waitForGeoCountryCode polls until geo appears", async () => {
  const original = globalThis.posthog;
  let code = null;
  globalThis.posthog = { get_property: () => code };
  const resolved = mock.fn();

  try {
    waitForGeoCountryCode({
      onResolved: resolved,
      timeoutMs: 1000,
      intervalMs: 30,
    });
    assert.equal(resolved.mock.callCount(), 0);

    code = "DE";
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(resolved.mock.callCount(), 1);
    assert.equal(resolved.mock.calls[0].arguments[0], "DE");
  } finally {
    globalThis.posthog = original;
  }
});

test("waitForGeoCountryCode calls onTimeout when geo never arrives", async () => {
  const original = globalThis.posthog;
  globalThis.posthog = { get_property: () => null };
  const timedOut = mock.fn();
  const resolved = mock.fn();

  try {
    waitForGeoCountryCode({
      onResolved: resolved,
      onTimeout: timedOut,
      timeoutMs: 60,
      intervalMs: 20,
    });
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(resolved.mock.callCount(), 0);
    assert.equal(timedOut.mock.callCount(), 1);
  } finally {
    globalThis.posthog = original;
  }
});

test("waitForGeoCountryCode stops polling when cancelled", async () => {
  const original = globalThis.posthog;
  let code = null;
  globalThis.posthog = { get_property: () => code };
  const resolved = mock.fn();
  let cancelled = false;

  try {
    waitForGeoCountryCode({
      onResolved: resolved,
      isCancelled: () => cancelled,
      timeoutMs: 500,
      intervalMs: 30,
    });

    cancelled = true;
    code = "DE";
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(resolved.mock.callCount(), 0);
  } finally {
    globalThis.posthog = original;
  }
});
