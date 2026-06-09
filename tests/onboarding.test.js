import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ONBOARDING_STEPS } from "../src/onboarding.js";

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
  assert.equal(ONBOARDING_STEPS[0].id, "mastery_tier");
  assert.equal(ONBOARDING_STEPS[1].id, "plate_count");
  assert.equal(ONBOARDING_STEPS[1].target, ".controls .locks-row");
});
