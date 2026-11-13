"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/mui-engine-conformance"),
  React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server"),
  own = require(fixture + "/prepare.cjs");
const cases = [
  {
    name: "serialize MUI style object",
    make(file) {
      const api = require(file),
        style = {
          color: "#123456",
          padding: 8,
          "&:hover": { opacity: 0.8 },
          "@media(min-width:800px)": { display: "flex" },
        };
      return () => api.internal_serializeStyles(style).styles;
    },
    validate(v) {
      assert.equal(
        v,
        "color:#123456;padding:8px;&:hover{opacity:0.8;}@media(min-width:800px){display:flex;}",
      );
    },
  },
  {
    name: "styled component creation",
    make(file) {
      const api = require(file),
        style = { color: "blue", padding: 4 };
      return () => api.default("button")(style).__emotion_styles.length;
    },
    validate(v) {
      assert.equal(v, 1);
    },
  },
  {
    name: "styled component server render",
    make(file) {
      const api = require(file),
        C = api.default("button")({ color: "blue", padding: 4 });
      return () => renderToString(React.createElement(C, null, "Contest"));
    },
    validate(v) {
      assert.match(v, /color:blue;padding:4px/);
      assert.match(v, />Contest<\/button>/);
    },
  },
  {
    name: "theme global style server render",
    make(file) {
      const api = require(file),
        theme = { color: "blue" },
        style = (t) => ({ body: { color: t.color, margin: 0 } });
      return () =>
        renderToString(
          React.createElement(
            api.ThemeContext.Provider,
            { value: theme },
            React.createElement(api.GlobalStyles, { styles: style }),
          ),
        );
    },
    validate(v) {
      assert.match(v, /body\{color:blue;margin:0;\}/);
    },
  },
];
const dependencies = new Set();
function visit(name) {
  if (dependencies.has(name)) return;
  dependencies.add(name);
  for (const dep of Object.keys(
    require(root + "/../" + name + "/package.json").dependencies || {},
  ))
    visit(dep);
}
visit("vmui-styled-engine");
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: fixture + "/node_modules/@mui/styled-engine/index.js",
    vpm: own,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/mui-engine-conformance/prepare.cjs",
      "../../scripts/mui-engine-conformance/aliases.cjs",
      "../../scripts/mui-engine-conformance/package-lock.json",
      "../../scripts/mui-engine-conformance/node_modules/@mui/styled-engine",
      "../../scripts/mui-engine-conformance/node_modules/@emotion",
      ...[...dependencies]
        .filter((n) => n !== "vmui-styled-engine")
        .flatMap((n) =>
          require(root + "/../" + n + "/package.json")
            .files.filter(
              (file) =>
                !/README|LICENSE/.test(file) &&
                fs.existsSync(root + "/../" + n + "/" + file),
            )
            .map((file) => "../" + n + "/" + file),
        ),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
