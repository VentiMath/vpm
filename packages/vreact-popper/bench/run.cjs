"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/react-popper-conformance"),
  vpm = require(fixture + "/prepare.cjs"),
  React = require(fixture + "/node_modules/react"),
  { renderToString } = require(fixture + "/node_modules/react-dom/server");
const cases = [false, true].map((open) => ({
  name: open ? "navigation menu SSR" : "closed navigation SSR",
  make(file) {
    const api = require(file),
      tree = React.createElement(
        api.Manager,
        null,
        React.createElement(api.Reference, {
          children: ({ ref }) =>
            React.createElement("button", { ref }, "Contest"),
        }),
        React.createElement(api.Popper, {
          placement: "bottom-start",
          children: ({ ref, style }) =>
            open ? React.createElement("div", { ref, style }, "Menu") : null,
        }),
      );
    return () => renderToString(tree);
  },
  validate(value) {
    assert.equal(
      value,
      "<button>Contest</button>" +
        (open ? '<div style="position:absolute;left:0;top:0">Menu</div>' : ""),
    );
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(fixture + "/node_modules/react-popper"),
    vpm,
    cases,
    files: [
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/react-popper-conformance/prepare.cjs",
      "../../scripts/react-popper-conformance/package-lock.json",
      "../../scripts/react-popper-conformance/node_modules/react-popper",
      "../../scripts/react-popper-conformance/node_modules/@popperjs/core",
      "../../scripts/react-popper-conformance/node_modules/react",
      "../../scripts/react-popper-conformance/node_modules/react-dom",
      "../vfloating-ui-dom/runtime.mjs",
      "../vfloating-ui-dom/geometry.mjs",
      "../vfloating-ui-dom/updates.mjs",
      "../vfloating-ui-core/engine.mjs",
      "../vfloating-ui-core/motion.mjs",
      "../vfloating-ui-core/selection.mjs",
      "../vfloating-ui-core/visibility.mjs",
      "../vfloating-ui-utils/runtime.mjs",
      "../vfloating-ui-utils/dom.mjs",
      "../vreact-fast-compare/runtime.mjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
