"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const codec = require("..");
const { createRequire } = require("node:module");
const fixture = createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const controls = [fixture("codec-app"), fixture("@jridgewell/sourcemap-codec")];
test("preserves line boundaries, stable column order and signed delta limits", () => {
  const samples = [
    [],
    [[]],
    [[], [], []],
    [[[0, 0, 0, 0, 0], [0, 1, 7, 6], [0]]],
    [
      [
        [4, 1, 8, 2],
        [2, 0, 0, 0, 3],
        [2, 1, 1, 2, 0],
      ],
      [],
      [[0, 3, 5, 0]],
    ],
    ...[-2147483648, -2147483647, -16, -1, 0, 15, 16, 31, 512, 2147483647].map(
      (n) => [[[n]]],
    ),
  ];
  for (const lines of samples)
    for (const control of controls) {
      const wire = control.encode(lines);
      assert.equal(codec.encode(lines), wire);
      assert.deepEqual(codec.decode(wire), control.decode(wire));
    }
});
test("compares generated mappings and emitted build maps with both controls", () => {
  let seed = 1;
  function random(limit) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 12) % limit;
  }
  for (let n = 0; n < 500; n++) {
    const lines = Array.from({ length: random(15) }, () =>
      Array.from({ length: random(10) }, () => {
        const fields = [
          random(1024),
          random(9),
          random(512),
          random(300),
          random(18),
        ];
        return fields.slice(0, [1, 4, 5][random(3)]);
      }),
    );
    for (const control of controls) {
      const encoded = control.encode(lines);
      assert.equal(codec.encode(lines), encoded);
      assert.deepEqual(codec.decode(encoded), control.decode(encoded));
    }
  }
  const fs = require("node:fs"),
    path = require("node:path");
  for (const name of ["gen-mapping", "trace-mapping"]) {
    const mappings = JSON.parse(
      fs.readFileSync(
        path.join(
          path.dirname(fixture.resolve("@jridgewell/" + name)),
          name + ".mjs.map",
        ),
      ),
    ).mappings;
    for (const control of controls)
      assert.deepEqual(codec.decode(mappings), control.decode(mappings));
    assert.equal(codec.encode(codec.decode(mappings)), mappings);
  }
});
test("rejects malformed fields and incomplete segments", () => {
  for (const wire of [
    ",",
    "A,",
    "A,,A",
    "AA",
    "AAA",
    "AAAAAA",
    "g",
    "g;",
    "é",
    "!",
    "//////E",
  ])
    assert.throws(() => codec.decode(wire));
  for (const lines of [[[[1, 2]]], [[["3"]]], [[[Infinity]]], [[[2147483648]]]])
    assert.throws(() => codec.encode(lines));
});
test("flushes at any segment boundary without changing mapping deltas", () => {
  const row = Array.from({length:12000}, (_,i)=>[i,0,i,i%100,i%50]);
  for (const lines of [[row], [...Array.from({length:10},()=>[]),row]]) {
    const wire = codec.encode(lines);
    assert.equal(wire, controls[1].encode(lines));
    assert.deepEqual(codec.decode(wire), lines);
  }
});
