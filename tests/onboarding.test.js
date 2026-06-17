import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ONBOARDING_STEPS } from "../src/onboarding.js";
import { OnboardingStepId, TutorNotShownReason } from "../src/analytics/values.js";
import { StorageKeys, StorageFlag } from "../src/storage-keys.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function installOnboardingTestEnv() {
  const saved = {
    document: globalThis.document,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };

  const storage = new Map();
  const rafQueue = [];
  const timeouts = [];

  function createClassList(el) {
    const classes = new Set();
    const sync = () => {
      el._className = [...classes].join(" ");
    };
    return {
      add(...names) {
        for (const name of names) classes.add(name);
        sync();
      },
      remove(...names) {
        for (const name of names) classes.delete(name);
        sync();
      },
      toggle(name, force) {
        const next = force ?? !classes.has(name);
        if (next) classes.add(name);
        else classes.delete(name);
        sync();
      },
      contains(name) {
        return classes.has(name);
      },
      reset(value) {
        classes.clear();
        for (const name of value.split(/\s+/).filter(Boolean)) classes.add(name);
        sync();
      },
    };
  }

  function querySelectorOnTree(node, selector) {
    if (!selector.startsWith(".")) return null;
    const className = selector.slice(1);
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current.classList?.contains(className)) return current;
      for (const child of current._children ?? []) stack.push(child);
    }
    return null;
  }

  function createElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      _className: "",
      hidden: false,
      style: {},
      parentElement: null,
      _children: [],
      offsetHeight: 120,
      offsetWidth: 100,
      setAttribute() {},
      getAttribute: () => null,
      classList: null,
      get className() {
        return el._className;
      },
      set className(value) {
        el.classList.reset(value);
      },
      get isConnected() {
        return el.parentElement !== null;
      },
      append(...nodes) {
        for (const node of nodes) {
          node.parentElement = el;
          el._children.push(node);
        }
      },
      replaceChildren(...nodes) {
        for (const child of el._children) child.parentElement = null;
        el._children = [];
        el.append(...nodes);
      },
      remove() {
        if (!el.parentElement) return;
        el.parentElement._children = el.parentElement._children.filter((child) => child !== el);
        el.parentElement = null;
      },
      querySelector(selector) {
        for (const child of el._children) {
          const hit = querySelectorOnTree(child, selector);
          if (hit) return hit;
        }
        return null;
      },
      querySelectorAll(selector) {
        const hits = [];
        const walk = (node) => {
          if (selector.startsWith(".") && node.classList?.contains(selector.slice(1))) {
            hits.push(node);
          }
          for (const child of node._children ?? []) walk(child);
        };
        walk(el);
        return hits;
      },
      addEventListener(type, listener) {
        el._listeners ??= {};
        el._listeners[type] ??= [];
        el._listeners[type].push(listener);
      },
      removeEventListener(type, listener) {
        const list = el._listeners?.[type];
        if (!list) return;
        const index = list.indexOf(listener);
        if (index >= 0) list.splice(index, 1);
      },
      getBoundingClientRect() {
        return { top: 200, bottom: 250, left: 10, right: 110, width: 100, height: 50 };
      },
      scrollIntoView() {},
    };
    el.classList = createClassList(el);
    Object.defineProperty(el, "innerHTML", {
      set(html) {
        el._children = [];
        if (html.includes("onboarding-skip")) {
          const skip = createElement("button");
          skip.className = "pill pill-ghost onboarding-skip";
          el.append(skip);
        }
        if (html.includes("onboarding-next")) {
          const next = createElement("button");
          next.className = "pill pill-primary onboarding-next";
          el.append(next);
        }
      },
      get() {
        return "";
      },
    });
    return el;
  }

  const body = createElement("body");
  const controls = createElement("div");
  controls.className = "controls";

  const masteryRow = createElement("div");
  masteryRow.className = "mastery-row";
  const locksRow = createElement("div");
  locksRow.className = "locks-row";
  controls.append(masteryRow, locksRow);
  body.append(controls);

  const registry = new Map([
    [".controls .mastery-row", masteryRow],
    [".controls .locks-row", locksRow],
  ]);

  const document = {
    body,
    documentElement: createElement("html"),
    createElement,
    querySelector(selector) {
      return registry.get(selector) ?? querySelectorOnTree(body, selector);
    },
    querySelectorAll(selector) {
      if (selector === ".onboarding-target") {
        return body.querySelectorAll(selector);
      }
      const node = registry.get(selector);
      return node ? [node] : [];
    },
  };

  const window = {
    innerHeight: 800,
    matchMedia(query) {
      return {
        matches: /max-width:\s*768px/.test(query),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      };
    },
    addEventListener() {},
    removeEventListener() {},
    scrollBy() {},
    setTimeout(fn, delay = 0) {
      const id = globalThis.setTimeout(fn, delay);
      timeouts.push(id);
      return id;
    },
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame(callback) {
      rafQueue.push(callback);
      return rafQueue.length;
    },
  };

  globalThis.document = document;
  globalThis.window = window;
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };

  function flushRaf(times = 1) {
    for (let i = 0; i < times; i++) {
      const batch = rafQueue.splice(0);
      for (const callback of batch) callback();
    }
  }

  async function flushSpotlightWork() {
    flushRaf(2);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    await new Promise((resolve) => globalThis.setTimeout(resolve, 350));
  }

  function click(el) {
    for (const listener of el._listeners?.click ?? []) listener();
  }

  function restore() {
    for (const id of timeouts) globalThis.clearTimeout(id);
    globalThis.document = saved.document;
    globalThis.window = saved.window;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    globalThis.localStorage = saved.localStorage;
    storage.clear();
  }

  return {
    body,
    masteryRow,
    locksRow,
    flushSpotlightWork,
    click,
    findInBody(selector) {
      return querySelectorOnTree(body, selector);
    },
    restore,
  };
}

