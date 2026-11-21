"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const own = require("..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const up = fixture("@jridgewell/trace-mapping");

test("ordered and unordered source maps match in both directions", () => {
  let seed = 1807;
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  }
  for (let n = 0; n < 20; n++) {
    const mappings = Array.from({ length: 7 }, () =>
      Array.from({ length: random(30) }, () => {
        const col = random(17);
        return random(5) ? [col, random(2), random(4), random(8), 0] : [col];
      }),
    );
    const raw = {
      version: 3,
      file: "build.js",
      names: ["render"],
      sources: ["search.ts", "sidebar.ts"],
      sourceRoot: "../src",
      sourcesContent: ["a", "b"],
      x_google_ignoreList: [1],
      mappings,
    };
    const before = JSON.stringify(raw),
      url = "https://[::1]:5173/assets/out.map";
    const control = new up.TraceMap(raw, url);
    for (const input of [raw, JSON.stringify(up.encodedMap(control))]) {
      const a = new own.TraceMap(input, url),
        b = new up.TraceMap(input, url);
      assert.deepEqual(own.decodedMap(a), up.decodedMap(b));
      assert.deepEqual(own.encodedMap(a), up.encodedMap(b));
      const first = [],
        second = [];
      own.eachMapping(a, (v) => first.push(v));
      up.eachMapping(b, (v) => second.push(v));
      assert.deepEqual(first, second);
      for (let line = 1; line <= 9; line++)
        for (let column = 0; column < 20; column++)
          for (const bias of [-1, 1]) {
            const pos = { line, column, bias };
            assert.deepEqual(
              own.originalPositionFor(a, pos),
              up.originalPositionFor(b, pos),
            );
            assert.deepEqual(
              own.traceSegment(a, line - 1, column),
              up.traceSegment(b, line - 1, column),
            );
            for (const source of [raw.sources[0], a.resolvedSources[1]]) {
              const query = { ...pos, source };
              assert.deepEqual(
                own.generatedPositionFor(a, query),
                up.generatedPositionFor(b, query),
              );
              assert.deepEqual(
                own.allGeneratedPositionsFor(a, query),
                up.allGeneratedPositionsFor(b, query),
              );
            }
          }
    }
    assert.equal(JSON.stringify(raw), before);
  }
});
test("unmapped positions, large sparse original lines and invalid coordinates", () => {
  const m = new own.TraceMap({
    version: 3,
    names: [],
    sources: ["a"],
    mappings: [[[1, 0, 1000000000, 0], [4]]],
  });
  assert.equal(own.originalPositionFor(m, { line: 1, column: 4 }).source, null);
  assert.deepEqual(
    own.generatedPositionFor(m, { source: "a", line: 1000000001, column: 0 }),
    { line: 1, column: 1 },
  );
  assert.throws(
    () => own.originalPositionFor(m, { line: 0, column: 0 }),
    RangeError,
  );
  assert.throws(
    () => own.originalPositionFor(m, { line: 1, column: NaN }),
    RangeError,
  );
  assert.equal(new own.TraceMap(m), m);
});
