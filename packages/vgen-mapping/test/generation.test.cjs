"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const own = require(".."),
  control = require("node:module").createRequire(
    require.resolve("../../../scripts/source-map-conformance/package.json"),
  )("@jridgewell/gen-mapping");
test("in-order and shuffled segments retain the same lookup, contents and ignore metadata as 0.3.13", () => {
  let seed = 713;
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 8) % max;
  }
  for (const ordered of [false, true]) {
    const v = new own.GenMapping({ file: "built.js", sourceRoot: "/src" }),
      u = new control.GenMapping({ file: "built.js", sourceRoot: "/src" });
    for (let i = 0; i < 2000; i++) {
      const line = ordered ? Math.floor(i / 40) : random(50),
        col = ordered ? (i % 40) * 2 : random(80);
      const source = ["menu.tsx", "constructor", "__proto__", null][random(4)];
      const fn = random(2) ? "maybeAddSegment" : "addSegment";
      const args = source
        ? [
            line,
            col,
            source,
            random(5),
            random(6),
            ["alpha", "hasOwnProperty", null][random(3)],
            "contents",
          ]
        : [line, col];
      own[fn](v, ...args);
      control[fn](u, ...args);
      if (i % 53 === 0) {
        const ignore = i % 3 !== 0;
        own.setIgnore(v, "menu.tsx", ignore);
        control.setIgnore(u, "menu.tsx", ignore);
      }
    }
    assert.deepEqual(own.allMappings(v), control.allMappings(u));
    assert.deepEqual(own.toDecodedMap(v), control.toDecodedMap(u));
    assert.deepEqual(own.toEncodedMap(v), control.toEncodedMap(u));
  }
});
test("imported duplicate sources and names retain their numbered slots and can be edited independently", () => {
  const source = {
    version: 3,
    names: ["a", "a"],
    sources: ["entry", "entry"],
    sourcesContent: ["first", "second"],
    ignoreList: [1],
    mappings: [[[0, 1, 0, 0, 1]]],
  };
  const copy = structuredClone(source);
  const m = own.fromMap(source);
  own.addSegment(m, 0, 1, "entry", 1, 2, "a");
  own.setSourceContent(m, "entry", "edited");
  const out = own.toDecodedMap(m);
  assert.deepEqual(out.sourcesContent, ["edited", "second"]);
  assert.deepEqual(out.ignoreList, [1]);
  assert.deepEqual(out.mappings, [
    [
      [0, 1, 0, 0, 1],
      [1, 0, 1, 2, 0],
    ],
  ]);
  assert.deepEqual(out.names, ["a", "a"]);
  assert.deepEqual(source, copy);
});
test("invalid coordinates fail before adding a source or a line", () => {
  const m = new own.GenMapping();
  for (const args of [
    [-1, 0],
    [0, NaN],
    [0.5, 1],
    [9, 0, "menu", 0, -1],
  ])
    assert.throws(() => own.addSegment(m, ...args), RangeError);
  assert.deepEqual(own.toDecodedMap(m).sources, []);
  assert.deepEqual(own.toDecodedMap(m).mappings, []);
});
