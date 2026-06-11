import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function pressUrlFromModule(source, constantName) {
  const pattern = new RegExp(
    `export const ${constantName} =\\s*\\n?\\s*"([^"]+)"`,
  );
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not parse ${constantName} from src/version.js`);
  }
  return match[1];
}

function latestChangelogDate(source) {
  const match = source.match(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})/m);
  if (!match) {
    throw new Error("Could not parse latest released date from CHANGELOG.md");
  }
  return { version: match[1], date: match[2] };
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const pattern = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  for (const match of html.matchAll(pattern)) {
    blocks.push(match[1]);
  }
  return blocks;
}

const versionSource = read("src/version.js");
const indexHtml = read("index.html");
const llmsTxt = read("llms.txt");
const changelog = read("CHANGELOG.md");
const sitemap = read("sitemap.xml");

const pressPcGames = pressUrlFromModule(versionSource, "PRESS_PCGAMES_URL");
const { date: changelogDate } = latestChangelogDate(changelog);

const failures = [];

for (const [label, content] of [
  ["index.html", indexHtml],
  ["llms.txt", llmsTxt],
]) {
  if (!content.includes(pressPcGames)) {
    failures.push(`${label} missing PRESS_PCGAMES_URL`);
  }
}

if (indexHtml.includes('"FAQPage"')) {
  failures.push("index.html must not contain FAQPage JSON-LD");
}

const jsonLdBlocks = extractJsonLdBlocks(indexHtml);
if (jsonLdBlocks.length !== 2) {
  failures.push(`index.html must have exactly 2 JSON-LD blocks, found ${jsonLdBlocks.length}`);
}

const jsonLdTypes = [];
for (const [index, block] of jsonLdBlocks.entries()) {
  try {
    const parsed = JSON.parse(block);
    jsonLdTypes.push(parsed["@type"]);
  } catch (err) {
    failures.push(`JSON-LD block ${index + 1} is invalid JSON: ${err.message}`);
  }
}

if (jsonLdTypes.length === 2) {
  const expected = ["WebApplication", "HowTo"];
  for (const type of expected) {
    if (!jsonLdTypes.includes(type)) {
      failures.push(`JSON-LD missing @type ${type}; found: ${jsonLdTypes.join(", ")}`);
    }
  }
}

if (!llmsTxt.includes(changelogDate)) {
  failures.push(`llms.txt must include changelog date ${changelogDate} under Last updated`);
}

if (!llmsTxt.includes("## Comparison")) {
  failures.push("llms.txt must include ## Comparison section");
}

if (!/## Preferred citation[\s\S]*Gothic Remake Lock Breaker/.test(llmsTxt)) {
  failures.push("llms.txt Preferred citation must mention Gothic Remake Lock Breaker");
}

if (!indexHtml.includes("Gothic Remake Lockbreaker")) {
  failures.push("index.html title must include Gothic Remake Lockbreaker (one word)");
}

if (!/lockpicking calculator/i.test(indexHtml)) {
  failures.push("index.html meta description must mention lockpicking calculator");
}

if (
  !indexHtml.includes("Gothic Remake Lockbreaker") ||
  !indexHtml.includes("Gothic Remake Lock Breaker")
) {
  failures.push("index.html JSON-LD alternateName must include Lockbreaker and Lock Breaker variants");
}

if (!indexHtml.includes('hreflang="en"')) {
  failures.push("index.html must include static hreflang=en link");
}

if (!indexHtml.includes('hreflang="x-default"')) {
  failures.push("index.html must include static hreflang=x-default link");
}

if (!indexHtml.includes("app-foot-faq")) {
  failures.push("index.html must include collapsed footer FAQ (app-foot-faq)");
}

const faqBlock = indexHtml.match(/<details class="app-foot-faq">[\s\S]*?<\/details>/)?.[0] ?? "";
if (!faqBlock) {
  failures.push("index.html must include app-foot-faq details block");
} else {
  if (!/net-turn/i.test(faqBlock)) {
    failures.push("index.html footer FAQ must mention net-turn");
  }
  if (!/Gothic Remake Lock Breaker/.test(faqBlock)) {
    failures.push("index.html footer FAQ must mention Gothic Remake Lock Breaker");
  }
  if (!/free/i.test(faqBlock) || !/no account/i.test(faqBlock)) {
    failures.push("index.html footer FAQ must mention free and no account");
  }
}

if (!/Gothic Remake Lock Breaker[\s\S]*app-definition/s.test(indexHtml)) {
  failures.push("index.html app-definition must mention Gothic Remake Lock Breaker");
}

if (!/beginner-friendly|beginners/i.test(llmsTxt)) {
  failures.push("llms.txt must include beginner-friendly positioning");
}

if (!indexHtml.includes("featureList")) {
  failures.push("index.html WebApplication JSON-LD must include featureList");
}

if (!/beginner-friendly/i.test(indexHtml)) {
  failures.push("index.html must include beginner-friendly positioning");
}

const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
if (lastmods.length === 0) {
  failures.push("sitemap.xml has no lastmod entries");
} else {
  for (const lastmod of lastmods) {
    if (!lastmod.includes(changelogDate)) {
      failures.push(`sitemap.xml lastmod ${lastmod} does not match changelog date ${changelogDate}`);
    }
  }
}

if (failures.length > 0) {
  console.error("SEO asset drift detected:\n" + failures.map((m) => `  - ${m}`).join("\n"));
  process.exit(1);
}

console.log(`SEO assets OK (changelog date ${changelogDate})`);
