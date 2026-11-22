"use strict";
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  api = require("../../packages/vbabel-helper-validator-option");
let count = 0;
function test(name, fn) {
  count++;
  fn();
}
test.each = (cases) => (name, fn) =>
  cases.forEach((args) => test(name, () => fn(...args)));
for (const file of process.argv.slice(2)) {
  const source = fs.readFileSync(file, "utf8").replace(/^import .*;\n/gm, "");
  require("node:vm").compileFunction(source, [
    "describe",
    "test",
    "it",
    "beforeAll",
    "expect",
    "OptionValidator",
    "findSuggestion",
  ])(
    (_, fn) => fn(),
    test,
    test,
    (fn) => fn(),
    (actual) => ({
      toBe: (expected) => assert.equal(actual, expected),
      toThrow: () => assert.throws(actual),
    }),
    api.OptionValidator,
    api.findSuggestion,
  );
}
assert.ok(count > 0);
console.log(count, "upstream option-validator cases passed.");
