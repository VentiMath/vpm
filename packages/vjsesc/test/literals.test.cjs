"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const jsesc = require("..");
const control = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
)("jsesc");
const edge =
  "a" +
  String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)) +
  "𝛑星\u2028\u2029\udfff☃\ud8000\u00009";
const inputs = [
  "",
  "About You",
  "Brian’s π is ½",
  edge,
  "'\"\\\x60 \u0024{value} </StYle <!--",
];
test("Babel literal output compares with 3.1.0 including every UTF-16 code unit", () => {
  const planes = Array.from({ length: 256 }, (_, page) =>
    String.fromCharCode(
      ...Array.from({ length: 256 }, (_, i) => page * 256 + i),
    ),
  );
  for (const text of [...inputs, ...planes])
    for (const options of [
      { quotes: "double", wrap: true },
      { quotes: "single", lowercaseHex: true },
      { minimal: true },
      { quotes: "backtick", wrap: true },
      { es6: true },
      { escapeEverything: true },
      { isScriptContext: true },
      { json: true },
    ])
      assert.equal(jsesc(text, options), control(text, options));
});
test("JSON mode produces parseable strings for combined options", () => {
  for (const text of inputs)
    for (const flags of [
      { minimal: true },
      { escapeEverything: true },
      { es6: true },
      { quotes: "backtick" },
      { minimal: true, isScriptContext: true },
    ])
      assert.equal(JSON.parse(jsesc(text, { ...flags, json: true })), text);
});
test("radix options preserve numeric meaning for signed integers and fractions", () => {
  for (const radix of ["decimal", "binary", "octal", "hexadecimal"])
    for (const value of [0, 1, 31, 255, -255, 0.5, Infinity, NaN]) {
      const result = jsesc(value, { numbers: radix });
      const parsed = result.startsWith("-")
        ? -Number(result.slice(1))
        : Number(result);
      assert.ok(Object.is(value, parsed));
      if (value >= 0 && Number.isInteger(value))
        assert.equal(result, control(value, { numbers: radix }));
    }
  assert.equal(jsesc(Infinity, { json: true }), "null");
  assert.throws(() => jsesc([]), TypeError);
});
