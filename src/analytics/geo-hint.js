const GEO_PROPERTY = "$geoip_country_code";

export function readGeoCountryCode() {
  const code = globalThis.posthog?.get_property?.(GEO_PROPERTY);
  return typeof code === "string" && code.length > 0 ? code : null;
}

export function waitForGeoCountryCode({
  timeoutMs = 3000,
  intervalMs = 200,
  onResolved,
  onTimeout,
  isCancelled = () => false,
}) {
  const started = Date.now();

  function poll() {
    if (isCancelled()) return;

    const code = readGeoCountryCode();
    if (code) {
      onResolved(code);
      return;
    }

    if (Date.now() - started >= timeoutMs) {
      onTimeout?.();
      return;
    }
    setTimeout(poll, intervalMs);
  }

  poll();
}
