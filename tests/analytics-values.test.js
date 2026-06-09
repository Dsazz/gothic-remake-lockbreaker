import { test } from "node:test";
import assert from "node:assert/strict";

import { ONBOARDING_STEPS } from "../src/onboarding.js";
import {
  LandingType,
  OnboardingAction,
  OnboardingStepId,
  PromptKind,
  SolveFailureReason,
  SolveSource,
  SupportSource,
  TutorNotShownReason,
  WalkthroughDirection,
  WalkthroughUiAction,
} from "../src/analytics/values.js";
import { StorageKeys } from "../src/storage-keys.js";

const FROZEN_MAPS = [
  LandingType,
  SolveSource,
  SolveFailureReason,
  OnboardingStepId,
  OnboardingAction,
  TutorNotShownReason,
  PromptKind,
  SupportSource,
  WalkthroughDirection,
  WalkthroughUiAction,
  StorageKeys,
];

function assertFrozenUnique(obj, label) {
  assert.equal(Object.isFrozen(obj), true, `${label} should be frozen`);
  const values = Object.values(obj);
  const unique = new Set(values);
  assert.equal(unique.size, values.length, `${label} values should be unique`);
}

test("analytics and storage value maps are frozen with unique string values", () => {
  for (const obj of FROZEN_MAPS) {
    assertFrozenUnique(obj, obj === StorageKeys ? "StorageKeys" : "values map");
  }
});

test("onboarding step ids align with OnboardingStepId (tour steps only)", () => {
  const tourIds = new Set(Object.values(OnboardingStepId));
  tourIds.delete(OnboardingStepId.SOLVE_COACHMARK);

  for (const step of ONBOARDING_STEPS) {
    assert.ok(tourIds.has(step.id), `${step.id} should be in OnboardingStepId`);
  }
});
