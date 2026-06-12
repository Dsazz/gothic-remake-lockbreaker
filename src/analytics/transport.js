const SCRIPT_ERROR_PATTERN = /^script error\.?$/i;

const IGNORED_MESSAGE_PATTERNS = [
  SCRIPT_ERROR_PATTERN,
  /showSearchResults/,
  /^he$/i,
  /WKWebView API client did not respond/,
];

let capturing = false;

export function isReportableError(message) {
  const text = String(message ?? "").trim();
  if (!text) return true;
  return !IGNORED_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

function captureExceptionSafely(error, properties) {
  if (capturing || !isReportableError(error?.message)) return;
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
