import { test } from "node:test";
import assert from "node:assert/strict";

import { ONBOARDING_STEPS } from "../src/onboarding/tour.js";
import {
  LandingType,
  LocaleChangeSource,
  LocaleChangeDirection,
  OnboardingAction,
  OnboardingStepId,
  PromptKind,
  SolveFailureReason,
  SolveSource,
  SupportSource,
  TutorNotShownReason,
} from "../src/analytics/values.js";
import { LocaleSource } from "../src/i18n/index.js";
import { StorageKeys, StorageFlag } from "../src/storage-keys.js";

const FROZEN_MAPS = [
  LandingType,
  LocaleSource,
  LocaleChangeSource,
  LocaleChangeDirection,
  SolveSource,
  SolveFailureReason,
  OnboardingStepId,
  OnboardingAction,
  TutorNotShownReason,
  PromptKind,
  SupportSource,
  StorageKeys,
  StorageFlag,
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

test("SupportSource includes i18n banner", () => {
  assert.equal(SupportSource.I18N_BANNER, "i18n_banner");
});

test("SupportSource includes header sleeper", () => {
  assert.equal(SupportSource.HEADER_SLEEPER, "header_sleeper");
});

test("onboarding step ids align with OnboardingStepId (tour steps only)", () => {
  const tourIds = new Set(Object.values(OnboardingStepId));
  tourIds.delete(OnboardingStepId.SOLVE_COACHMARK);

  for (const step of ONBOARDING_STEPS) {
    assert.ok(tourIds.has(step.id), `${step.id} should be in OnboardingStepId`);
  }
});
