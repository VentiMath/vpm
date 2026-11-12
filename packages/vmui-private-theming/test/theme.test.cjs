"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
    __dirname,
    "../../../scripts/mui-theming-conformance",
  ),
  React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server"),
  api = require(require(fixture + "/prepare.cjs"));
function read(themes) {
  let result;
  function Consumer() {
    result = api.useTheme();
    return null;
  }
  let tree = React.createElement(Consumer);
  for (const theme of themes.toReversed())
    tree = React.createElement(api.ThemeProvider, { theme }, tree);
  renderToString(tree);
  return result;
}
test("outside a provider returns null", () => assert.equal(read([]), null));
test("nested object themes shallowly merge and mark their context without mutating inputs", () => {
  const outer = Object.freeze({ color: "blue", nested: { a: 1 } }),
    inner = Object.freeze({ nested: { b: 2 } });
  const result = read([outer, inner]);
  assert.equal(result.color, "blue");
  assert.equal(result.nested, inner.nested);
  assert.equal(result[Symbol.for("mui.nested")], true);
  assert.equal(Object.getOwnPropertySymbols(outer).length, 0);
  assert.equal(Object.getOwnPropertySymbols(inner).length, 0);
});
test("functional themes replace instead of merging outer properties", () => {
  let received;
  const result = read([
    { a: 1 },
    (outer) => {
      received = outer;
      return { b: 2 };
    },
  ]);
  assert.equal(received.a, 1);
  assert.equal(result.a, undefined);
  assert.equal(result.b, 2);
});
test("own prototype-looking properties remain data", () => {
  const input = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":"data"}',
    ),
    result = read([input]);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(result.__proto__.polluted, true);
  assert.equal({}.polluted, undefined);
  assert.equal(result.constructor, "data");
});
test("invalid theme results fail explicitly", () => {
  for (const theme of [null, undefined, 2, [], () => null])
    assert.throws(() => read([theme]), /theme object/);
});
