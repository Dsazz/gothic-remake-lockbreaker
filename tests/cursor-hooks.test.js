import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const verifyPath = join(root, ".cursor/hooks/verify.mjs");
const hooksPath = join(root, ".cursor/hooks.json");

test("verify.mjs parses and hooks.json configures stop hook", async () => {
  const syntax = spawnSync("node", ["--check", verifyPath], { encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

  const verifyText = await readFile(verifyPath, "utf8");
  assert.doesNotMatch(verifyText, /MAX_AUTO_FOLLOWUPS/);
  assert.doesNotMatch(verifyText, /loop_count/);
  assert.match(verifyText, /status === "aborted" \|\| status === "error"/);
  assert.match(verifyText, /followup_message/);
  assert.match(verifyText, /make lint && make test/);

  const hooks = JSON.parse(await readFile(hooksPath, "utf8"));
  const stop = hooks.hooks?.stop?.[0];
  assert.ok(stop, "hooks.json must define a stop hook");
  assert.equal(stop.loop_limit, 3);
  assert.equal(stop.timeout, 300);
  assert.match(stop.command, /verify\.mjs/);
});
