"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const remap = require("../index.cjs");
const control = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
)("@jridgewell/remapping");
const map = (sources, mappings, extra = {}) => ({
  version: 3,
  sources,
  mappings,
  names: ["outer", "inner"],
  ...extra,
});
const root = map(
  ["compiled/a.js", "plain.ts"],
  [
    [
      [0, 0, 0, 3, 0],
      [4, 0, 0, 6],
      [8, 1, 0, 1],
    ],
  ],
  { file: "output.js" },
);
const child = map(["src.ts"], [[[0, 0, 3, 7, 1], [6]]], {
  sourcesContent: ["source"],
  ignoreList: [0],
});
test("resolve callbacks and retain names, content, ignore flags and explicit mapping boundaries", () => {
  for (const options of [
    false,
    true,
    { decodedMappings: true },
    { excludeContent: true, decodedMappings: true },
  ]) {
    function run(api) {
      const calls = [];
      const result = api(
        root,
        (source, ctx) => {
          calls.push({ ...ctx });
          if (source === "compiled/a.js") {
            ctx.source = "staged/a.js";
            return child;
          }
          if (source === "staged/src.ts") {
            ctx.source = "original.ts";
            ctx.content = "";
            ctx.ignore = false;
          }
          return null;
        },
        options,
      );
      return [
        calls,
        result.toString(),
        Object.hasOwn(result, "sourcesContent"),
      ];
    }
    assert.deepEqual(run(remap), run(control));
  }
});
test("different map orders, gaps, repeated columns and multi-source transforms", () => {
  let seed = 1234;
  const next = (limit) =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % limit;
  for (let iteration = 0; iteration < 200; iteration++) {
    function rows(n) {
      return Array.from({ length: 4 }, () =>
        Array.from({ length: 15 }, (_, i) =>
          next(8) === 0
            ? [i >> 1]
            : [i >> 1, next(n), next(5), next(12), next(2)],
        ),
      );
    }
    const list = [
      map(["middle"], rows(1)),
      map(["base"], rows(1)),
      map(["a", "b"], rows(2)),
    ];
    const opts = { decodedMappings: !!(iteration % 2) };
    assert.equal(
      remap(list, () => null, opts).toString(),
      control(list, () => null, opts).toString(),
    );
  }
  assert.throws(() => remap([root, child], () => null), /one source/);
  const empty = map([], []);
  const loaded = [];
  assert.equal(
    remap([empty, child], (s) => {
      loaded.push(s);
    }).mappings,
    "",
  );
  assert.deepEqual(loaded, ["src.ts"]);
  assert.throws(() => remap([], () => null), /at least one/);
});
test("long loader chains keep the original position without recursive calls", () => {
  const identity = map(["next"], [[[0, 0, 0, 0]]]);
  const result = remap(identity, (_, ctx) =>
    ctx.depth < 12000 ? identity : null,
  );
  assert.deepEqual(result.sources, ["next"]);
  assert.equal(result.mappings, "AAAA");
});

test("omit an absent, null or empty output filename from serialized build maps", () => {
  for (const file of [undefined, null, "", "bundle.js"]) {
    const input = { ...root, file };
    const result = remap(input, () => null);
    assert.equal(result.file, file || undefined);
    assert.equal(result.toString(), control(input, () => null).toString());
  }
});
