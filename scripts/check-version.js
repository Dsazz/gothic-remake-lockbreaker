import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function versionFromModule(source) {
  const match = source.match(/export const VERSION = "([^"]+)"/);
  if (!match) throw new Error("Could not parse VERSION from src/version.js");
  return match[1];
}

function versionFromChangelog(source) {
  const match = source.match(/^## \[([^\]]+)\]/m);
  if (!match) throw new Error("Could not parse latest version from CHANGELOG.md");
  return match[1];
}

function versionFromReadme(source) {
  const match = source.match(/Current release:\s*v([0-9]+\.[0-9]+\.[0-9]+)/);
  if (!match) throw new Error('Could not parse "Current release" from README.md');
  return match[1];
}

const expected = versionFromModule(read("src/version.js"));
const changelog = versionFromChangelog(read("CHANGELOG.md"));
const readme = versionFromReadme(read("README.md"));

const mismatches = [];
if (changelog !== expected) {
  mismatches.push(`CHANGELOG.md latest is ${changelog}, expected ${expected}`);
}
if (readme !== expected) {
  mismatches.push(`README.md is v${readme}, expected v${expected}`);
}

if (mismatches.length > 0) {
  console.error("Version drift detected:\n" + mismatches.map((m) => `  - ${m}`).join("\n"));
  process.exit(1);
}

console.log(`Version OK: v${expected}`);
