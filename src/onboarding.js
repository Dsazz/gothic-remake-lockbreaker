import { StorageKeys } from "./storage-keys.js";
import {
  OnboardingAction,
  OnboardingStepId,
  TutorNotShownReason,
} from "./analytics/values.js";

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA = `(max-width: ${MOBILE_BREAKPOINT}px)`;
const TARGET_LOWER_RATIO = 0.45;
const ESTIMATED_CARD_HEIGHT = 220;

export const ONBOARDING_STEPS = [
  {
    id: OnboardingStepId.MASTERY_TIER,
    target: ".controls .mastery-row",
    title: "Step 1 · Lockpicking tier",
    body: "Pick your Fingers training level. Default Untrained is fine. Training changes mistake budget only — not how plates move.",
  },
  {
    id: OnboardingStepId.PLATE_COUNT,
    target: ".controls .locks-row",
    title: "Step 2 · Count the locks",
    body: "Match the number of plates in the mechanism (4–7). Default is 6.",
  },
  {
    id: OnboardingStepId.START_HOLES,
    target: ".tumbler-card:last-child .plate-holes",
    title: "Step 3 · Starting holes",
    body: "Tap each pin's hole. 1 and 7 are walls; 4 is the notch (goal).",
  },
  {
    id: OnboardingStepId.COUPLINGS,
    target: ".tumbler-card:last-child .link-chip-row",
    title: "Step 4 · Couplings",
    body: "In-game, turn this lock once. Each lock that moves — tap its chip to With or Against. Master: tap Gone beside a coupling after a snapped pick drops it.",
  },
];

const STEPS = ONBOARDING_STEPS;

export function createOnboarding({
  onStepViewed,
  onDismissed,
  onComplete,
  onStarted,
  onNotShown,
  onNextClicked,
  onSkipped,
}) {
  let backdrop;
  let cardHost;
  let stepIndex = 0;
  let active = false;
  let resizeTimer;

  function isDismissed() {
    try {
      return localStorage.getItem(StorageKeys.ONBOARDING_DISMISSED_V3) === "1";
    } catch {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(StorageKeys.ONBOARDING_DISMISSED_V3, "1");
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

  function clearMobileCardClasses() {
    cardHost?.classList.remove("onboarding-card-host--mobile", "onboarding-card-host--mobile-top");
    document.body.classList.remove("onboarding-card-at-top", "onboarding-card-at-bottom");
  }

  function targetNeedsTopCard(target) {
    const rect = target.getBoundingClientRect();
    return rect.top >= window.innerHeight * TARGET_LOWER_RATIO;
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
    const topReserve = cardAtTop ? ESTIMATED_CARD_HEIGHT + 24 : 12;
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

  async function applySpotlight(target, card) {
    const mobile = isMobile();
    let cardAtTop = false;

    if (mobile) {
      cardAtTop = targetNeedsTopCard(target);
      updateMobileCardPlacement(target);
    } else {
      clearMobileCardClasses();
    }

    backdrop.hidden = true;
    await scrollTargetIntoView(target, cardAtTop);

    if (mobile) {
      updateMobileCardPlacement(target);
    }

    target.classList.add("onboarding-target");

    const cleanup = () => target.classList.remove("onboarding-target");
    card.querySelector(".onboarding-skip").addEventListener("click", cleanup, { once: true });
    card.querySelector(".onboarding-next").addEventListener("click", cleanup, { once: true });
  }

  function repositionCurrentStep() {
    if (!active) return;

    const step = STEPS[stepIndex];
    if (!step) return;

    const target = document.querySelector(step.target);
    if (target?.classList.contains("onboarding-target")) {
      updateMobileCardPlacement(target);
      return;
    }

    if (isMobile()) {
      cardHost?.classList.add("onboarding-card-host--mobile");
      cardHost?.classList.remove("onboarding-card-host--mobile-top");
    } else {
      clearMobileCardClasses();
    }
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

  function renderStep() {
    const step = STEPS[stepIndex];
    if (!step) {
      finish(true);
      return;
    }

    document.querySelectorAll(".onboarding-target").forEach((node) => {
      node.classList.remove("onboarding-target");
    });

    onStepViewed?.({ stepId: step.id });

    const target = document.querySelector(step.target);
    const host = ensureLayers();
    const mobile = isMobile();

    backdrop.hidden = false;
    cardHost.hidden = false;
    clearMobileCardClasses();
    if (mobile) cardHost.classList.add("onboarding-card-host--mobile");

    const card = document.createElement("div");
    card.className = "onboarding-card";
    card.innerHTML = `
      <p class="onboarding-kicker">${stepIndex + 1} / ${STEPS.length}</p>
      <h3 class="onboarding-title">${step.title}</h3>
      <p class="onboarding-body">${step.body}</p>
      <div class="onboarding-actions">
        <button type="button" class="pill pill-ghost onboarding-skip">Skip tour</button>
        <button type="button" class="pill pill-primary onboarding-next">${stepIndex === STEPS.length - 1 ? "Done" : "Next"}</button>
      </div>
    `;

    host.replaceChildren(card);

    card.querySelector(".onboarding-skip").addEventListener("click", () => {
      onSkipped?.({ stepId: step.id, stepIndex, totalSteps: STEPS.length });
      finish(false);
    });
    card.querySelector(".onboarding-next").addEventListener("click", () => {
      const isFinal = stepIndex === STEPS.length - 1;
      onNextClicked?.({ stepId: step.id, stepIndex, totalSteps: STEPS.length, isFinal });
      stepIndex += 1;
      if (stepIndex >= STEPS.length) finish(true);
      else renderStep();
    });

    if (target) {
      void applySpotlight(target, card);
    }

    if (stepIndex === STEPS.length - 1) {
      const note = document.createElement("p");
      note.className = "onboarding-footnote";
      note.textContent = "Full reference in How to map your lock below.";
      card.append(note);
    }
  }

  return {
    isActive: () => active,
    start({ skip = false, skipReason = TutorNotShownReason.RETURNING_USER } = {}) {
      if (skip) {
        onNotShown?.({ reason: skipReason });
        return;
      }
      if (isDismissed()) {
        onNotShown?.({ reason: TutorNotShownReason.PREVIOUSLY_DISMISSED });
        return;
      }
      if (active) return;
      active = true;
      stepIndex = 0;
      document.body.classList.add("onboarding-active");
      window.addEventListener("resize", onResize);
      onStarted?.({ totalSteps: STEPS.length });
      renderStep();
    },
  };
}
