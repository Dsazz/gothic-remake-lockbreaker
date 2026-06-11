#!/usr/bin/env node
/**
 * Cursor stop hook: run make lint && make test after each agent turn.
 * On failure, returns followup_message so the agent can fix issues (max loop_limit in hooks.json).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readInput() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function finish(payload = {}) {
  console.log(JSON.stringify(payload));
}

const input = readInput();
const status = input.status ?? "";

// Skip verify when the turn did not complete — no point linting a broken or cancelled run.
if (status === "aborted" || status === "error") {
  finish();
  process.exit(0);
}

try {
  execSync("make lint && make test", {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  finish();
} catch (err) {
  const combined = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
  const tail = combined.split("\n").slice(-80).join("\n");
  const followup_message = [
    "Lint or test failed after the agent turn. Fix the issues; `make lint && make test` must pass before finishing.",
    "",
    "```",
    tail || err.message || "make lint && make test failed",
    "```",
  ].join("\n");
  finish({ followup_message });
}
