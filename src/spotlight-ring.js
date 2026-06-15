/** Fixed ring overlay — avoids mutating sticky/flex targets with box-shadow hacks. */
export function createSpotlightRing() {
  let ring;
  let trackedTarget;
  let onLayout;

  function position() {
    if (!ring || !trackedTarget) return;
    const rect = trackedTarget.getBoundingClientRect();
    const pad = 4;
    ring.style.top = `${rect.top - pad}px`;
    ring.style.left = `${rect.left - pad}px`;
    ring.style.width = `${rect.width + pad * 2}px`;
    ring.style.height = `${rect.height + pad * 2}px`;
  }

  function bindLayout() {
    if (onLayout) return;
    onLayout = () => position();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, { passive: true });
  }

  function unbindLayout() {
    if (!onLayout) return;
    window.removeEventListener("resize", onLayout);
    window.removeEventListener("scroll", onLayout);
    onLayout = null;
  }

  function show(target) {
    if (!target) return;
    trackedTarget = target;
    if (!ring) {
      ring = document.createElement("div");
      ring.className = "onboarding-spotlight-ring";
      ring.setAttribute("aria-hidden", "true");
      document.body.append(ring);
    }
    position();
    bindLayout();
  }

  function clear() {
    unbindLayout();
    trackedTarget = null;
    ring?.remove();
    ring = null;
  }

  return { show, position, clear };
}
