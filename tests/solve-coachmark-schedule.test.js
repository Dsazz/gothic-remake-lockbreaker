import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveSolveCoachmarkTrigger,
  SolveCoachmarkTrigger,
} from "../src/onboarding/solve-coachmark-schedule.js";

test("cold + justBecameMapped + tourActive defers coachmark", () => {
  assert.equal(
    resolveSolveCoachmarkTrigger({
      landingCold: true,
      justBecameMapped: true,
      tourActive: true,
      mapped: true,
    }),
    SolveCoachmarkTrigger.DEFER,
  );
});

test("cold + justBecameMapped + tour inactive shows coachmark", () => {
  assert.equal(
    resolveSolveCoachmarkTrigger({
      landingCold: true,
      justBecameMapped: true,
      tourActive: false,
      mapped: true,
    }),
    SolveCoachmarkTrigger.SHOW,
  );
});

test("hash or returning landing never triggers coachmark", () => {
  assert.equal(
    resolveSolveCoachmarkTrigger({
      landingCold: false,
      justBecameMapped: true,
      tourActive: false,
      mapped: true,
    }),
    SolveCoachmarkTrigger.NONE,
  );
});

test("without justBecameMapped never triggers coachmark", () => {
  assert.equal(
    resolveSolveCoachmarkTrigger({
      landingCold: true,
      justBecameMapped: false,
      tourActive: false,
      mapped: true,
    }),
    SolveCoachmarkTrigger.NONE,
  );
});

test("unmapped lock never triggers coachmark", () => {
  assert.equal(
    resolveSolveCoachmarkTrigger({
      landingCold: true,
      justBecameMapped: true,
      tourActive: false,
      mapped: false,
    }),
    SolveCoachmarkTrigger.NONE,
  );
});
