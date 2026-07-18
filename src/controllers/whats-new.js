// "NEW" feature-badge orchestration. Decides which badges show (via the pure
// core), then decorates anchors with data-attributes that styles/whats-new.css
// turns into a pseudo-element pill. Camp/keyboard/controls view code stays
// unaware of badges; dismissal is driven by the composition root when the user
// opens the relevant feature.
//
// Anchors may be a Node or a () => Node resolver. Resolvers are required for
// controls that live inside a fully re-rendered host (e.g. #browse-locks-btn):
// decorate/strip look up the live node at call time instead of holding a stale
// reference across replaceChildren. Pop animation runs only the first time a
// badge id enters `active` — re-applies after rebuilds stay quiet.

import { visibleBadgeIds } from "../core/feature-badges.js";
import { onLocaleChange } from "../i18n/index.js";

const BADGE_STATE = "new";

function resolveAnchor(anchor) {
  if (typeof anchor === "function") return anchor() ?? null;
  return anchor ?? null;
}

export function createWhatsNewBadges({ uiPrefs, anchors = {}, t } = {}) {
  const active = new Set();

  function label() {
    return t ? t("whatsNew.badge") : BADGE_STATE;
  }

  function decorate(anchor, { animate = false } = {}) {
    const node = resolveAnchor(anchor);
    if (!node) return;
    node.dataset.badge = BADGE_STATE;
    node.dataset.badgeLabel = label();
    if (animate) node.dataset.badgeAnimate = "1";
    else delete node.dataset.badgeAnimate;
  }

  function strip(anchor) {
    const node = resolveAnchor(anchor);
    if (!node) return;
    delete node.dataset.badge;
    delete node.dataset.badgeLabel;
    delete node.dataset.badgeAnimate;
  }

  function apply() {
    const ids = visibleBadgeIds({
      firstSeenVersion: uiPrefs.firstSeenVersion(),
      dismissedIds: uiPrefs.dismissedBadges(),
    });
    for (const id of ids) {
      if (!anchors[id]) continue;
      const firstShow = !active.has(id);
      active.add(id);
      decorate(anchors[id], { animate: firstShow });
    }
  }

  function isActive(id) {
    return active.has(id);
  }

  function dismiss(id) {
    if (!active.has(id)) return;
    active.delete(id);
    strip(anchors[id]);
    uiPrefs.dismissBadge(id);
  }

  // Re-localize live badges when the locale changes. Quiet re-decorate — do not
  // re-trigger the intro pop. Subscription lives for the app lifetime.
  onLocaleChange(() => {
    for (const id of active) decorate(anchors[id], { animate: false });
  });

  return {
    apply,
    isActive,
    dismiss,
  };
}
