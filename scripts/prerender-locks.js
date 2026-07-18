// Build-time prerender: emit crawlable /locks/ index from assets/catalog/locks.json.
// English-only v1 — locale variants deferred until the index proves organic value.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SITE_ORIGIN } from "../src/i18n/index.js";
import { RELEASE_DATE } from "../src/version.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "assets/catalog/locks.json");
const BUILT_INDEX_PATH = join(ROOT, "dist/index.html");
const OUT_DIR = join(ROOT, "dist/locks");

// Vite hashes the built stylesheet filename (e.g. assets/index-<hash>.css); hardcoding
// a path here would silently 404 the moment the hash changes. Pull it from the app's
// own built index.html instead, the same way prerender-locales.js reuses that file.
export function extractStylesheetHref(html) {
  const match = html.match(/<link rel="stylesheet"[^>]*\shref="([^"]+)"/);
  if (!match) throw new Error("Could not find built stylesheet <link> in dist/index.html");
  return match[1];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {{ id: string, name: string, place: string, plateCount: number }[]} entries */
export function groupLocksByPlace(entries) {
  const byPlace = new Map();
  for (const entry of entries) {
    const place = entry.place || "Other";
    if (!byPlace.has(place)) byPlace.set(place, []);
    byPlace.get(place).push(entry);
  }
  for (const list of byPlace.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...byPlace.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** @param {{ id: string, name: string, place: string, plateCount: number }[]} entries */
export function renderLocksIndexHtml(entries, { releaseDate = RELEASE_DATE, stylesheetHref }) {
  if (!stylesheetHref) throw new Error("renderLocksIndexHtml requires stylesheetHref");
  const groups = groupLocksByPlace(entries);
  const total = entries.length;
  const pageUrl = `${SITE_ORIGIN}/locks/`;

  const placeSections = groups
    .map(([place, locks]) => {
      const items = locks
        .map(
          (lock) =>
            `<li><a href="/?lock=${encodeURIComponent(lock.id)}">${escapeHtml(lock.name)}</a>` +
            ` <span class="lock-meta">${lock.plateCount} plates</span></li>`,
        )
        .join("\n");
      return (
        `<section class="place-block">\n` +
        `<h2 id="${escapeHtml(place.replace(/\s+/g, "-").toLowerCase())}">${escapeHtml(place)}</h2>\n` +
        `<p class="place-count">${locks.length} locks</p>\n` +
        `<ul>\n${items}\n</ul>\n` +
        `</section>`
      );
    })
    .join("\n");

  const itemListElements = entries
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((lock, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: lock.name,
      url: `${SITE_ORIGIN}/?lock=${encodeURIComponent(lock.id)}`,
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Gothic Remake lock catalog",
    description:
      "Browseable index of named Gothic 1 Remake locks. Open any lock in the free edge-safe solver.",
    url: pageUrl,
    dateModified: releaseDate,
    isPartOf: {
      "@type": "WebApplication",
      name: "Gothic Lock Breaker",
      url: `${SITE_ORIGIN}/`,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: itemListElements,
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b0c0e" />
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <title>Gothic Remake Lock Catalog — ${total} Named Locks</title>
    <meta
      name="description"
      content="Browse ${total} named Gothic 1 Remake locks by place, then open any lock in the free edge-safe lockpicking solver."
    />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${pageUrl}" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="stylesheet" href="${stylesheetHref}" />
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
    <style>
      .locks-page {
        max-width: 42rem;
        margin: 0 auto;
        padding: 1.5rem 1rem 3rem;
      }
      .locks-page h1 {
        margin: 0 0 0.5rem;
        font-size: 1.6rem;
      }
      .locks-page .lede {
        margin: 0 0 1.25rem;
        color: var(--parchment-faint, #b8b0a0);
        line-height: 1.5;
      }
      .locks-page .back-link {
        display: inline-block;
        margin-bottom: 1.25rem;
      }
      .place-block {
        margin: 0 0 1.5rem;
      }
      .place-block h2 {
        margin: 0 0 0.25rem;
        font-size: 1.15rem;
      }
      .place-count {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        opacity: 0.7;
      }
      .place-block ul {
        margin: 0;
        padding-left: 1.15rem;
      }
      .place-block li {
        margin: 0.25rem 0;
        line-height: 1.4;
      }
      .lock-meta {
        font-size: 0.85em;
        opacity: 0.65;
      }
      .locks-page a {
        color: var(--bronze, #e9b969);
      }
    </style>
  </head>
  <body>
    <main class="locks-page">
      <p class="back-link"><a href="/">← Gothic Remake Lock Breaker</a></p>
      <h1>Gothic Remake lock catalog</h1>
      <p class="lede">
        ${total} named locks from Gothic 1 Remake, grouped by place.
        Open any lock to load it into the free edge-safe solver and get a step-by-step walkthrough.
      </p>
      ${placeSections}
      <p class="lede">Updated ${escapeHtml(releaseDate)} · <a href="/">Open the solver</a></p>
    </main>
  </body>
</html>
`;
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const entries = Array.isArray(catalog.entries) ? catalog.entries : [];
  if (entries.length < 1) throw new Error("Catalog has no entries.");

  const builtIndexHtml = readFileSync(BUILT_INDEX_PATH, "utf8");
  const stylesheetHref = extractStylesheetHref(builtIndexHtml);

  mkdirSync(OUT_DIR, { recursive: true });
  const html = renderLocksIndexHtml(entries, { stylesheetHref });
  writeFileSync(join(OUT_DIR, "index.html"), html, "utf8");
  console.log(`prerendered /locks/ (${entries.length} locks)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
