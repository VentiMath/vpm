"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const own = require(".."),
  upstream = require(
    path.resolve(
      __dirname,
      "../../../scripts/source-map-conformance/node_modules/@babel/helper-validator-option",
    ),
  );
function result(fn) {
  try {
    return { value: fn() };
  } catch (e) {
    return { name: e.name, message: e.message };
  }
}
test("validator outputs, defaults, messages and enumerable option names match Babel", () => {
  const a = new own.OptionValidator("app"),
    b = new upstream.OptionValidator("app");
  const values = [
    undefined,
    null,
    false,
    true,
    0,
    1,
    NaN,
    "",
    "chrome",
    [],
    {},
    new Boolean(true),
    Symbol("key"),
    1n,
  ];
  for (const method of ["validateBooleanOption", "validateStringOption"])
    for (const value of values)
      for (const fallback of [undefined, false, "default", null]) {
        assert.deepEqual(
          result(() => a[method]("targets", value, fallback)),
          result(() => b[method]("targets", value, fallback)),
        );
      }
  const shapes = [
    { node: 1, browsers: 1 },
    Object.create({ node: true }),
    Object.defineProperty({ browsers: true }, "node", { value: true }),
    JSON.parse('{"__proto__":1}'),
  ];
  for (const shape of shapes)
    for (const options of [
      { node: "24" },
      { browsers: [] },
      { browsrs: [] },
      {},
      JSON.parse('{"__proto__":1}'),
      { constructor: true },
      Object.create({ browsrs: 1 }),
    ])
      assert.deepEqual(
        result(() => a.validateTopLevelOptions(options, shape)),
        result(() => b.validateTopLevelOptions(options, shape)),
      );
  for (const value of values)
    assert.deepEqual(
      result(() => a.invariant(value, "message")),
      result(() => b.invariant(value, "message")),
    );
  a.descriptor = "changed";
  assert.equal(a.formatMessage("error"), "changed: error");
});
test("spelling suggestions preserve first ties and UTF-16 distance", () => {
  const alphabet = ["", "a", "b", "c", "é", "😀"];
  const names = [
    ...alphabet,
    ...alphabet.flatMap((a) => alphabet.map((b) => a + b)),
  ];
  for (const input of names)
    for (let i = 0; i < names.length; i++) {
      const candidates = [
        names[i],
        names[(i + 3) % names.length],
        names[(i + 9) % names.length],
      ];
      assert.equal(
        own.findSuggestion(input, candidates),
        upstream.findSuggestion(input, candidates),
      );
    }
  assert.equal(own.findSuggestion("missing", []), undefined);
  assert.equal(own.findSuggestion("node", ["node", "node"]), "node");
  // Avoid spreading a large option list into a variadic Math.min call.
  assert.equal(
    own.findSuggestion("target", Array(150000).fill("targat")),
    "targat",
  );
});
test("ES modules expose the same class and helper", async () => {
  const esm = await import("../index.mjs");
  assert.equal(esm.OptionValidator, own.OptionValidator);
  assert.equal(esm.findSuggestion, own.findSuggestion);
});
