export function send(event, properties) {
  window.posthog?.capture?.(event, properties);
}

export function isEnabled() {
  return typeof window.posthog?.capture === "function";
}
