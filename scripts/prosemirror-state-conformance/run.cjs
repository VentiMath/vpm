"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  out = path.join(__dirname, "node_modules/.vpm-state");
function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 5e6,
    timeout: 120000,
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
for (const variant of ["upstream", "app", "vpm"])
  console.log(run("bun", [path.join(__dirname, "build.cjs"), variant]).trim());
for (const runtime of ["node", "bun"]) {
  for (const variant of ["upstream", "vpm"]) {
    const files = fs
      .readdirSync(out)
      .filter((f) => f.startsWith(variant + "-") && f.endsWith(".test.cjs"))
      .map((f) => path.join(out, f));
    run(runtime, [runtime === "node" ? "--test" : "test", ...files]);
    console.log(
      runtime + ": " + variant + " 35 unchanged upstream tests pass.",
    );
  }
  run(runtime, [
    runtime === "node" ? "--test" : "test",
    path.join(root, "packages/vprosemirror-state/test/contracts.test.cjs"),
  ]);
  console.log(
    runtime + ": eight original state and selection contract groups pass.",
  );
  const controls = ["upstream", "app", "vpm"].map((variant) =>
    JSON.parse(run(runtime, [path.join(out, variant + "-callers.cjs")])),
  );
  assert.deepEqual(controls[2], controls[0]);
  assert.deepEqual(controls[2], controls[1]);
  console.log(
    runtime +
      ": 13 Tiptap command snapshots match state 1.4.4 with current and app model/transform closures (JSON, HTML, selection).",
  );
}

const config = {
  compilerOptions: {
    strict: true,
    noEmit: true,
    module: "NodeNext",
    moduleResolution: "NodeNext",
    target: "ES2022",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    types: [],
    paths: {
      "vprosemirror-state": [
        path.join(root, "packages/vprosemirror-state/index.d.ts"),
      ],
      "prosemirror-view": [
        path.join(__dirname, "node_modules/prosemirror-view/dist/index.d.ts"),
      ],
      "prosemirror-state": [
        path.join(root, "packages/vprosemirror-state/index.d.ts"),
      ],
      "prosemirror-transform": [
        path.join(root, "packages/vprosemirror-transform/index.d.ts"),
      ],
      "prosemirror-model": [
        path.join(root, "packages/vprosemirror-model/index.d.ts"),
      ],
    },
  },
  files: [
    path.resolve(__dirname, "../prosemirror-model-conformance/types.ts"),
    path.join(__dirname, "public-types.ts"),
  ],
};
const typeFile = path.join(out, "types-check.json");
fs.writeFileSync(typeFile, JSON.stringify(config));
run("node", [require("../platform-types.cjs").compiler().path, "-p", typeFile]);
console.log(
  "TS7: real Tiptap, state and transform declaration consumers pass without skipLibCheck.",
);
