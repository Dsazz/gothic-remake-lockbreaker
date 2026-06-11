import { landingPageviewProps, readLandingAttribution } from "./attribution.js";
import { isEnabled, runWhenPostHogReady, send } from "./transport.js";

const PRESENCE_MS = 45_000;

/** Keeps long sessions visible in Web Analytics Live (replaces autocapture activity). */
export function installWebAnalyticsPresence() {
  if (!isEnabled()) return;

  let intervalId = null;

  const ping = () => {
    if (document.visibilityState !== "visible") return;
    send(
      "$pageview",
      landingPageviewProps(readLandingAttribution(), { web_presence: true }),
    );
  };

  const start = () => {
    if (intervalId !== null) return;
    intervalId = window.setInterval(ping, PRESENCE_MS);
  };

  const stop = () => {
    if (intervalId === null) return;
    window.clearInterval(intervalId);
    intervalId = null;
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ping();
      start();
    } else {
      stop();
    }
  });

  runWhenPostHogReady(start);
}
