import { parseReferrerHost } from "../locale-suggest.js";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/**
 * First-touch referrer and UTM params for the landing event and session props.
 * @param {{ referrer?: string, search?: string }} [env]
 */
export function readLandingAttribution(env = {}) {
  const referrer = env.referrer ?? (typeof document !== "undefined" ? document.referrer : "");
  const search = env.search ?? (typeof location !== "undefined" ? location.search : "");
  const params = new URLSearchParams(search);
  const props = {};

  if (referrer) {
    props.referrer = referrer;
    const host = parseReferrerHost(referrer);
    if (host) props.referrer_host = host;
  }

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) props[key] = value;
  }

  return props;
}

function readWebLocationProps() {
  if (typeof location === "undefined") return {};
  return {
    $current_url: location.href,
    $host: location.host,
    $pathname: `${location.pathname}${location.search}`,
  };
}

/** Maps attribution onto PostHog Web Analytics pageview properties. */
export function landingPageviewProps(attribution, extra = {}) {
  const props = { ...readWebLocationProps(), ...extra, ...attribution };
  if (attribution.referrer) props.$referrer = attribution.referrer;
  if (attribution.referrer_host) props.$referring_domain = attribution.referrer_host;
  return props;
}
