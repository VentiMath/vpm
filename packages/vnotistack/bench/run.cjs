"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/notistack-conformance");
if (!process.env.VPM_BENCH_WORKER)
  require("node:child_process").execFileSync(
    "bun",
    [path.join(fixture, "build.cjs")],
    { stdio: "inherit" },
  );
const cases = [
  {
    name: "empty app provider SSR",
    make(file) {
      const { api, React, renderToStaticMarkup: render } = require(file);
      const child = React.createElement("button", null, "Notify");
      return () =>
        render(
          React.createElement(
            api.SnackbarProvider,
            {
              maxSnack: 5,
              anchorOrigin: { vertical: "bottom", horizontal: "right" },
            },
            child,
          ),
        );
    },
    validate: (x) => assert.equal(x, "<button>Notify</button>"),
  },
  {
    name: "success notification SSR",
    make(file) {
      const { api, React, renderToStaticMarkup: render } = require(file);
      const props = {
        id: "save",
        variant: "success",
        message: "User settings saved.",
        iconVariant: {},
        hideIconVariant: true,
      };
      return () =>
        render(React.createElement(api.MaterialDesignContent, props));
    },
    validate: (x) => {
      assert.ok(x.includes("User settings saved."));
      assert.ok(x.includes('role="alert"'));
    },
  },
  {
    name: "notification with action SSR",
    make(file) {
      const { api, React, renderToStaticMarkup: render } = require(file);
      const props = {
        id: "retry",
        variant: "error",
        message: "Saving failed.",
        iconVariant: {},
        hideIconVariant: true,
        action: (key) => React.createElement("button", null, "Retry " + key),
      };
      return () =>
        render(React.createElement(api.MaterialDesignContent, props));
    },
    validate: (x) => assert.ok(x.includes("Retry retry")),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(
      fixture,
      "node_modules/.vpm-notistack/upstream/api.cjs",
    ),
    vpm: path.join(fixture, "node_modules/.vpm-notistack/vpm/api.cjs"),
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "queue.cjs",
      "styles.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../vgoober",
      "../vclsx/index.cjs",
      "../vclsx/runtime.mjs",
      "../vreact-transition-group/index.cjs",
      "../../scripts/notistack-conformance/build.cjs",
      "../../scripts/notistack-conformance/entry.mjs",
      "../../scripts/notistack-conformance/package-lock.json",
      "../../scripts/notistack-conformance/node_modules/notistack",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
