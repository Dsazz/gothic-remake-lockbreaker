import { StorageKeys, StorageFlag } from "../storage-keys.js";
import { OnboardingAction, OnboardingStepId } from "../analytics/values.js";
import { t } from "../i18n/index.js";
import { createSpotlightRing } from "./spotlight-ring.js";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA = `(max-width: ${MOBILE_BREAKPOINT}px)`;
const DESKTOP_SEQUENCE_MEDIA = "(min-width: 900px)";
const FALLBACK_CARD_HEIGHT = 220;

export function createSolveCoachmark({ onDismissed }) {
  let backdrop;
  let cardHost;
  let active = false;
  let currentSolveBtn;
  let currentVariant;
  let solveListener;
  let backdropListener;
  const spotlightRing = createSpotlightRing();

  function isSeen() {
    try {
      return localStorage.getItem(StorageKeys.SOLVE_COACHMARK_SEEN) === StorageFlag.SET;
    } catch {
      return false;
    }
  }

  function markSeen() {
    try {
      localStorage.setItem(StorageKeys.SOLVE_COACHMARK_SEEN, StorageFlag.SET);
    } catch {
      // ignore
    }
  }

  function isMobile() {
    return window.matchMedia(MOBILE_MEDIA).matches;
  }

  function isDesktopSequenceLayout() {
    return window.matchMedia(DESKTOP_SEQUENCE_MEDIA).matches;
  }

  function measuredCardHeight() {
    const card = cardHost?.querySelector(".onboarding-card");
    return card ? card.offsetHeight + 24 : FALLBACK_CARD_HEIGHT;
  }

  function clearCardPlacementClasses() {
    cardHost?.classList.remove(
      "onboarding-card-host--mobile",
      "onboarding-card-host--mobile-top",
      "onboarding-card-host--desktop-sequence",
    );
    document.body.classList.remove("onboarding-card-at-top", "onboarding-card-at-bottom");
  }

  function updateCardPlacement() {
    if (!cardHost) return;
    clearCardPlacementClasses();

    if (isMobile()) {
      cardHost.classList.add("onboarding-card-host--mobile", "onboarding-card-host--mobile-top");
      document.body.classList.add("onboarding-card-at-top");
      return;
    }

    if (isDesktopSequenceLayout()) {
      cardHost.classList.add("onboarding-card-host--desktop-sequence");
    }
  }

  function mobileScrollMargins() {
    const reserve = measuredCardHeight();
    return { topReserve: reserve, bottomReserve: 24 };
  }

  function alignTargetInMobileViewport(target) {
    const { topReserve, bottomReserve } = mobileScrollMargins();
    const rect = target.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    let scrollDelta = 0;

    if (rect.top < topReserve) {
      scrollDelta = rect.top - topReserve;
    } else if (rect.bottom > viewHeight - bottomReserve) {
      scrollDelta = rect.bottom - (viewHeight - bottomReserve);
    }

    if (scrollDelta === 0) return Promise.resolve();

    window.scrollBy({ top: scrollDelta, behavior: "smooth" });
    return new Promise((resolve) => setTimeout(resolve, 320));
  }

  function scrollTargetIntoView(target) {
    if (isMobile()) {
      return alignTargetInMobileViewport(target);
    }
    return Promise.resolve();
  }

  function ensureLayers() {
    if (backdrop && cardHost) return cardHost;

    backdrop = document.createElement("div");
    backdrop.className = "onboarding-backdrop";
    backdrop.hidden = true;

    cardHost = document.createElement("div");
    cardHost.className = "onboarding-card-host";
    cardHost.hidden = true;

    document.body.append(backdrop, cardHost);
    return cardHost;
  }

  function buildCard(variant) {
    const isHashFailure = variant === "hash_failure";
    const titleKey = isHashFailure ? "coachmark.hashFailureTitle" : "coachmark.title";
    const bodyKey = isHashFailure ? "coachmark.hashFailureBody" : "coachmark.body";
    const card = document.createElement("div");
    card.className = "onboarding-card";
    card.innerHTML = `
      <h3 class="onboarding-title">${t(titleKey)}</h3>
      <p class="onboarding-body">${t(bodyKey)}</p>
    `;
    return card;
  }

  function removeLayers() {
    clearCardPlacementClasses();
    spotlightRing.clear();
    document.body.classList.remove("onboarding-active");
    backdrop?.remove();
    cardHost?.remove();
    backdrop = null;
    cardHost = null;
    active = false;
    currentSolveBtn = null;
  }

  function detachListeners(solveBtn) {
    if (solveListener && solveBtn) {
      solveBtn.removeEventListener("click", solveListener);
      solveListener = null;
    }
    if (backdropListener && backdrop) {
      backdrop.removeEventListener("click", backdropListener);
      backdropListener = null;
    }
  }

  function dismiss(action, solveBtn, { silent = false } = {}) {
    if (!active) return;
    const btn = solveBtn ?? currentSolveBtn;
    const isHashFailure = currentVariant === "hash_failure";
    if (!silent && !isHashFailure) {
      markSeen();
      onDismissed?.({
        completed: action === OnboardingAction.SOLVE,
        stepId: OnboardingStepId.SOLVE_COACHMARK,
        stepIndex: 0,
        action,
        totalSteps: 1,
      });
    }
    detachListeners(btn);
    removeLayers();
  }

  function dismissSilent() {
    dismiss(undefined, currentSolveBtn, { silent: true });
  }

  async function show(solveBtn, { variant } = {}) {
    if (!solveBtn || active) return;
    const isHashFailure = variant === "hash_failure";
    if (!isHashFailure && isSeen()) return;

    const host = ensureLayers();
    active = true;
    currentSolveBtn = solveBtn;
    currentVariant = variant;
    document.body.classList.add("onboarding-active");

    backdrop.hidden = false;
    cardHost.hidden = false;
    updateCardPlacement();

    host.replaceChildren(buildCard(variant));

    await scrollTargetIntoView(solveBtn);

    if (!active || currentSolveBtn !== solveBtn || !backdrop || !cardHost) return;

    updateCardPlacement();
    spotlightRing.show(solveBtn);

    solveListener = () => dismiss(OnboardingAction.SOLVE, solveBtn);
    backdropListener = () => dismiss(OnboardingAction.BACKDROP, solveBtn);
    solveBtn.addEventListener("click", solveListener, { once: true });
    backdrop.addEventListener("click", backdropListener, { once: true });
  }

  return {
    show,
    dismissSilent,
    isActive: () => active,
    refreshCopy() {
      if (!active || !cardHost) return;
      cardHost.replaceChildren(buildCard(currentVariant));
      spotlightRing.position();
    },
  };
}
