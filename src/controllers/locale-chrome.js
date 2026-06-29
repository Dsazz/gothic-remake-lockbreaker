import { VERSION } from "../version.js";
import * as view from "../view/index.js";
import {
  getLocale,
  getLocaleSource,
  setLocale,
  isDefaultLocale,
  LocaleSource,
  DEFAULT_LOCALE,
} from "../i18n/index.js";
import {
  isLocaleSuggestEligible,
  LocaleHintSource,
  resolveGeoLocaleHint,
  resolveNavigatorLocaleHint,
  resolveReferrerLocaleHint,
} from "../i18n/locale-suggest.js";
import { waitForGeoCountryCode as defaultWaitForGeoCountryCode } from "../analytics/geo-hint.js";
import { applyStaticContent } from "../i18n/static-content.js";
import { renderLocaleSwitcher } from "../i18n/locale-switcher.js";
import {
  GuideSource,
  LocaleChangeSource,
  LocaleSuggestDeclineAction,
  PromptKind,
  SupportSource,
} from "../analytics/values.js";
import {
  trackGuideOpened,
  trackI18nBannerShown,
  trackLocaleSuggestShown,
  trackLocaleSuggestAccepted,
  trackLocaleSuggestDeclined,
  trackPromptDismissed,
  trackSupportLinkClicked,
  trackLocaleChanged,
  trackTranslationFeedbackClicked,
} from "../analytics/index.js";

