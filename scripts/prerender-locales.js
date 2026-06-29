// Build-time prerender: emit crawlable per-locale pages (/de/, /pl/) by running the
// app's OWN initI18n() + applyStaticContent() against the Vite-built dist/index.html
// inside a headless happy-dom Window. Reusing the real render code means the locale
// logic lives only in src/ — the prerender just supplies the browser globals it expects.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { LOCALE_PATH, PRERENDERED_LOCALES, initI18n, localePageUrl, t } from "../src/i18n/index.js";
import { applyStaticContent } from "../src/i18n/static-content.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ABSOLUTE_REF = /^(?:https?:|\/\/|\/|#|data:|mailto:|tel:)/i;

// Subpath pages (/de/) would resolve relative assets/ refs against the subpath → 404.
// Vite's base "/" already root-absolutizes bundled refs; this catches any leftover.
function rootAbsolutizeRefs(document) {
  for (const el of document.querySelectorAll("[src], [href]")) {
    for (const attr of ["src", "href"]) {
      const value = el.getAttribute(attr);
      if (value && !ABSOLUTE_REF.test(value)) el.setAttribute(attr, `/${value}`);
    }
  }
}

function readLocaleCatalog(locale) {
  return JSON.parse(readFileSync(join(ROOT, "locales", `${locale}.json`), "utf8"));
}

// The src modules read these as bare globals; happy-dom supplies spec-correct implementations
// (dataset, localStorage, location.pathname). fetch is the only shim — it serves catalogs from disk.
function installBrowserGlobals(window) {
  globalThis.document = window.document;
  globalThis.location = window.location;
  globalThis.localStorage = window.localStorage;
  globalThis.sessionStorage = window.sessionStorage;
  globalThis.history = window.history;
  globalThis.fetch = async (url) => {
    const match = String(url).match(/locales\/([a-z]+)\.json$/);
    if (!match) throw new Error(`Unexpected prerender fetch: ${url}`);
    const json = readLocaleCatalog(match[1]);
    return { ok: true, json: async () => json };
  };
}

// The footer FAQ is intentionally not hydrated at runtime (see modules.test.js guard);
// the prerender is the only surface that localizes it, so the static SEO pages aren't thin.
function localizeFaq(document) {
  const faq = document.querySelector(".app-foot-faq");
  if (!faq) return;
  for (const node of faq.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.getAttribute("data-i18n"));
  }
}

/** Pure render: take the built English HTML, return the localized HTML string. */
export async function renderLocale(html, locale) {
  const window = new Window({
    url: localePageUrl(locale),
    settings: { disableJavaScriptEvaluation: true },
  });
  window.document.write(html);
  installBrowserGlobals(window);
  await initI18n();
  applyStaticContent();
  localizeFaq(window.document);
  rootAbsolutizeRefs(window.document);
  const serialized = window.document.documentElement.outerHTML;
  await window.happyDOM.close();
  return `<!DOCTYPE html>\n${serialized}`;
}

async function main() {
  const html = readFileSync(join(ROOT, "dist", "index.html"), "utf8");
  for (const locale of PRERENDERED_LOCALES) {
    const out = await renderLocale(html, locale);
    // Output dir is the locale's URL subpath, not its id (e.g. ukr → /uk/), so the
    // emitted file matches the canonical/sitemap path instead of 404ing.
    const subpath = LOCALE_PATH[locale].replace(/^\/|\/$/g, "");
    const dir = join(ROOT, "dist", subpath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), out, "utf8");
    console.log(`prerendered ${LOCALE_PATH[locale]}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
