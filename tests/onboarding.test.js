import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ONBOARDING_STEPS } from "../src/onboarding.js";
import { OnboardingStepId } from "../src/analytics/values.js";
import { StorageKeys } from "../src/storage-keys.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("onboarding step targets are specific and present in view markup", async () => {
  const view = await readFile(join(root, "src/view.js"), "utf8");
  const targets = new Set();

  for (const step of ONBOARDING_STEPS) {
    assert.match(
      step.target,
      /\.[\w-]+/,
      `${step.id} should use a class selector, not a generic .pill-row`,
    );
    assert.equal(
      targets.has(step.target),
      false,
      `duplicate onboarding target: ${step.target}`,
    );
    targets.add(step.target);

    const classes = [...step.target.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    assert.ok(
      classes.some((name) => view.includes(name)),
      `${step.id}: expected one of [${classes.join(", ")}] in view.js`,
    );
  }
});

test("onboarding has four steps including mastery tier before plate count", () => {
  assert.equal(ONBOARDING_STEPS.length, 4);
  assert.equal(ONBOARDING_STEPS[0].id, OnboardingStepId.MASTERY_TIER);
  assert.equal(ONBOARDING_STEPS[1].id, OnboardingStepId.PLATE_COUNT);
  assert.equal(ONBOARDING_STEPS[1].target, ".controls .locks-row");
});

test("onboarding dismiss key is v3", () => {
  assert.equal(StorageKeys.ONBOARDING_DISMISSED_V3, "onboarding_dismissed_v3");
});
