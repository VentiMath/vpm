"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
    __dirname,
    "../../../scripts/mui-engine-conformance",
  ),
  React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server"),
  api = require(require(fixture + "/prepare.cjs"));
test("default provider is transparent and cache modes fail explicitly", () => {
  assert.equal(
    renderToString(
      React.createElement(
        api.StyledEngineProvider,
        null,
        React.createElement("p", null, "Math"),
      ),
    ),
    "<p>Math</p>",
  );
  for (const option of ["injectFirst", "enableCssLayer"])
    assert.throws(
      () =>
        renderToString(
          React.createElement(api.StyledEngineProvider, { [option]: true }),
        ),
      /cache and CSS layers/,
    );
});
test("style serialization is reentrant and retains frozen input", () => {
  const inner = Object.freeze({ color: "blue" }),
    outer = {
      get color() {
        assert.equal(api.internal_serializeStyles(inner).styles, "color:blue;");
        return "red";
      },
      padding: 2,
    };
  assert.equal(
    api.internal_serializeStyles(outer).styles,
    "color:red;padding:2px;",
  );
});
test("mutation hook changes derived style list without altering original list", () => {
  const original = Object.freeze([{ color: "red" }, { margin: 2 }]),
    tag = { __emotion_styles: original };
  api.internal_mutateStyles(tag, (s) => s.slice(0, 1));
  assert.equal(tag.__emotion_styles.length, 1);
  assert.equal(original.length, 2);
  assert.throws(() => api.internal_mutateStyles(tag, () => null), /array/);
  api.internal_mutateStyles("div", () => {
    throw Error("not called");
  });
});
test("styled filters transient props and supports element substitution", () => {
  const C = api.default("button", {
    shouldForwardProp: (p) => p !== "ownerState" && p !== "as",
  })({ color: "blue" });
  const html = renderToString(
    React.createElement(
      C,
      { as: "a", href: "/contest", ownerState: {}, "data-id": "x" },
      "Go",
    ),
  );
  assert.match(html, /<a href="\/contest" data-id="x"/);
  assert.doesNotMatch(html, /ownerState/);
});
test("GlobalStyles uses the fallback only without a populated theme", () => {
  const style = (t) => ({ body: { color: t.color } }),
    fallback = { color: "red" };
  const html = renderToString(
    React.createElement(
      api.ThemeContext.Provider,
      { value: { color: "blue" } },
      React.createElement(api.GlobalStyles, {
        styles: style,
        defaultTheme: fallback,
      }),
    ),
  );
  assert.match(html, /color:blue/);
  assert.doesNotMatch(html, /color:red/);
});
