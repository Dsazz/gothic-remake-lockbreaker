import { StorageKeys, StorageFlag } from "./storage-keys.js";
import { OnboardingAction, OnboardingStepId } from "./analytics/values.js";
import { t } from "./i18n.js";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA = `(max-width: ${MOBILE_BREAKPOINT}px)`;
const TARGET_LOWER_RATIO = 0.45;
const FALLBACK_CARD_HEIGHT = 220;

export function createSolveCoachmark({ onDismissed }) {
  let backdrop;
  let cardHost;
  let active = false;
  let currentSolveBtn;
  let solveListener;
  let backdropListener;

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

  function measuredCardHeight() {
    const card = cardHost?.querySelector(".onboarding-card");
    return card ? card.offsetHeight + 24 : FALLBACK_CARD_HEIGHT;
  }

  function targetNeedsTopCard(target) {
    const rect = target.getBoundingClientRect();
    return rect.top >= window.innerHeight * TARGET_LOWER_RATIO;
  }

  function clearMobileCardClasses() {
    cardHost?.classList.remove("onboarding-card-host--mobile", "onboarding-card-host--mobile-top");
    document.body.classList.remove("onboarding-card-at-top", "onboarding-card-at-bottom");
  }

  function updateMobileCardPlacement(target) {
    if (!cardHost || !isMobile()) {
      clearMobileCardClasses();
      return;
    }

    const cardAtTop = targetNeedsTopCard(target);
    cardHost.classList.add("onboarding-card-host--mobile");
    cardHost.classList.toggle("onboarding-card-host--mobile-top", cardAtTop);
    document.body.classList.toggle("onboarding-card-at-top", cardAtTop);
    document.body.classList.toggle("onboarding-card-at-bottom", !cardAtTop);
  }

  function mobileScrollMargins(cardAtTop) {
    const reserve = measuredCardHeight();
    const topReserve = cardAtTop ? reserve : 12;
    return { topReserve, bottomReserve: 24 };
  }

  function alignTargetInMobileViewport(target, cardAtTop) {
    const { topReserve, bottomReserve } = mobileScrollMargins(cardAtTop);
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

  function scrollTargetIntoView(target, cardAtTop) {
    if (!isMobile()) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      return Promise.resolve();
    }

    target.scrollIntoView({ behavior: "instant", block: "nearest" });

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          alignTargetInMobileViewport(target, cardAtTop).then(resolve);
        });
      });
    });
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

  function buildCard() {
    const card = document.createElement("div");
    card.className = "onboarding-card";
    card.innerHTML = `
      <h3 class="onboarding-title">${t("coachmark.title")}</h3>
      <p class="onboarding-body">${t("coachmark.body")}</p>
    `;
    return card;
  }

  function removeLayers() {
    document.body.classList.remove("onboarding-active", "onboarding-card-at-top", "onboarding-card-at-bottom");
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
    if (!silent) {
      markSeen();
      onDismissed?.({
        completed: action === OnboardingAction.SOLVE,
        stepId: OnboardingStepId.SOLVE_COACHMARK,
        stepIndex: 0,
        action,
        totalSteps: 1,
      });
    }
    btn?.classList.remove("onboarding-target");
    detachListeners(btn);
    removeLayers();
  }

  function dismissSilent() {
    dismiss(undefined, currentSolveBtn, { silent: true });
  }

  async function show(solveBtn) {
    if (!solveBtn || active || isSeen()) return;

    const mobile = isMobile();
    let cardAtTop = false;

    if (mobile) {
      cardAtTop = targetNeedsTopCard(solveBtn);
      updateMobileCardPlacement(solveBtn);
    } else {
      clearMobileCardClasses();
    }

    const host = ensureLayers();
    active = true;
    currentSolveBtn = solveBtn;
    document.body.classList.add("onboarding-active");

    backdrop.hidden = false;
    cardHost.hidden = false;
    clearMobileCardClasses();
    if (mobile) cardHost.classList.add("onboarding-card-host--mobile");

    host.replaceChildren(buildCard());

    await scrollTargetIntoView(solveBtn, cardAtTop);

    if (!active || currentSolveBtn !== solveBtn) return;

    if (mobile) {
      updateMobileCardPlacement(solveBtn);
    }

    solveBtn.classList.add("onboarding-target");

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
      cardHost.replaceChildren(buildCard());
    },
  };
}
