import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BadgeFeature,
  EARLIEST_BASELINE,
  FEATURE_BADGE_REGISTRY,
  attributeBadgeSource,
  compareVersions,
  isValidVersion,
  visibleBadgeIds,
} from "../src/core/feature-badges.js";
import { VERSION } from "../src/version.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("compareVersions orders numerically, not lexically", () => {
  assert.equal(compareVersions("1.34.0", "0.0.0"), 1);
  assert.equal(compareVersions("1.34.0", "1.34.0"), 0);
  assert.equal(compareVersions("1.9.0", "1.10.0"), -1, "1.9 must sort before 1.10");
  assert.equal(compareVersions("2.0.0", "1.99.99"), 1);
  assert.equal(compareVersions("1.2.3", "1.2.10"), -1);
});

test("isValidVersion accepts X.Y.Z and rejects anything else", () => {
  assert.ok(isValidVersion("1.34.0"));
  assert.ok(!isValidVersion("1.34"));
  assert.ok(!isValidVersion("v1.34.0"));
  assert.ok(!isValidVersion("1.x.0"));
});

test("returning visitor (earliest baseline) sees every registry badge", () => {
  const ids = visibleBadgeIds({ firstSeenVersion: EARLIEST_BASELINE });
  assert.deepEqual(ids, [BadgeFeature.HOTKEYS]);
});

test("first-time visitor (baseline at/after every since) sees nothing", () => {
  // A first-timer's baseline is the current version; no registry `since` is
  // greater (the since <= VERSION invariant below guarantees this).
  const ids = visibleBadgeIds({ firstSeenVersion: VERSION });
  assert.deepEqual(ids, []);
});

test("visibleBadgeIds gates strictly on since > baseline", () => {
  const registry = [
    { id: "older", since: "1.0.0" },
    { id: "equal", since: "1.5.0" },
    { id: "newer", since: "1.5.1" },
  ];
  const ids = visibleBadgeIds({ firstSeenVersion: "1.5.0", registry });
  assert.deepEqual(ids, ["newer"], "equal and older baselines must not show");
});

test("dismissed ids are excluded", () => {
  const registry = [
    { id: "alpha", since: "1.1.0" },
    { id: "beta", since: "1.2.0" },
  ];
  const all = visibleBadgeIds({ firstSeenVersion: EARLIEST_BASELINE, registry });
  assert.deepEqual(all, ["alpha", "beta"]);
  const remaining = visibleBadgeIds({
    firstSeenVersion: EARLIEST_BASELINE,
    dismissedIds: ["alpha"],
    registry,
  });
  assert.deepEqual(remaining, ["beta"]);
});

test("missing baseline falls back to earliest (shows badges)", () => {
  assert.deepEqual(visibleBadgeIds({ firstSeenVersion: null }), [BadgeFeature.HOTKEYS]);
});

test("attributeBadgeSource credits the badge only on the organic path while active", () => {
  const args = {
    organicSource: "icon",
    badgeSource: "new_badge",
  };
  assert.equal(
    attributeBadgeSource({ ...args, badgeActive: true, source: "icon" }),
    "new_badge",
    "active badge + organic open -> badge",
  );
  assert.equal(
    attributeBadgeSource({ ...args, badgeActive: false, source: "icon" }),
    "icon",
    "inactive badge -> keep organic source",
  );
  assert.equal(
    attributeBadgeSource({ ...args, badgeActive: true, source: "key" }),
    "key",
    "non-organic open keeps its own source even while badge is active",
  );
});

test("registry invariant: every since is valid semver and <= VERSION", () => {
  for (const entry of FEATURE_BADGE_REGISTRY) {
    assert.ok(isValidVersion(entry.since), `${entry.id} since "${entry.since}" is not X.Y.Z`);
    assert.ok(
      compareVersions(entry.since, VERSION) <= 0,
      `${entry.id} since ${entry.since} is ahead of VERSION ${VERSION} — would leak to first-timers`,
    );
  }
});

test("feature-badges core stays free of DOM and browser globals", async () => {
  const src = await readFile(join(root, "src/core/feature-badges.js"), "utf8");
  assert.doesNotMatch(src, /document\.|window\.|globalThis|localStorage|sessionStorage/);
});

test("whatsNew.badge exists in every locale (Tier C parity)", async () => {
  for (const code of ["en", "de", "pl", "ukr"]) {
    const locale = JSON.parse(await readFile(join(root, `locales/${code}.json`), "utf8"));
    assert.ok(locale.whatsNew?.badge, `whatsNew.badge missing in ${code}.json`);
  }
});
