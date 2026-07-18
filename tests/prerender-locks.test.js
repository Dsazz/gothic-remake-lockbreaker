import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractStylesheetHref,
  groupLocksByPlace,
  renderLocksIndexHtml,
} from "../scripts/prerender-locks.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("groupLocksByPlace sorts places and lock names", () => {
  const groups = groupLocksByPlace([
    { id: "b", name: "Beta", place: "Old Camp", plateCount: 4 },
    { id: "a", name: "Alpha", place: "Old Camp", plateCount: 5 },
    { id: "c", name: "Cave", place: "New Camp", plateCount: 6 },
  ]);
  assert.deepEqual(
    groups.map(([place, locks]) => [place, locks.map((l) => l.name)]),
    [
      ["New Camp", ["Cave"]],
      ["Old Camp", ["Alpha", "Beta"]],
    ],
  );
});

test("renderLocksIndexHtml links each lock to ?lock= and escapes names", () => {
  const html = renderLocksIndexHtml(
    [
      {
        id: "OC_Chest_Armory_01_Lock",
        name: 'Armory <01> & "Chest"',
        place: "Old Camp",
        plateCount: 5,
      },
    ],
    { releaseDate: "2026-07-18", stylesheetHref: "/assets/index-abc123.css" },
  );
  assert.match(html, /href="\/\?lock=OC_Chest_Armory_01_Lock"/);
  assert.match(html, /Armory &lt;01&gt; &amp; &quot;Chest&quot;/);
  assert.match(html, /CollectionPage/);
  assert.match(html, /dateModified": "2026-07-18"/);
  assert.match(html, /canonical" href="https:\/\/gothiclockbreaker\.com\/locks\/"/);
});

test("renderLocksIndexHtml links the built (hashed) stylesheet, never a hardcoded path", () => {
  const html = renderLocksIndexHtml([{ id: "x", name: "X", place: "Old Camp", plateCount: 1 }], {
    releaseDate: "2026-07-18",
    stylesheetHref: "/assets/index-abc123.css",
  });
  assert.match(html, /<link rel="stylesheet" href="\/assets\/index-abc123\.css" \/>/);
});

test("renderLocksIndexHtml throws without a stylesheetHref (no silent 404 fallback)", () => {
  assert.throws(() => renderLocksIndexHtml([{ id: "x", name: "X", place: "P", plateCount: 1 }], {}));
});

test("extractStylesheetHref reads the hashed href Vite wrote into dist/index.html", () => {
  const html = '<link rel="stylesheet" crossorigin href="/assets/index-DN8zhHEl.css">';
  assert.equal(extractStylesheetHref(html), "/assets/index-DN8zhHEl.css");
});

test("extractStylesheetHref throws when dist/index.html has no stylesheet link", () => {
  assert.throws(() => extractStylesheetHref("<html></html>"));
});

test("checked-in catalog has enough entries for the SEO index", () => {
  const catalog = JSON.parse(readFileSync(join(ROOT, "assets/catalog/locks.json"), "utf8"));
  assert.ok(Array.isArray(catalog.entries));
  assert.ok(catalog.entries.length >= 300);
});
