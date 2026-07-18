#!/usr/bin/env node
/**
 * One-shot bootstrap: fetch public lock-setup dump → assets/catalog/locks.json.
 * Internal provenance only — see AGENTS.md / CHANGELOG. Not a runtime dependency.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { catalogEntryFromRemote } from "../src/catalog/entries.js";

const DUMP_URL = "https://www.gothicsolve.com/api/lock-setups?all=1";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../assets/catalog/locks.json");

const response = await fetch(DUMP_URL, {
  headers: {
    Accept: "application/json",
    Origin: "https://www.gothicsolve.com",
    Referer: "https://www.gothicsolve.com/",
  },
});
if (!response.ok) {
  throw new Error(`Dump fetch failed: ${response.status}`);
}

const payload = await response.json();
const items = Array.isArray(payload.items) ? payload.items : [];
if (items.length < 1) throw new Error("Dump contained no items.");

const entries = items.map((item) => catalogEntryFromRemote(item));
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify({ version: 1, entries }, null, 0)}\n`, "utf8");
console.log(`Wrote ${entries.length} locks → ${OUT}`);
