"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/mui-theming-conformance"),
  React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server"),
  own = require(fixture + "/prepare.cjs");
const cases = [1, 3].map((depth) => ({
  name:
    depth === 1
      ? "single theme provider SSR"
      : "three nested providers and theme consumer",
  make(file) {
    const api = require(file);
    function View() {
      const t = api.useTheme();
      return React.createElement("span", null, t.color, ":", t.spacing);
    }
    const themes = Array.from({ length: depth }, (_, n) => ({
      color: "blue",
      spacing: n,
    }));
    return () => {
      let node = React.createElement(View);
      for (const theme of themes.toReversed())
        node = React.createElement(api.ThemeProvider, { theme }, node);
      return renderToString(node);
    };
  },
  validate(v) {
    assert.equal(v, "<span>blue<!-- -->:<!-- -->" + (depth - 1) + "</span>");
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: fixture + "/node_modules/@mui/private-theming/index.js",
    vpm: own,
    cases,
    files: [
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/mui-theming-conformance/prepare.cjs",
      "../../scripts/mui-theming-conformance/package-lock.json",
      "../../scripts/mui-theming-conformance/node_modules/@mui/private-theming",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
