"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 5e6,
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
console.log(run("bun", [path.join(__dirname, "build.cjs")]).trim());
const oldFailures = [
  "can wrap lists that may start with lists",
  "can split an item of either type",
  "uses the split item's type when given attributes",
  "splits an outer item of a different type when lifting from a nested list",
  "can lift into an outer item of a different type",
  "keeps item types when lifting an item with siblings after it",
  "can sink an item in a list that starts with another type",
  "can sink an item into a nested list of mixed types",
];
for (const runtime of ["node", "bun"]) {
  for (const fixture of [
    "transform-followup.json",
    "deletion-followup.json",
    "nested-fitting-followup.json",
  ]) {
    const diagnosis = JSON.parse(
      run(runtime, [
        path.join(__dirname, "diagnose-transform.cjs"),
        path.join(__dirname, fixture),
      ]),
    );
    assert.equal(diagnosis.matches, true, fixture);
  }
  for (const graph of ["upstream", "app", "vpm", "app-vpm", "current-vpm"]) {
    const rows = JSON.parse(
      run(runtime, [
        path.join(__dirname, "node_modules/.vpm-schema-list", graph + ".cjs"),
      ]),
    );
    assert.equal(rows.length, 38);
    const failed = rows.filter((x) => !x.pass);
    if (graph === "app")
      assert.deepEqual(
        failed.map((x) => x.name),
        oldFailures,
      );
    else assert.deepEqual(failed, []);
  }
  run(runtime, [
    runtime === "node" ? "--test" : "test",
    path.resolve(
      __dirname,
      "../../packages/vprosemirror-schema-list/test/contracts.test.cjs",
    ),
  ]);
  console.log(
    runtime +
      ": all38 current upstream list tests pass on current/fullVPM/current-VPM/app-VPM; app1.5.1 has exactly8 expected pre1.6.0 differences. Nine independent groups,96 boundary and128 nested deletions and6000 differential list edits pass.",
  );
}
