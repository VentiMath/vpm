"use strict";
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const api = require("../../packages/vbabel-code-frame");
const source = fs
  .readFileSync(process.argv[2], "utf8")
  .replace(/^import .*;\n/gm, "")
  .replace("const codeFrame = _codeFrame.default || _codeFrame;", "");
let count = 0;
const failures = [];
require("node:vm").compileFunction(source, [
  "describe",
  "test",
  "expect",
  "codeFrame",
  "codeFrameColumns",
  "highlight",
  "stripAnsi",
])(
  (_, fn) => fn(),
  (name, fn) => {
    count++;
    try {
      fn();
    } catch (e) {
      failures.push([name, e.message]);
    }
  },
  (actual) => ({
    toBeGreaterThan: (expected) => assert.ok(actual > expected),
    toBe: (expected) => assert.equal(actual, expected),
    toEqual: (expected) => assert.deepEqual(actual, expected),
    toMatchInlineSnapshot(expected) {
      const lines = expected.trim().split("\n");
      const margin = Math.min(
        ...lines
          .slice(1)
          .filter((l) => l.trim())
          .map((l) => l.match(/^ */)[0].length),
      );
      const normalized = lines
        .map((l, i) => (i ? l.slice(margin) : l))
        .join("\n")
        .replace(/^"|"$/g, "");
      assert.equal(actual, normalized);
    },
  }),
  api.default,
  api.codeFrameColumns,
  api.highlight,
  require("node:util").stripVTControlCharacters,
);
for (const failure of failures) console.error(...failure);
assert.equal(failures.length, 0);
console.log(count, "Babel upstream code-frame cases passed.");
