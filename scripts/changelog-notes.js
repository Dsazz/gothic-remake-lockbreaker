import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function changelogNotes(source, version) {
  const semver = version.replace(/^v/, "");
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${semver}]`));
  if (start === -1) {
    throw new Error(`No CHANGELOG.md entry for ${semver}`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## [")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

const cliVersion = process.argv[2];
if (cliVersion) {
  const source = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  process.stdout.write(`${changelogNotes(source, cliVersion)}\n`);
}