export function createLocaleChromeController({
  store,
  els,
  uiPrefs,
  onboarding,
  solveCoachmark,
  solve,
  onRenderLocaleChrome,
  onRerender,
  waitForGeoCountryCode = defaultWaitForGeoCountryCode,
}) {
  let i18nBannerTracked = false;
  let localeSuggestTracked = false;
  let lastI18nBannerVisible = null;
  let lastLocaleSuggestVisible = null;
  let lastRenderedLocale = null;
  let localeSwitchCount = 0;
  let previousLocale = DEFAULT_LOCALE;
  let localeSuggestDismissed = uiPrefs.isLocaleSuggestDismissed();
  let activeLocaleHint = null;
  let geoPollInFlight = false;

  function shouldShowI18nBanner() {
    if (uiPrefs.isI18nBannerDismissed()) return false;
    if (onboarding.isActive()) return false;
    if (solveCoachmark.isActive()) return false;
    return true;
  }

  function localeSuggestEligibility() {
    return isLocaleSuggestEligible({
      localeSource: getLocaleSource(),
      storedLocale: uiPrefs.getStoredLocale(),
      dismissed: localeSuggestDismissed,
      activeLocale: getLocale(),
    });
  }

  function ensureLocaleHint() {
    if (activeLocaleHint) return activeLocaleHint;
    const referrerHint = resolveReferrerLocaleHint(document.referrer);
    if (referrerHint) {
      activeLocaleHint = referrerHint;
      return activeLocaleHint;
    }
    const navigatorHint = resolveNavigatorLocaleHint();
    if (navigatorHint) activeLocaleHint = navigatorHint;
    return activeLocaleHint;
  }

  function hasGeoLocaleHint() {
    return activeLocaleHint?.hintSource === LocaleHintSource.GEO;
  }

  function maybeStartGeoHintWait() {
    if (geoPollInFlight || localeSuggestDismissed || hasGeoLocaleHint()) return;
    if (resolveReferrerLocaleHint(document.referrer)) return;

    geoPollInFlight = true;
    waitForGeoCountryCode({
      onResolved: (countryCode) => {
        geoPollInFlight = false;
        const hint = resolveGeoLocaleHint(countryCode);
        if (!hint || localeSuggestDismissed) return;
        activeLocaleHint = hint;
        if (localeSuggestEligibility()) onRenderLocaleChrome();
      },
      onTimeout: () => {
        geoPollInFlight = false;
      },
      isCancelled: () => localeSuggestDismissed,
    });
  }

  function shouldShowLocaleSuggest() {
    if (localeSuggestDismissed || !localeSuggestEligibility()) return false;
    return ensureLocaleHint() !== null;
  }

  function dismissLocaleSuggest() {
    localeSuggestDismissed = true;
    uiPrefs.dismissLocaleSuggest();
  }

  function openGuide(source = GuideSource.MANUAL) {
    if (!els.guide) return;
    els.guide.open = true;
    trackGuideOpened({ source });
    const block = window.matchMedia("(max-width: 768px)").matches ? "start" : "nearest";
    els.guide.scrollIntoView({ behavior: "smooth", block });
  }

  function computeBannerSnapshot() {
    const locale = getLocale();
    const localeSuggestVisible = shouldShowLocaleSuggest();
    const localeSuggestHint = localeSuggestVisible ? ensureLocaleHint() : null;
    const i18nBannerVisible =
      shouldShowI18nBanner() && !localeSuggestVisible && !isDefaultLocale(locale);
    return { locale, localeSuggestVisible, localeSuggestHint, i18nBannerVisible };
  }

  function syncTracking() {
    const snapshot = computeBannerSnapshot();
    const { locale, localeSuggestVisible, localeSuggestHint, i18nBannerVisible } = snapshot;

    if (localeSuggestVisible && localeSuggestHint && !localeSuggestTracked) {
      localeSuggestTracked = true;
      trackLocaleSuggestShown({
        suggestedLocale: localeSuggestHint.locale,
        hintSource: localeSuggestHint.hintSource,
      });
    }

    maybeStartGeoHintWait();

    if (i18nBannerVisible && !i18nBannerTracked) {
      i18nBannerTracked = true;
      trackI18nBannerShown({ locale });
    }

    return snapshot;
  }

  function render(handlers, tracking) {
    view.renderVersionBadge(els.version, VERSION);
    view.renderHeadPortrait(els.headPortrait, handlers);
    view.renderHeadSupport(els.headSupport, handlers);
    view.renderHeadSleeper(els.headSleeper, handlers);
    renderLocaleSwitcher(els.headLang);
    view.renderFooter(els.foot, VERSION, handlers);
    applyStaticContent();

    const { locale, localeSuggestVisible, localeSuggestHint, i18nBannerVisible } = tracking;
    const bannerDirty =
      localeSuggestVisible !== lastLocaleSuggestVisible ||
      i18nBannerVisible !== lastI18nBannerVisible ||
      locale !== lastRenderedLocale;

    if (bannerDirty) {
      lastLocaleSuggestVisible = localeSuggestVisible;
      lastI18nBannerVisible = i18nBannerVisible;
      lastRenderedLocale = locale;
      view.renderLocaleSuggest(
        els.localeSuggest,
        {
          visible: localeSuggestVisible,
          suggestedLocale: localeSuggestHint?.locale,
          hintSource: localeSuggestHint?.hintSource,
        },
        handlers,
      );
      view.renderI18nBanner(els.i18nBanner, { visible: i18nBannerVisible }, handlers);
    }
  }

  function handleLocaleChange(locale, changeSource = LocaleChangeSource.SWITCHER) {
    localeSwitchCount += 1;
    trackLocaleChanged({
      locale,
      previousLocale,
      source: changeSource,
      switchCount: localeSwitchCount,
    });
    previousLocale = locale;
    solve.onLocaleChangeRefresh();
    onboarding.refreshStep();
    solveCoachmark.refreshCopy();
    onRenderLocaleChrome();
    onRerender();
  }

  function setInitialLocale(locale) {
    previousLocale = locale;
  }

  const handlers = {
    onDismissI18nBanner() {
      uiPrefs.dismissI18nBanner();
      trackPromptDismissed({
        prompt: PromptKind.I18N_BANNER,
        plateCount: store.getState().plateCount,
      });
      onRenderLocaleChrome();
    },
    async onAcceptLocaleSuggest() {
      const hint = ensureLocaleHint();
      if (!hint) return;
      trackLocaleSuggestAccepted({
        suggestedLocale: hint.locale,
        hintSource: hint.hintSource,
      });
      dismissLocaleSuggest();
      await setLocale(hint.locale, {
        changeSource: LocaleChangeSource.SUGGEST_BAR,
        localeSource: LocaleSource.SUGGEST,
      });
      onRenderLocaleChrome();
    },
    onDeclineLocaleSuggest({ explicit }) {
      const hint = ensureLocaleHint();
      if (!hint) return;
      trackLocaleSuggestDeclined({
        suggestedLocale: hint.locale,
        hintSource: hint.hintSource,
        declineAction: explicit
          ? LocaleSuggestDeclineAction.ENGLISH
          : LocaleSuggestDeclineAction.DISMISS,
      });
      dismissLocaleSuggest();
      onRenderLocaleChrome();
    },
    onOpenGuide(source = GuideSource.MANUAL) {
      openGuide(source);
    },
    onSupportClick(source = SupportSource.FOOTER_STRIP) {
      trackSupportLinkClicked({
        source,
        plateCount: store.getState().plateCount,
        locale: getLocale(),
      });
    },
    onTranslationFeedbackClick() {
      trackTranslationFeedbackClicked({ locale: getLocale() });
    },
  };

  return {
    handlers,
    syncTracking,
    render,
    handleLocaleChange,
    setInitialLocale,
    openGuideOnboardingComplete: () => openGuide(GuideSource.ONBOARDING_COMPLETE),
  };
}
