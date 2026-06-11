
function installStub() {
  if (window.posthog?.__SV) return;

  window.posthog = window.posthog || [];
  const stub = window.posthog;
  stub._i = stub._i || [];
  stub.init = function init(i, s, a) {
    let target = stub;
    if (a !== undefined) {
      target = stub[a] = [];
    } else {
      a = "posthog";
    }
    target.people = target.people || [];
    const methods =
      "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags identify setPersonProperties group resetGroups reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_property getSessionProperty".split(
        " ",
      );
    for (const name of methods) {
      target[name] = function (...args) {
        target.push([name, ...args]);
      };
    }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
    document.head.append(script);
    stub._i.push([i, s, a]);
    stub.__SV = 1;
  };
}

export function initPostHog() {
  if (["localhost", "127.0.0.1"].includes(location.hostname)) return;

  installStub();
  if (window.posthog.__loaded) return;

  window.posthog.init("phc_pryP4feC83sCWmTYDk335iBJruBuSaatcx8gw3Gn4XeA", {
    api_host: "https://e.gothiclockbreaker.com",
    ui_host: "https://eu.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    capture_performance: false,
    capture_exceptions: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    enable_heatmaps: false,
    capture_dead_clicks: false,
    advanced_disable_flags: true,
    loaded: (ph) => {
      ph.stopSessionRecording?.();
      window.dispatchEvent(new Event("posthog:ready"));
    },
  });
}
