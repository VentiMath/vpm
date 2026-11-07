"use strict";
const { spawnSync } = require("node:child_process"),
  path = require("node:path"),
  assert = require("node:assert/strict");
function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 120000 });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
console.log(run("bun", [path.join(__dirname, "build.cjs")]).trim());
for (const runtime of ["node", "bun"]) {
  for (const variant of ["upstream", "vpm"])
    assert.match(
      run(runtime, [
        path.join(__dirname, "node_modules/.vpm-rope", variant + ".cjs"),
      ]),
      /All passed/,
    );
  run(runtime, [
    runtime === "node" ? "--test" : "test",
    path.resolve(
      __dirname,
      "../../packages/vrope-sequence/test/contracts.test.cjs",
    ),
  ]);
  console.log(run(runtime, [path.join(__dirname, "callers.cjs")]).trim());
  console.log(
    runtime + ": unchanged upstream tests and five independent groups pass.",
  );
}

const context = { window: {} };
require("node:vm").runInNewContext(
  require("node:fs").readFileSync(
    path.join(__dirname, "node_modules/.vpm-rope/bundle.js"),
    "utf8",
  ),
  context,
);
for (const version of ["prosemirror-history", "prosemirror-history-app"])
  assert.equal(
    JSON.stringify(context.window.ropeResults[version + "-upstream"]),
    JSON.stringify(context.window.ropeResults[version + "-vpm"]),
  );
console.log("Executed browser history bundles match for both caller versions.");
