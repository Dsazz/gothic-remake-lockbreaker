import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

import { BadgeFeature, EARLIEST_BASELINE } from "../src/core/feature-badges.js";
import { createWhatsNewBadges } from "../src/controllers/whats-new.js";

function installDom() {
  const window = new Window({ url: "https://example.com/" });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    localStorage: globalThis.localStorage,
  };
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.localStorage = window.localStorage;
  return () => {
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.localStorage = previous.localStorage;
    window.happyDOM.close();
  };
}

function mockPrefs({ firstSeen = EARLIEST_BASELINE, dismissed = [] } = {}) {
  const dismissedIds = [...dismissed];
  return {
    firstSeenVersion: () => firstSeen,
    dismissedBadges: () => [...dismissedIds],
    dismissBadge(id) {
      if (!dismissedIds.includes(id)) dismissedIds.push(id);
    },
  };
}

test("lazy anchor resolver re-decorates the live node after a controls rebuild", () => {
  const restore = installDom();
  try {
    const host = document.createElement("div");
    document.body.append(host);

    let btn = document.createElement("button");
    btn.id = "browse-locks-btn";
    host.append(btn);

    const badges = createWhatsNewBadges({
      uiPrefs: mockPrefs(),
      anchors: {
        [BadgeFeature.BROWSE_LOCKS]: () => host.querySelector("#browse-locks-btn"),
      },
      t: () => "NEW",
    });

    badges.apply();
    assert.equal(btn.dataset.badge, "new");
    assert.equal(btn.dataset.badgeLabel, "NEW");
    assert.equal(btn.dataset.badgeAnimate, "1", "first show may animate");

    // Simulate renderControls: replaceChildren destroys the decorated node.
    const stale = btn;
    host.replaceChildren();
    btn = document.createElement("button");
    btn.id = "browse-locks-btn";
    host.append(btn);

    badges.apply();
    assert.equal(btn.dataset.badge, "new", "live node must be re-decorated");
    assert.equal(btn.dataset.badgeAnimate, undefined, "rebuild must not re-pop");
    assert.notEqual(btn, stale);
    assert.equal(host.querySelector("#browse-locks-btn").dataset.badge, "new");
  } finally {
    restore();
  }
});

test("dismiss strips the live node and survives a subsequent apply after rebuild", () => {
  const restore = installDom();
  try {
    const host = document.createElement("div");
    document.body.append(host);

    let btn = document.createElement("button");
    btn.id = "browse-locks-btn";
    host.append(btn);

    const badges = createWhatsNewBadges({
      uiPrefs: mockPrefs(),
      anchors: {
        [BadgeFeature.BROWSE_LOCKS]: () => host.querySelector("#browse-locks-btn"),
      },
      t: () => "NEW",
    });

    badges.apply();
    assert.ok(badges.isActive(BadgeFeature.BROWSE_LOCKS));

    badges.dismiss(BadgeFeature.BROWSE_LOCKS);
    assert.equal(btn.dataset.badge, undefined);
    assert.equal(badges.isActive(BadgeFeature.BROWSE_LOCKS), false);

    host.replaceChildren();
    btn = document.createElement("button");
    btn.id = "browse-locks-btn";
    host.append(btn);

    badges.apply();
    assert.equal(btn.dataset.badge, undefined, "dismissed badge must not return");
  } finally {
    restore();
  }
});

test("static Node anchors still decorate (hotkeys path)", () => {
  const restore = installDom();
  try {
    const hint = document.createElement("button");
    hint.id = "shortcuts-hint";
    document.body.append(hint);

    const badges = createWhatsNewBadges({
      uiPrefs: mockPrefs(),
      anchors: {
        [BadgeFeature.HOTKEYS]: hint,
      },
      t: () => "NEW",
    });

    badges.apply();
    assert.equal(hint.dataset.badge, "new");
    assert.equal(hint.dataset.badgeAnimate, "1");

    badges.apply();
    assert.equal(hint.dataset.badgeAnimate, undefined, "second apply stays quiet");
  } finally {
    restore();
  }
});
