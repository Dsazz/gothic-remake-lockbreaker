import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { DIR } from "../src/core/domain.js";
import { renderSolution } from "../src/view/solution.js";

function installDom() {
  const window = new Window({ url: "https://example.com/" });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
  };
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  return () => {
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement;
    window.happyDOM.close();
  };
}

test("minimized sequence shows step counter text, not [object …]", () => {
  const restore = installDom();
  try {
    const host = document.createElement("div");
    document.body.append(host);

    const solution = [{ plate: 0, dir: DIR.RIGHT }];
    const walkthrough = {
      states: [
        [0, 0, 0, 0],
        [1, 0, 0, 0],
      ],
      stepIndex: 0,
      move: solution[0],
      showAll: false,
    };

    renderSolution(host, solution, walkthrough, { minimized: true }, {
      onWalk() {},
      onJumpTo() {},
      onToggleSteps() {},
    });

    const step = host.querySelector(".sequence-min-step");
    assert.ok(step);
    // Bug: counter DOM node was passed as `text:` → browsers show "[object HTMLSpanElement]"
    // (truncated to "[OBJ…]"); happy-dom stringifies via outerHTML instead.
    assert.doesNotMatch(step.textContent ?? "", /\[object\s/i);
    assert.doesNotMatch(step.textContent ?? "", /<span/);
    assert.ok(step.querySelector(".wt-counter"), "step counter must be a nested element, not stringified");
    assert.match(step.querySelector(".wt-counter-current")?.textContent ?? "", /^1$/);
  } finally {
    restore();
  }
});
