import { StorageKeys, StorageFlag } from "./storage-keys.js";
import {
  OnboardingAction,
  OnboardingStepId,
  TutorNotShownReason,
} from "./analytics/values.js";
import { t } from "./i18n.js";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA = `(max-width: ${MOBILE_BREAKPOINT}px)`;
const TARGET_LOWER_RATIO = 0.45;
const FALLBACK_CARD_HEIGHT = 220;

export const ONBOARDING_STEPS = [
  {
    id: OnboardingStepId.MASTERY_TIER,
    target: ".controls .mastery-row",
    titleKey: "onboarding.step1.title",
    bodyKey: "onboarding.step1.body",
  },
  {
    id: OnboardingStepId.PLATE_COUNT,
    target: ".controls .locks-row",
    titleKey: "onboarding.step2.title",
    bodyKey: "onboarding.step2.body",
  },
  {
    id: OnboardingStepId.START_HOLES,
    target: ".tumbler-card:last-child .plate-holes",
    titleKey: "onboarding.step3.title",
    bodyKey: "onboarding.step3.body",
  },
  {
    id: OnboardingStepId.COUPLINGS,
    target: ".tumbler-card:last-child .link-chip-row",
    titleKey: "onboarding.step4.title",
    bodyKey: "onboarding.step4.body",
  },
];

const STEPS = ONBOARDING_STEPS;

export function createOnboarding({
  onDismissed,
  onComplete,
  onStarted,
  onNotShown,
  onSkipped,
}) {
  let backdrop;
  let cardHost;
  let stepIndex = 0;
  let active = false;
  let chipVisible = false;
  let resizeTimer;

  function measuredCardHeight() {
    const card = cardHost?.querySelector(".onboarding-card");
    return card ? card.offsetHeight + 24 : FALLBACK_CARD_HEIGHT;
  }

  function isDismissed() {
    try {
      return localStorage.getItem(StorageKeys.ONBOARDING_DISMISSED_V3) === StorageFlag.SET;
    } catch {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(StorageKeys.ONBOARDING_DISMISSED_V3, StorageFlag.SET);
    } catch {
      // ignore
    }
  }

  function isMobile() {
    return window.matchMedia(MOBILE_MEDIA).matches;
  }

  function stepContext() {
    const step = STEPS[stepIndex];
    return {
      stepId: step?.id,
      stepIndex,
      totalSteps: STEPS.length,
    };
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

  function targetNeedsTopCard(target) {
    const rect = target.getBoundingClientRect();
    return rect.top >= window.innerHeight * TARGET_LOWER_RATIO;
  }

  function updateCardPlacement(target) {
    if (!cardHost) return;

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

  async function applySpotlight(step, card) {
    let target = document.querySelector(step.target);
    if (!target) return;

    const cardAtTop = targetNeedsTopCard(target);
    updateCardPlacement(target);

    await scrollTargetIntoView(target, cardAtTop);

    target = document.querySelector(step.target);
    if (!target) return;

    updateCardPlacement(target);
    backdrop.hidden = false;
    target.classList.add("onboarding-target");

    const cleanup = () => document.querySelector(step.target)?.classList.remove("onboarding-target");
    card.querySelector(".onboarding-skip").addEventListener("click", cleanup, { once: true });
    card.querySelector(".onboarding-next").addEventListener("click", cleanup, { once: true });
  }

  function repositionCurrentStep() {
    if (!active) return;

    const step = STEPS[stepIndex];
    if (!step) return;

    const target = document.querySelector(step.target);
    if (target?.classList.contains("onboarding-target")) {
      updateCardPlacement(target);
      return;
    }

    if (target) updateCardPlacement(target);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(repositionCurrentStep, 150);
  }

  function removeLayers() {
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimer);
    document.body.classList.remove("onboarding-active", "onboarding-card-at-top", "onboarding-card-at-bottom");
    backdrop?.remove();
    cardHost?.remove();
    backdrop = null;
    cardHost = null;
    active = false;
  }

  function finish(completed) {
    const ctx = stepContext();
    const action = completed ? OnboardingAction.COMPLETE : OnboardingAction.SKIP;
    markDismissed();
    onDismissed?.({ completed, action, ...ctx });
    removeLayers();
    if (completed) onComplete?.();
  }

  function buildCard(step) {
    const card = document.createElement("div");
    card.className = "onboarding-card";
    const isFinal = stepIndex === STEPS.length - 1;
    card.innerHTML = `
      <p class="onboarding-kicker">${t("onboarding.kicker", { current: stepIndex + 1, total: STEPS.length })}</p>
      <h3 class="onboarding-title">${t(step.titleKey)}</h3>
      <p class="onboarding-body">${t(step.bodyKey)}</p>
      <div class="onboarding-actions">
        <button type="button" class="pill pill-ghost onboarding-skip">${t("onboarding.skip")}</button>
        <button type="button" class="pill pill-primary onboarding-next">${isFinal ? t("nav.done") : t("nav.next")}</button>
      </div>
    `;

    if (isFinal) {
      const note = document.createElement("p");
      note.className = "onboarding-footnote";
      note.textContent = t("onboarding.footnote");
      card.append(note);
    }

    return card;
  }

  function wireCard(card, step) {
    card.querySelector(".onboarding-skip").addEventListener("click", () => {
      onSkipped?.({ stepId: step.id, stepIndex, totalSteps: STEPS.length });
      finish(false);
    });
    card.querySelector(".onboarding-next").addEventListener("click", () => {
      stepIndex += 1;
      if (stepIndex >= STEPS.length) finish(true);
      else renderStep();
    });
  }

  function renderStep({ refreshOnly = false } = {}) {
    const step = STEPS[stepIndex];
    if (!step) {
      finish(true);
      return;
    }

    if (!refreshOnly) {
      document.querySelectorAll(".onboarding-target").forEach((node) => {
        node.classList.remove("onboarding-target");
      });
    }

    const target = document.querySelector(step.target);
    const host = ensureLayers();

    backdrop.hidden = false;
    cardHost.hidden = false;
    if (!refreshOnly && target) {
      updateCardPlacement(target);
    }

    const card = buildCard(step);
    host.replaceChildren(card);
    wireCard(card, step);

    if (refreshOnly) return;

    if (target) {
      void applySpotlight(step, card);
    }
  }

  function hideOptInChip() {
    chipVisible = false;
  }

  function showOptInChip() {
    if (isDismissed() || active) return false;
    chipVisible = true;
    return true;
  }

  function enterColdLanding() {
    if (showOptInChip()) return;
    onNotShown?.({ reason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
  }

  function startTour() {
    if (isDismissed() || active) return;
    hideOptInChip();
    active = true;
    stepIndex = 0;
    document.body.classList.add("onboarding-active");
    window.addEventListener("resize", onResize);
    onStarted?.({ totalSteps: STEPS.length });
    renderStep();
  }

  return {
    isActive: () => active,
    isChipVisible: () => chipVisible,
    refreshStep() {
      if (!active) return;
      renderStep({ refreshOnly: true });
    },
    showOptInChip,
    enterColdLanding,
    hideOptInChip,
    dismissOptInChip() {
      markDismissed();
      hideOptInChip();
      onNotShown?.({ reason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
    },
    startFromOptIn() {
      startTour();
    },
    start({ skip = false, skipReason = TutorNotShownReason.RETURNING_USER } = {}) {
      if (skip) {
        onNotShown?.({ reason: skipReason });
        return;
      }
      if (isDismissed()) {
        onNotShown?.({ reason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
        return;
      }
      startTour();
    },
  };
}
