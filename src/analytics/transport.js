const SCRIPT_ERROR_PATTERN = /^script error\.?$/i;

const IGNORED_MESSAGE_PATTERNS = [
  SCRIPT_ERROR_PATTERN,
  /showSearchResults/,
  /^he$/i,
  /WKWebView API client did not respond/,
  /^No response$/i,
  /runtime\.sendMessage\(\).*Tab not found/i,
  /window\.ethereum\.selectedAddress/,
  /Can't find variable: __firefox__/,
  /standardSelectors/,
];

// PostHog stores exceptions as "<Type>: <message>" in $exception_values, while our
// own window.error handler passes the bare message. Strip the type prefix so anchored
// patterns (e.g. /^he$/i) match both representations.
const ERROR_TYPE_PREFIX = /^[A-Za-z]*Error:\s+/;

let capturing = false;

export function isReportableError(message) {
  const text = String(message ?? "").trim();
  if (!text) return true;
  const withoutType = text.replace(ERROR_TYPE_PREFIX, "");
  const candidates = withoutType === text ? [text] : [text, withoutType];
  return !candidates.some((candidate) =>
    IGNORED_MESSAGE_PATTERNS.some((pattern) => pattern.test(candidate)),
  );
}

export function isReportableExceptionProperties(properties) {
  const values = properties?.$exception_values;
  if (Array.isArray(values) && values.some((value) => !isReportableError(value))) {
    return false;
  }
  const list = properties?.$exception_list;
  if (Array.isArray(list) && list.some((entry) => !isReportableError(entry?.value))) {
    return false;
  }
  return true;
}

function captureExceptionSafely(error, properties) {
  const message = String(error?.message ?? "").trim();
  if (capturing || !isReportableError(message)) return;
  capturing = true;
  try {
    window.posthog.captureException?.(error, properties);
  } finally {
    capturing = false;
  }
}

export function runWhenPostHogReady(fn) {
  const ph = window.posthog;
  if (!ph) return;
  if (ph.__loaded) {
    fn();
    return;
  }
  window.addEventListener("posthog:ready", () => fn(), { once: true });
}

export function send(event, properties) {
  window.posthog?.capture?.(event, properties);
}

export function sendWhenReady(event, properties) {
  runWhenPostHogReady(() => send(event, properties));
}

export function sendOnPageHide(event, properties) {
  if (window.posthog?.capture) {
    window.posthog.capture(event, properties);
    return;
  }
  if (typeof navigator.sendBeacon !== "function") return;
  const payload = JSON.stringify({
    event,
    properties: { ...properties, $lib: "web" },
  });
  navigator.sendBeacon("/ingest/e/", payload);
}

export function registerSessionProperties(properties) {
  window.posthog?.register?.(properties);
}

export function isEnabled() {
  return typeof window.posthog?.capture === "function";
}

export function installErrorCapture() {
  if (!isEnabled()) return;

  window.addEventListener("error", (event) => {
    const message = event.message || event.error?.message || "";
    if (!isReportableError(message)) return;
    captureExceptionSafely(event.error ?? new Error(message), {
      source: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    if (!isReportableError(message)) return;
    const error = reason instanceof Error ? reason : new Error(message);
    captureExceptionSafely(error, { source: "unhandledrejection" });
  });
}
