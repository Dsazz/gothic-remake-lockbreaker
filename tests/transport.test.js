import { test } from "node:test";
import assert from "node:assert/strict";
import { isReportableError, isReportableExceptionProperties } from "../src/analytics/transport.js";

test("isReportableError drops cross-origin script noise", () => {
  assert.equal(isReportableError("Script error."), false);
  assert.equal(isReportableError("script error"), false);
});

test("isReportableError drops Safari autocomplete extension noise", () => {
  const message =
    "TypeError: undefined is not an object (evaluating 'response.showSearchResults')";
  assert.equal(isReportableError(message), false);
});

test("isReportableError drops iOS in-app browser noise", () => {
  assert.equal(isReportableError("he"), false);
  assert.equal(
    isReportableError(
      "Error: WKWebView API client did not respond to this postMessage",
    ),
    false,
  );
});

test("isReportableError drops bare 'No response' rejection noise", () => {
  assert.equal(isReportableError("No response"), false);
  assert.equal(isReportableError("Error: No response"), false);
  assert.equal(isReportableError("Server returned No response body for /flags"), true);
});

test("isReportableError drops anchored noise carrying a PostHog error-type prefix", () => {
  assert.equal(isReportableError("Error: he"), false);
  assert.equal(isReportableError("TypeError: he"), false);
  assert.equal(isReportableError("the header"), true);
});

test("isReportableError drops browser extension messaging noise", () => {
  assert.equal(
    isReportableError("Error: Invalid call to runtime.sendMessage(). Tab not found."),
    false,
  );
});

test("isReportableError drops password-manager extension noise", () => {
  assert.equal(
    isReportableError(
      "TypeError: undefined is not an object (evaluating 'n.standardSelectors')",
    ),
    false,
  );
});

test("isReportableError drops wallet and Firefox extension injection noise", () => {
  assert.equal(
    isReportableError(
      "TypeError: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')",
    ),
    false,
  );
  assert.equal(isReportableError("ReferenceError: Can't find variable: __firefox__"), false);
});

test("isReportableError keeps real application errors", () => {
  assert.equal(isReportableError("RangeError: Maximum call stack size exceeded"), true);
  assert.equal(isReportableError(""), true);
});

test("isReportableExceptionProperties drops ignored exception payloads", () => {
  assert.equal(
    isReportableExceptionProperties({
      $exception_values: ["Error: WKWebView API client did not respond to this postMessage"],
    }),
    false,
  );
  assert.equal(
    isReportableExceptionProperties({
      $exception_list: [{ value: "TypeError: Cannot set properties of null (setting 'hidden')" }],
    }),
    true,
  );
  assert.equal(
    isReportableExceptionProperties({
      $exception_values: ["Error: he"],
      $exception_list: [{ value: "Error: he" }],
    }),
    false,
  );
});
