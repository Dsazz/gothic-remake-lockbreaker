import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCatalogOverlay } from "../src/view/catalog.js";
import { Window } from "happy-dom";

function installDom() {
  const window = new Window({ url: "https://example.com/" });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.requestAnimationFrame = (cb) => window.setTimeout(cb, 0);
  return () => {
    renderCatalogOverlay({ open: false }, {});
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    window.happyDOM.close();
  };
}

const sampleEntries = [
  {
    id: "A",
    name: "Armory 01",
    place: "Old Camp",
    plateCount: 5,
    positions: [0, 0, 0, 0, 0],
    matrix: Array.from({ length: 5 }, () => new Array(5).fill(0)),
  },
  {
    id: "B",
    name: "Barracks 02",
    place: "Old Camp",
    plateCount: 4,
    positions: [0, 0, 0, 0],
    matrix: Array.from({ length: 4 }, () => new Array(4).fill(0)),
  },
];

function openUi(overrides = {}) {
  return {
    open: true,
    loading: false,
    loadError: null,
    query: "",
    place: "",
    places: ["Old Camp"],
    entries: sampleEntries,
    replaceConfirmOpen: false,
    pendingName: null,
    ...overrides,
  };
}

test("catalog place filter is a select with All places and place options", () => {
  const restore = installDom();
  try {
    renderCatalogOverlay(openUi({ places: ["Old Camp", "Free Mine"] }), {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    });
    assert.equal(document.querySelectorAll(".catalog-places .pill").length, 0);
    const select = document.querySelector(".catalog-place-select");
    assert.ok(select, "place filter must be a select");
    const labels = [...select.options].map((opt) => opt.textContent.trim());
    assert.ok(labels.includes("All places"), `missing All places in ${labels.join("|")}`);
    assert.ok(labels.includes("Old Camp"), `missing Old Camp in ${labels.join("|")}`);
    assert.ok(labels.includes("Free Mine"), `missing Free Mine in ${labels.join("|")}`);
    assert.equal(select.value, "");
  } finally {
    restore();
  }
});

test("catalog result count reflects filtered entry length", () => {
  const restore = installDom();
  try {
    const handlers = {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    };
    renderCatalogOverlay(openUi({ entries: sampleEntries }), handlers);
    assert.match(document.querySelector(".catalog-result-count")?.textContent ?? "", /2 locks/);

    renderCatalogOverlay(openUi({ entries: [sampleEntries[0]] }), handlers);
    assert.match(document.querySelector(".catalog-result-count")?.textContent ?? "", /1 lock/);
  } finally {
    restore();
  }
});

test("catalog empty state shows Clear filters only when a filter is active", () => {
  const restore = installDom();
  try {
    let cleared = false;
    const handlers = {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
      onClearCatalogFilters() {
        cleared = true;
      },
    };

    renderCatalogOverlay(openUi({ entries: [], query: "", place: "" }), handlers);
    assert.equal(document.querySelector(".catalog-status-block .pill-ghost"), null);

    renderCatalogOverlay(openUi({ entries: [], query: "zzz", place: "" }), handlers);
    const clearBtn = document.querySelector(".catalog-status-block .pill-ghost");
    assert.ok(clearBtn);
    assert.match(clearBtn.textContent ?? "", /Clear filters/);
    clearBtn.click();
    assert.equal(cleared, true);
  } finally {
    restore();
  }
});

test("catalog error state renders Retry button", () => {
  const restore = installDom();
  try {
    let retried = false;
    renderCatalogOverlay(openUi({ entries: [], loadError: "boom", loading: false }), {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
      onRetryCatalogLoad() {
        retried = true;
      },
    });
    assert.equal(document.querySelector(".catalog-result-count"), null);
    const retry = [...document.querySelectorAll(".catalog-status-block .pill")].find((btn) =>
      /Retry/.test(btn.textContent ?? ""),
    );
    assert.ok(retry);
    retry.click();
    assert.equal(retried, true);
  } finally {
    restore();
  }
});

test("catalog search placeholder mentions name or place", () => {
  const restore = installDom();
  try {
    renderCatalogOverlay(openUi(), {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    });
    const input = document.querySelector(".catalog-search");
    assert.match(input?.placeholder ?? "", /name or place/i);
  } finally {
    restore();
  }
});

test("catalog search re-render keeps the same input node and focus", () => {
  const restore = installDom();
  try {
    const handlers = {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    };

    renderCatalogOverlay(openUi(), handlers);
    const input = document.querySelector(".catalog-search");
    assert.ok(input);
    input.focus();
    input.value = "Ar";
    assert.equal(document.activeElement, input);

    renderCatalogOverlay(openUi({ query: "Ar", entries: [sampleEntries[0]] }), handlers);

    const again = document.querySelector(".catalog-search");
    assert.equal(again, input, "search input must not be remounted while filtering");
    assert.equal(document.activeElement, input, "focus must survive filter re-render");
    assert.match(document.querySelector(".catalog-list")?.textContent ?? "", /Armory 01/);
    assert.doesNotMatch(document.querySelector(".catalog-list")?.textContent ?? "", /Barracks/);
  } finally {
    restore();
  }
});

