import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveStartup, StartupAction } from "../src/startup.js";
import { LandingType, SolveSource, TutorNotShownReason } from "../src/analytics/values.js";

test("resolveStartup auto-solves when hash landing is mapped", () => {
  const plan = resolveStartup({
    landingType: LandingType.HASH,
    wasLoadedFromHash: true,
    mapped: true,
  });
  assert.equal(plan.action, StartupAction.AUTO_SOLVE);
  assert.equal(plan.solveSource, SolveSource.HASH);
});

test("resolveStartup cold entry when landing is cold", () => {
  const plan = resolveStartup({
    landingType: LandingType.COLD,
    wasLoadedFromHash: false,
    mapped: false,
  });
  assert.equal(plan.action, StartupAction.COLD_ENTRY);
});

test("resolveStartup skips hash landing when lock is not mapped", () => {
  const plan = resolveStartup({
    landingType: LandingType.HASH,
    wasLoadedFromHash: true,
    mapped: false,
  });
  assert.equal(plan.action, StartupAction.SKIP);
  assert.equal(plan.skipReason, TutorNotShownReason.HASH_LANDING);
});

test("resolveStartup skips returning landing", () => {
  const plan = resolveStartup({
    landingType: LandingType.RETURNING,
    wasLoadedFromHash: false,
    mapped: false,
  });
  assert.equal(plan.action, StartupAction.SKIP);
  assert.equal(plan.skipReason, TutorNotShownReason.RETURNING_USER);
});
