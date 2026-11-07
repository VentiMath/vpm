"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const { out } = require("./build.cjs"),
  root = path.resolve(__dirname, "../..");
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 5e6,
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
console.log(run("bun", [path.join(__dirname, "build.cjs")]).trim());
for (const runtime of ["node", "bun"]) {
  for (const variant of ["upstream", "app", "vpm"])
    for (const file of ["webtest-decoration.ts", "webtest-decoration-app.ts"]) {
      const results = JSON.parse(
        run(runtime, [path.join(out, variant + "-" + file + ".cjs")]),
      );
      assert.equal(
        results.filter((r) => !r.pass).length,
        0,
        JSON.stringify(
          results.filter((r) => !r.pass),
          null,
          2,
        ),
      );
      console.log(
        `${runtime}: ${variant} passes ${results.length} unchanged ${file} tests.`,
      );
    }
  console.log(
    run(runtime, [
      runtime === "node" ? "--test" : "test",
      "packages/vprosemirror-view/test/contracts.test.cjs",
    ]).trim(),
  );
  const callers = ["upstream", "app", "vpm"].map((v) =>
    JSON.parse(
      run(runtime, [
        "-e",
        `console.log(JSON.stringify(require(${JSON.stringify(path.join(out, v + "-caller.cjs"))})))`,
      ]),
    ),
  );
  assert.deepEqual(callers[2], callers[0]);
  assert.deepEqual(callers[2], callers[1]);
  console.log(
    `${runtime}: 12 documentation-editor Selection contract cases match current/app/VPM.`,
  );
}
