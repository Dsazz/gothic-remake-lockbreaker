import { test } from "node:test";
import assert from "node:assert/strict";
import { isReportableError } from "../src/analytics/transport.js";

test("isReportableError drops cross-origin script noise", () => {
  assert.equal(isReportableError("Script error."), false);
  assert.equal(isReportableError("script error"), false);
});

test("isReportableError drops Safari autocomplete extension noise", () => {
  const message =
    "TypeError: undefined is not an object (evaluating 'response.showSearchResults')";
  assert.equal(isReportableError(message), false);
});

test("isReportableError keeps real application errors", () => {
  assert.equal(isReportableError("RangeError: Maximum call stack size exceeded"), true);
  assert.equal(isReportableError(""), true);
});
