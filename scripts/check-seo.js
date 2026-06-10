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
const pressBuffed = pressUrlFromModule(versionSource, "PRESS_BUFFED_URL");
const { date: changelogDate } = latestChangelogDate(changelog);

const failures = [];

for (const [label, content] of [
  ["index.html", indexHtml],
  ["llms.txt", llmsTxt],
]) {
  if (!content.includes(pressPcGames)) {
    failures.push(`${label} missing PRESS_PCGAMES_URL`);
  }
  if (!content.includes(pressBuffed)) {
    failures.push(`${label} missing PRESS_BUFFED_URL`);
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
