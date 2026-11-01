"use strict";
const assert = require("node:assert/strict");
const original = require.resolve("hoist-non-react-statics");
require(original);
if (!process.argv.includes("--upstream"))
  require.cache[
    original
  ].exports = require("../../packages/vhoist-non-react-statics");
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  { withTheme, ThemeProvider } = require("@emotion/react");
const symbol = Symbol("metadata");
function Base({ theme, label }) {
  return React.createElement("span", { "data-color": theme.color }, label);
}
Base.meta = { kind: "fixture" };
Base[symbol] = "symbol";
Object.defineProperty(Base, "constant", { value: 42 });
for (const Component of [
  Base,
  React.memo(Base),
  React.forwardRef((props, ref) =>
    React.createElement(Base, { ...props, ref }),
  ),
]) {
  Component.extra = "static";
  const Wrapper = withTheme(Component);
  assert.equal(Wrapper.extra, "static");
  assert.equal(
    renderToStaticMarkup(
      React.createElement(
        ThemeProvider,
        { theme: { color: "purple" } },
        React.createElement(Wrapper, { label: "hello" }),
      ),
    ),
    '<span data-color="purple">hello</span>',
  );
}
const Wrapped = withTheme(Base);
assert.equal(Wrapped.meta, Base.meta);
assert.equal(Wrapped[symbol], "symbol");
assert.equal(Wrapped.constant, 42);
console.log(
  (process.argv.includes("--upstream") ? "Original" : "VPM") +
    ": Emotion withTheme + React 19 function/memo/forwardRef SSR and static descriptors pass.",
);