test("onboarding step targets are specific and present in view markup", async () => {
  const view = await readFile(join(root, "src/view.js"), "utf8");
  const html = await readFile(join(root, "index.html"), "utf8");
  const css = await readFile(join(root, "styles.css"), "utf8");
  const targets = new Set();

  for (const step of ONBOARDING_STEPS) {
    assert.match(
      step.target,
      /\.[\w-]+/,
      `${step.id} should use a class selector, not a generic .pill-row`,
    );
    assert.equal(
      targets.has(step.target),
      false,
      `duplicate onboarding target: ${step.target}`,
    );
    targets.add(step.target);

    const classes = [...step.target.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
    const markup = `${view}\n${html}\n${css}`;
    assert.ok(
      classes.some((name) => markup.includes(name)),
      `${step.id}: expected one of [${classes.join(", ")}] in view/index/styles`,
    );
  }
});

test("onboarding has five steps ending with solve", () => {
  assert.equal(ONBOARDING_STEPS.length, 5);
  assert.equal(ONBOARDING_STEPS[0].id, OnboardingStepId.MASTERY_TIER);
  assert.equal(ONBOARDING_STEPS[1].id, OnboardingStepId.PLATE_COUNT);
  assert.equal(ONBOARDING_STEPS[1].target, ".controls .locks-row");
  assert.equal(ONBOARDING_STEPS[4].id, OnboardingStepId.SOLVE);
  assert.equal(ONBOARDING_STEPS[4].target, ".panel--sequence .solve-btn");
});

test("onboarding dismiss key is v3", () => {
  assert.equal(StorageKeys.ONBOARDING_DISMISSED_V3, "onboarding_dismissed_v3");
});

test("enterColdLanding shows opt-in chip for fresh cold users", async () => {
  const storage = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };

  try {
    const { createOnboarding } = await import("../src/onboarding.js");
    const onboarding = createOnboarding({});
    onboarding.enterColdLanding();
    assert.equal(onboarding.isChipVisible(), true);
  } finally {
    globalThis.localStorage = original;
    storage.clear();
  }
});

test("applySpotlight guards async races in source", async () => {
  const text = await readFile(join(root, "src/onboarding.js"), "utf8");
  assert.match(text, /const requestedStepIndex = stepIndex;/);
  assert.match(text, /if \(!active \|\| !backdrop \|\| !cardHost\) return;/);
  assert.match(text, /if \(requestedStepIndex !== stepIndex\) return;/);
  assert.match(text, /if \(!card\.isConnected\) return;/);
});

test("applySpotlight survives dismiss during async scroll", async () => {
  const env = installOnboardingTestEnv();
  try {
    const { createOnboarding } = await import("../src/onboarding.js");
    const onboarding = createOnboarding({});
    onboarding.startFromOptIn();

    const skip = env.findInBody(".onboarding-skip");
    assert.ok(skip, "expected onboarding skip button");
    env.click(skip);

    await env.flushSpotlightWork();
    assert.equal(onboarding.isActive(), false);
  } finally {
    env.restore();
  }
});

test("applySpotlight ignores stale scroll after step advance", async () => {
  const env = installOnboardingTestEnv();
  try {
    const { createOnboarding } = await import("../src/onboarding.js");
    const onboarding = createOnboarding({});
    onboarding.startFromOptIn();

    const next = env.findInBody(".onboarding-next");
    assert.ok(next, "expected onboarding next button");
    env.click(next);

    await env.flushSpotlightWork();
    assert.equal(onboarding.isActive(), true);
    assert.equal(env.masteryRow.classList.contains("onboarding-target"), false);
  } finally {
    env.restore();
  }
});

test("enterColdLanding reports previously dismissed when tour was dismissed", async () => {
  const storage = new Map();
  storage.set(StorageKeys.ONBOARDING_DISMISSED_V3, StorageFlag.SET);
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };

  try {
    const { createOnboarding } = await import("../src/onboarding.js");
    let reportedReason;
    const onboarding = createOnboarding({
      onNotShown: ({ reason }) => {
        reportedReason = reason;
      },
    });
    onboarding.enterColdLanding();
    assert.equal(onboarding.isChipVisible(), false);
    assert.equal(reportedReason, TutorNotShownReason.PREVIOUSLY_DISMISSED);
  } finally {
    globalThis.localStorage = original;
    storage.clear();
  }
});
