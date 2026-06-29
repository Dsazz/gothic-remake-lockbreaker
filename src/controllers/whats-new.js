// "NEW" feature-badge orchestration. Decides which badges show (via the pure
// core), then decorates the stable anchor containers with data-attributes that
// styles/whats-new.css turns into a pseudo-element pill. Camp/keyboard view code
// stays unaware of badges; dismissal is driven by the composition root when the
// user opens the relevant feature.

import { visibleBadgeIds } from "../core/feature-badges.js";
import { onLocaleChange } from "../i18n/index.js";

const BADGE_STATE = "new";

export function createWhatsNewBadges({ uiPrefs, anchors = {}, t } = {}) {
  const active = new Set();

  function label() {
    return t ? t("whatsNew.badge") : BADGE_STATE;
  }

  function decorate(anchor) {
    if (!anchor) return;
    anchor.dataset.badge = BADGE_STATE;
    anchor.dataset.badgeLabel = label();
  }

  function strip(anchor) {
    if (!anchor) return;
    delete anchor.dataset.badge;
    delete anchor.dataset.badgeLabel;
  }

  function apply() {
    const ids = visibleBadgeIds({
      firstSeenVersion: uiPrefs.firstSeenVersion(),
      dismissedIds: uiPrefs.dismissedBadges(),
    });
    for (const id of ids) {
      if (!anchors[id]) continue;
      active.add(id);
      decorate(anchors[id]);
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

  // Re-localize live badges when the locale changes. The app holds a single
  // badges instance for its whole lifetime, so this subscription is never torn
  // down — no unsubscribe handle to keep.
  onLocaleChange(() => {
    for (const id of active) decorate(anchors[id]);
  });

  return {
    apply,
    isActive,
    dismiss,
  };
}