test("catalog overlay backdrop click closes", () => {
  const restore = installDom();
  try {
    let closed = false;
    renderCatalogOverlay(openUi(), {
      onCloseCatalog() {
        closed = true;
      },
      onCatalogQuery() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    });
    document.querySelector(".catalog-backdrop")?.click();
    assert.equal(closed, true);
  } finally {
    restore();
  }
});

test("catalog backdrop cancels replace confirm before closing", () => {
  const restore = installDom();
  try {
    let closed = false;
    let cancelled = false;
    renderCatalogOverlay(openUi({ replaceConfirmOpen: true, pendingName: "Armory 01" }), {
      onCloseCatalog() {
        closed = true;
      },
      onCancelCatalogReplace() {
        cancelled = true;
      },
      onCatalogQuery() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    });
    document.querySelector(".catalog-backdrop")?.click();
    assert.equal(cancelled, true);
    assert.equal(closed, false);
  } finally {
    restore();
  }
});

test("catalog sheet title and lock rows include icons", () => {
  const restore = installDom();
  try {
    renderCatalogOverlay(openUi(), {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    });
    assert.ok(document.querySelector(".catalog-sheet-title svg"), "title needs search icon");
    assert.ok(
      document.querySelector(".catalog-item-btn .catalog-item-chevron svg"),
      "lock rows need trailing chevron",
    );
  } finally {
    restore();
  }
});

test("catalog close restores focus to browse button", async () => {
  const restore = installDom();
  try {
    const browse = document.createElement("button");
    browse.id = "browse-locks-btn";
    document.body.append(browse);

    renderCatalogOverlay(openUi(), {
      onCloseCatalog() {},
      onCatalogQuery() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    });
    renderCatalogOverlay({ open: false }, {});
    assert.equal(document.activeElement, browse);
  } finally {
    restore();
  }
});

test("catalog search patch never writes the string undefined", () => {
  const restore = installDom();
  try {
    const handlers = {
      onCatalogQuery() {},
      onCloseCatalog() {},
      onCatalogPlace() {},
      onSelectCatalogLock() {},
    };
    renderCatalogOverlay(openUi(), handlers);
    const input = document.querySelector(".catalog-search");
    assert.ok(input);
    // Simulate a blur so the next patch syncs value from ui.
    input.blur();
    renderCatalogOverlay(openUi({ query: undefined }), handlers);
    assert.notEqual(input.value, "undefined");
    assert.equal(input.value, "");
  } finally {
    restore();
  }
});

test("catalog CSS uses filters row + place select and hides native search clear", async () => {
  const { readFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const css = await readFile(join(root, "styles/catalog.css"), "utf8");
  assert.doesNotMatch(css, /\.catalog-places\s*\{/);
  assert.match(css, /\.catalog-filters-row\s*\{[^}]*flex-shrink:\s*0/s);
  assert.match(css, /\.catalog-place-select\s*\{/);
  assert.match(css, /\.catalog-sheet-head\s*\{[^}]*flex-shrink:\s*0/s);
  assert.match(css, /::-webkit-search-cancel-button/);
  assert.match(css, /\.catalog-sheet-close:hover/);
  assert.match(css, /\.catalog-item-btn:hover\s*\{[^}]*background:/s);
});

test("catalog place select hides native chevron and uses a centered custom caret", async () => {
  const { readFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const css = await readFile(join(root, "styles/catalog.css"), "utf8");
  const block = css.match(/\.catalog-place-select\s*\{[^}]+\}/s)?.[0] ?? "";
  assert.match(block, /appearance:\s*none/);
  assert.match(block, /background-image:\s*url\(/);
  assert.match(block, /background-position:\s*right\s+[\d.]+rem\s+center/);
  assert.match(block, /padding-right:\s*[\d.]+rem/);
});

test("catalog replace overlay stacks above the sheet", async () => {
  const { readFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const css = await readFile(join(root, "styles/catalog.css"), "utf8");
  const sheetZ = Number(css.match(/\.catalog-sheet\s*\{[^}]*z-index:\s*(\d+)/s)?.[1]);
  const replaceZ = Number(
    css.match(/\.catalog-replace-overlay\s*\{[^}]*z-index:\s*(\d+)/s)?.[1],
  );
  assert.ok(Number.isFinite(sheetZ), "sheet needs an explicit z-index");
  assert.ok(Number.isFinite(replaceZ), "replace overlay needs an explicit z-index");
  assert.ok(replaceZ > sheetZ, "replace confirm must paint above the sheet");
});

test("catalog badge host lives in The Sequence panel", async () => {
  const { readFile } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const html = await readFile(join(root, "index.html"), "utf8");
  const lockPanel = html.match(/<section class="panel panel--lock">[\s\S]*?<\/section>/)?.[0] ?? "";
  const sequencePanel =
    html.match(/<section class="panel panel--sequence[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.doesNotMatch(lockPanel, /id="catalog-badge"/);
  assert.match(sequencePanel, /id="catalog-badge"/);
});
