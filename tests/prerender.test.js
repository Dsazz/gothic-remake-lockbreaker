import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderLocale } from "../scripts/prerender-locales.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_HTML = readFileSync(join(ROOT, "index.html"), "utf8");
const DE = JSON.parse(readFileSync(join(ROOT, "locales", "de.json"), "utf8"));
const EN = JSON.parse(readFileSync(join(ROOT, "locales", "en.json"), "utf8"));
const UKR = JSON.parse(readFileSync(join(ROOT, "locales", "ukr.json"), "utf8"));

test("renderLocale bakes German metadata and self-canonical", async () => {
  const html = await renderLocale(SOURCE_HTML, "de");

  assert.ok(html.includes(`<title>${DE.seo.title}</title>`), "German <title> not rendered");
  assert.ok(
    html.includes('href="https://gothiclockbreaker.com/de/"'),
    "canonical/hreflang not pointed at /de/",
  );
  assert.ok(html.includes('lang="de"'), "html lang attribute not set to de");
});

test("renderLocale localizes the footer FAQ", async () => {
  const html = await renderLocale(SOURCE_HTML, "de");

  assert.ok(html.includes(DE.footer.faq.q1), "German FAQ question not rendered");
  assert.ok(html.includes(DE.footer.faq.a1), "German FAQ answer not rendered");
  assert.ok(
    !html.includes("What is Gothic Remake Lock Breaker?"),
    "English FAQ text leaked into German page",
  );
});

test("renderLocale root-absolutizes relative asset refs for subpath serving", async () => {
  const html = await renderLocale(SOURCE_HTML, "de");

  assert.ok(!/(?:src|href)="assets\//.test(html), "relative assets/ ref survived");
  assert.ok(!/(?:src|href)="styles\.css"/.test(html), "relative styles.css ref survived");
  assert.ok(!/(?:src|href)="src\//.test(html), "relative src/ ref survived");
  assert.ok(html.includes('href="/assets/favicon.svg"'), "favicon not root-absolutized");
});

test("renderLocale localizes and preserves the how-to-map foreignObject labels", async () => {
  const html = await renderLocale(SOURCE_HTML, "de");

  for (const key of ["lock1", "notch", "lock6", "turnOnce"]) {
    assert.ok(html.includes(DE.map[key]), `German map label "${key}" not rendered`);
    assert.ok(!html.includes(EN.map[key]), `English map label "${key}" leaked into German page`);
  }
  // The label-clipping fix relies on foreignObject + an xhtml div surviving serialization;
  // if happy-dom flattened either, DE/PL labels would not render as wrapping HTML.
  assert.equal(
    (html.match(/<foreignObject/g) || []).length,
    4,
    "foreignObject map labels not preserved through prerender",
  );
  assert.ok(
    html.includes('xmlns="http://www.w3.org/1999/xhtml"'),
    "xhtml namespace dropped — foreignObject content would not render as HTML",
  );
});

test("renderLocale bakes Ukrainian metadata and self-canonical at /uk/", async () => {
  const html = await renderLocale(SOURCE_HTML, "ukr");

  assert.ok(html.includes(`<title>${UKR.seo.title}</title>`), "Ukrainian <title> not rendered");
  // Locale id is "ukr" but the URL subpath / hreflang tag is "uk".
  assert.ok(
    html.includes('href="https://gothiclockbreaker.com/uk/"'),
    "canonical/hreflang not pointed at /uk/",
  );
  assert.ok(html.includes('lang="uk"'), "html lang attribute not set to uk");
});
