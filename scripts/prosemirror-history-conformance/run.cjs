"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 5e6,
    timeout: 120000,
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
console.log(run("bun", [path.join(__dirname, "build.cjs")]).trim());
for (const runtime of ["node", "bun"]) {
  for (const variant of ["upstream", "app", "vpm", "app-vpm"]) {
    const rows = JSON.parse(
      run(runtime, [
        path.join(__dirname, "node_modules/.vpm-history", variant + ".cjs"),
      ]),
    );
    assert.equal(rows.length, 28);
    assert(
      rows.every((x) => x.pass),
      JSON.stringify(rows.filter((x) => !x.pass)),
    );
  }
  run(runtime, [
    runtime === "node" ? "--test" : "test",
    path.resolve(
      __dirname,
      "../../packages/vprosemirror-history/test/contracts.test.cjs",
    ),
  ]);
  console.log(
    runtime +
      ": 28 unchanged upstream tests pass on four graphs; five independent contract groups pass, including 4000 differential edits and bounded partial cycles.",
  );
}
