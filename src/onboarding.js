const DISMISSED_KEY = "onboarding_dismissed_v1";

const STEPS = [
  {
    id: "plate_count",
    target: ".controls .pill-row",
    title: "Step 1 · Count the locks",
    body: "Match the number of plates in the mechanism (4–7). Default is 6.",
  },
  {
    id: "start_holes",
    target: ".tumbler-card:last-child .plate-holes",
    title: "Step 2 · Starting holes",
    body: "Tap each pin's hole. 1 and 7 are walls; 4 is the notch (goal).",
  },
  {
    id: "couplings",
    target: ".tumbler-card:last-child .link-chip-row",
    title: "Step 3 · Couplings",
    body: "In-game, turn this lock once. Each lock that moves — tap its chip to With or Against.",
  },
];

export function createOnboarding({ onStepViewed, onDismissed, onComplete }) {
  let backdrop;
  let cardHost;
  let stepIndex = 0;
  let active = false;

  function isDismissed() {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
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

  function removeLayers() {
    backdrop?.remove();
    cardHost?.remove();
    backdrop = null;
    cardHost = null;
    active = false;
  }

  function finish(completed) {
    markDismissed();
    onDismissed?.({ completed });
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
    cardHost.classList.toggle("onboarding-card-host--mobile", mobile);

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

    card.querySelector(".onboarding-skip").addEventListener("click", () => finish(false));
    card.querySelector(".onboarding-next").addEventListener("click", () => {
      stepIndex += 1;
      if (stepIndex >= STEPS.length) finish(true);
      else renderStep();
    });

    if (target && !mobile) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("onboarding-target");
      const cleanup = () => target.classList.remove("onboarding-target");
      card.querySelector(".onboarding-skip").addEventListener("click", cleanup, { once: true });
      card.querySelector(".onboarding-next").addEventListener("click", cleanup, { once: true });
    }

    if (stepIndex === STEPS.length - 1) {
      const note = document.createElement("p");
      note.className = "onboarding-footnote";
      note.textContent = "Full reference in How to map your lock below.";
      card.append(note);
    }
  }

  return {
    start({ skip = false } = {}) {
      if (skip || isDismissed() || active) return;
      active = true;
      stepIndex = 0;
      renderStep();
    },
  };
}
