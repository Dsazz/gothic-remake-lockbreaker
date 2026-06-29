// Deferred-analytics runtime: owns the lazily-imported analytics module so the
// composition root holds one handle instead of the promise, the posthog-init
// import, and the locale enums. `when()` runs a callback once analytics has
// loaded; `deferStartup()` boots PostHog after first paint on an idle callback.

import { LocaleSource, DEFAULT_LOCALE } from "../i18n/index.js";
import { LocaleAutoHintSource } from "./values.js";

const IDLE_TIMEOUT_MS = 3000;
const CALLBACK_ERROR = "Gothic Lock Breaker analytics callback failed";
const STARTUP_ERROR = "Gothic Lock Breaker analytics failed to start";

function scheduleIdle(run) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  } else {
    queueMicrotask(run);
  }
}

export function createAnalyticsRuntime() {
  const analyticsPromise = import("./index.js");

  function when(run) {
    analyticsPromise.then(run).catch((err) => {
      console.error(CALLBACK_ERROR, err);
    });
  }

  function deferStartup({ landingType, localeCode, localeSource }) {
    const run = async () => {
      const [{ initPostHog }, analytics] = await Promise.all([
        import("./posthog-init.js"),
        analyticsPromise,
      ]);
      initPostHog();
      analytics.installErrorCapture();
      analytics.installLocaleEngagementTracking();
      analytics.trackLocaleResolved({ locale: localeCode, localeSource });
      analytics.trackLanding({ landingType, locale: localeCode, localeSource });
      const queryLang = new URLSearchParams(location.search).get("lang");
      if (
        localeSource === LocaleSource.QUERY &&
        !queryLang &&
        localeCode !== DEFAULT_LOCALE
      ) {
        analytics.trackLocaleAutoApplied({
          locale: localeCode,
          hintSource: LocaleAutoHintSource.REFERRER,
        });
      }
    };

    scheduleIdle(() => {
      run().catch((err) => console.error(STARTUP_ERROR, err));
    });
  }

  return { when, deferStartup };
}
