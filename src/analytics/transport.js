export function send(event, properties) {
  window.posthog?.capture?.(event, properties);
}

export function isEnabled() {
  return typeof window.posthog?.capture === "function";
}

export function installErrorCapture() {
  if (!isEnabled()) return;

  window.addEventListener("error", (event) => {
    window.posthog.captureException?.(event.error ?? new Error(event.message), {
      source: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    window.posthog.captureException?.(error, { source: "unhandledrejection" });
  });
}
