"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process"),
  root = path.resolve(__dirname, "../.."),
  out = path.join(__dirname, "node_modules/.vpm-keymap");
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 3e6,
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
console.log(run("bun", [path.join(__dirname, "build.cjs")]).trim());
for (const runtime of ["node", "bun"]) {
  const results = ["upstream", "vpm"].map((v) =>
    JSON.parse(run(runtime, [path.join(out, v + "-tests.cjs")])),
  );
  assert.deepEqual(
    results[0].map(({ name, pass }) => ({ name, pass })),
    results[1].map(({ name, pass }) => ({ name, pass })),
  );
  assert.equal(results[0].length, 6);
  const failed = results[0].filter((r) => !r.pass);
  assert.equal(failed.length, 1);
  assert.equal(
    failed[0].name,
    require("./upstream.json").knownPublishedMismatch.test,
  );
  assert.match(failed[0].message, /0.*1/);
  run(runtime, [
    runtime === "node" ? "--test" : "test",
    path.join(root, "packages/vprosemirror-keymap/test/contracts.test.cjs"),
  ]);
  console.log(
    runtime +
      ": five unchanged upstream tests pass; the same stale Shift-only assertion fails both implementations. Six independent current-contract groups pass.",
  );
}
