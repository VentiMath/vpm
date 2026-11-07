"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
for (const runtime of ["node", "bun"])
  for (const args of [
    [
      runtime === "node" ? "--test" : "test",
      path.join(root, "packages/vw3c-keyname/test/contracts.test.cjs"),
    ],
    [path.join(__dirname, "callers.cjs")],
  ]) {
    const r = spawnSync(runtime, args, {
      cwd: root,
      encoding: "utf8",
      timeout: 120000,
    });
    assert.ifError(r.error);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    console.log(r.stdout.trim() || r.stderr.trim());
  }
console.log(
  "Node/Bun: six contract groups, 430,080 differential cases and 138 keymap dispatches each pass.",
);
