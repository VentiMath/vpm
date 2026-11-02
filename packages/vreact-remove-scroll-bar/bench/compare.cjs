"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    root,
    "../../scripts/sidecar-conformance/node_modules",
  );
for (const pkg of ["vreact-remove-scroll-bar", "vreact-style-singleton"]) {
  const modules = path.resolve(root, "..", pkg, "node_modules");
  fs.mkdirSync(modules, { recursive: true });
  for (const [name, target] of [
    ["react", path.join(fixture, "react")],
    ["vreact-style-singleton", path.resolve(root, "../vreact-style-singleton")],
    ["vget-nonce", path.resolve(root, "../vget-nonce")],
  ])
    if (!fs.existsSync(path.join(modules, name)))
      fs.symlinkSync(target, path.join(modules, name), "dir");
}
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "react-remove-scroll-bar"),
    vpm: root,
    files: [
      "package.json",
      "index.cjs",
      "constants.cjs",
      "../vreact-style-singleton/index.cjs",
      "../vget-nonce/index.cjs",
      "bench/compare.cjs",
      "../../scripts/sidecar-conformance/package-lock.json",
      "../../scripts/sidecar-conformance/node_modules/react-remove-scroll-bar",
    ],
    cases: [
      {
        name: "gap calculation (fixed layout input)",
        make: (file) => {
          const api = require(file);
          globalThis.window = {
            innerWidth: 1000,
            getComputedStyle: () => ({
              marginLeft: "4px",
              marginRight: "7px",
              marginTop: "3px",
            }),
          };
          globalThis.document = {
            body: {},
            documentElement: { clientWidth: 980 },
          };
          return () => api.getGapWidth();
        },
        validate: (x) =>
          assert.deepEqual(x, { left: 4, right: 7, top: 3, gap: 23 }),
      },
      {
        name: "React server render",
        make: (file) => {
          delete globalThis.window;
          delete globalThis.document;
          const { RemoveScrollBar } = require(file),
            React = require(path.join(fixture, "react")),
            { renderToString } = require(
              path.join(fixture, "react-dom/server"),
            );
          return () => renderToString(React.createElement(RemoveScrollBar));
        },
        validate: (x) => assert.equal(x, ""),
      },
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
