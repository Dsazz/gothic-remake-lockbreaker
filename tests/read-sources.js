// Shared source-text readers for grep-based invariant tests.
//
// Two layers were decomposed from single files into folders:
//   - the view layer: src/view.js (now a barrel) -> src/view/*.js
//   - the stylesheet: styles.css (now an @import entry) -> styles/*.css
// These helpers concatenate the split sources so source assertions keep working
// and survive further internal reshuffling. Order is preserved (sorted for the
// view layer; @import order for CSS) so each block stays contiguous.

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function readViewSource() {
  const dir = join(root, "src", "view");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js")).sort();
  const texts = await Promise.all(files.map((f) => readFile(join(dir, f), "utf8")));
  return texts.join("\n");
}

export async function readStyles() {
  const entry = await readFile(join(root, "styles.css"), "utf8");
  const imports = [...entry.matchAll(/@import\s+"\.\/([^"]+)"/g)].map((m) => m[1]);
  const parts = await Promise.all(imports.map((p) => readFile(join(root, p), "utf8")));
  return parts.join("\n");
}
