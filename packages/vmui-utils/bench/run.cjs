"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/mui-utils-conformance"),
  React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server"),
  own = require(fixture + "/prepare.cjs");
const cases = [
  {
    name: "merge theme defaults",
    make(file) {
      const api = require(file),
        target = {
          palette: { primary: { main: "blue", contrast: "white" } },
          spacing: 8,
          breakpoints: { sm: 600, md: 900 },
        },
        source = {
          palette: { primary: { main: "red" } },
          breakpoints: { lg: 1200 },
        };
      return () => api.deepmerge(target, source);
    },
    validate(v) {
      assert.equal(v.palette.primary.main, "red");
      assert.equal(v.breakpoints.sm, 600);
    },
  },
  {
    name: "assign responsive style objects",
    make(file) {
      const api = require(file),
        source = {
          "@media(min-width:600px)": { padding: 8, color: "red" },
          "@media(min-width:900px)": { padding: 16 },
        };
      return () => api.unstable_fastDeepAssign({}, source);
    },
    validate(v) {
      assert.equal(v["@media(min-width:900px)"].padding, 16);
    },
  },
  {
    name: "compose component classes",
    make(file) {
      const api = require(file),
        slots = { root: ["root", "disabled", "outlined"], label: ["label"] },
        get = (s) => "MuiButton-" + s,
        classes = { root: "contest" };
      return () => api.unstable_composeClasses(slots, get, classes).root;
    },
    validate(v) {
      assert.equal(
        v,
        "MuiButton-root contest MuiButton-disabled MuiButton-outlined",
      );
    },
  },
  {
    name: "controlled state and stable callback SSR",
    make(file) {
      const api = require(file);
      function View() {
        const [value] = api.unstable_useControlled({
          controlled: undefined,
          default: "Contest",
          name: "View",
        });
        const callback = api.unstable_useEventCallback(() => value);
        return React.createElement("p", null, callback());
      }
      return () => renderToString(React.createElement(View));
    },
    validate(v) {
      assert.equal(v, "<p>Contest</p>");
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: fixture + "/node_modules/@mui/utils/index.js",
    vpm: own,
    cases,
    files: [
      "src",
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/mui-utils-conformance/prepare.cjs",
      "../../scripts/mui-utils-conformance/internals-entry.cjs",
      "../../scripts/mui-utils-conformance/package-lock.json",
      "../../scripts/mui-utils-conformance/node_modules/@mui/utils",
      "../vclsx/index.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
