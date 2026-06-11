import { test, mock } from "node:test";
import assert from "node:assert/strict";

globalThis.window = globalThis;
globalThis.posthog = { capture: mock.fn(), get_property: () => null };
globalThis.document = { referrer: "" };

const { createLocaleChromeController } = await import("../src/locale-chrome-controller.js");
const { LocaleHintSource } = await import("../src/locale-suggest.js");

function buildController({
  onboardingActive = false,
  coachmarkActive = false,
  dismissed = false,
  storedLocale = null,
  referrer = "",
  i18nBannerDismissed = true,
  onRenderLocaleChrome = mock.fn(),
  waitForGeoCountryCode = mock.fn(),
  onboarding = null,
}) {
  globalThis.document.referrer = referrer;

  return createLocaleChromeController({
    store: { getState: () => ({ plateCount: 3 }) },
    els: {
      version: null,
      headSupport: null,
      headLang: null,
      foot: null,
      localeSuggest: null,
      i18nBanner: null,
      guide: null,
    },
    uiPrefs: {
      isLocaleSuggestDismissed: () => dismissed,
      dismissLocaleSuggest: mock.fn(),
      isI18nBannerDismissed: () => i18nBannerDismissed,
      dismissI18nBanner: mock.fn(),
      getStoredLocale: () => storedLocale,
    },
    onboarding: onboarding ?? {
      isActive: () => onboardingActive,
      refreshStep: mock.fn(),
    },
    solveCoachmark: {
      isActive: () => coachmarkActive,
      refreshCopy: mock.fn(),
    },
    solve: { onLocaleChangeRefresh: mock.fn() },
    onRenderLocaleChrome,
    onRerender: mock.fn(),
    waitForGeoCountryCode,
  });
}

test("syncTracking starts geo poll even while onboarding is active", () => {
  const geoWait = mock.fn();
  const controller = buildController({
    onboardingActive: true,
    waitForGeoCountryCode: geoWait,
  });

  controller.syncTracking();
  assert.equal(geoWait.mock.callCount(), 1);
});

test("referrer locale suggest shows while onboarding is active", () => {
  const controller = buildController({
    onboardingActive: true,
    referrer: "https://www.pcgames.de/article",
  });
  const snapshot = controller.syncTracking();
  assert.equal(snapshot.localeSuggestVisible, true);
  assert.equal(snapshot.localeSuggestHint?.locale, "de");
  assert.equal(snapshot.localeSuggestHint?.hintSource, LocaleHintSource.REFERRER);
});

test("geo hint shows during onboarding once resolved", () => {
  let resolveGeo;
  const controller = buildController({
    onboardingActive: true,
    waitForGeoCountryCode: (config) => {
      resolveGeo = config.onResolved;
    },
  });

  controller.syncTracking();
  assert.equal(controller.syncTracking().localeSuggestVisible, false);

  resolveGeo("DE");
  const snapshot = controller.syncTracking();
  assert.equal(snapshot.localeSuggestVisible, true);
  assert.equal(snapshot.localeSuggestHint?.locale, "de");
  assert.equal(snapshot.localeSuggestHint?.hintSource, LocaleHintSource.GEO);
});

test("syncTracking retries geo poll after timeout", () => {
  const geoWait = mock.fn();
  const controller = buildController({ waitForGeoCountryCode: geoWait });

  controller.syncTracking();
  assert.equal(geoWait.mock.callCount(), 1);

  const onTimeout = geoWait.mock.calls[0].arguments[0].onTimeout;
  onTimeout();
  controller.syncTracking();
  assert.equal(geoWait.mock.callCount(), 2);
});

test("syncTracking skips geo poll when referrer already implies a locale", () => {
  const geoWait = mock.fn();
  const controller = buildController({
    referrer: "https://www.pcgames.de/article",
    waitForGeoCountryCode: geoWait,
  });

  controller.syncTracking();
  assert.equal(geoWait.mock.callCount(), 0);
});

test("i18n banner stays hidden while locale suggest is visible", () => {
  const controller = buildController({
    referrer: "https://www.pcgames.de/article",
    i18nBannerDismissed: false,
  });
  const snapshot = controller.syncTracking();
  assert.equal(snapshot.localeSuggestVisible, true);
  assert.equal(snapshot.i18nBannerVisible, false);
});

test("i18n banner is hidden on default English locale", () => {
  const controller = buildController({ i18nBannerDismissed: false });
  const snapshot = controller.syncTracking();
  assert.equal(snapshot.i18nBannerVisible, false);
});

test("syncTracking does not restart geo poll once a geo hint is stored", () => {
  let resolveGeo;
  const geoWait = mock.fn((config) => {
    resolveGeo = config.onResolved;
  });
  const controller = buildController({ waitForGeoCountryCode: geoWait });

  controller.syncTracking();
  resolveGeo("PL");
  controller.syncTracking();
  assert.equal(geoWait.mock.callCount(), 1);
});
