"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/source-map-conformance");
const upstream = path.join(
  fixture,
  "node_modules/@babel/helper-validator-option",
);
const candidates = [
  "android",
  "chrome",
  "deno",
  "edge",
  "electron",
  "firefox",
  "ie",
  "ios",
  "node",
  "opera",
  "opera_mobile",
  "rhino",
  "safari",
  "samsung",
];
const cases = [
  {
    name: "Validate known build options",
    make(lib) {
      const v = new (require(lib).OptionValidator)("build"),
        shape = { targets: 1, debug: 1, modules: 1 },
        options = { targets: "node 24", modules: "auto", debug: false };
      return () => {
        v.validateTopLevelOptions(options, shape);
        return v.validateBooleanOption("debug", options.debug, true);
      };
    },
    validate: (r) => assert.equal(r, false),
  },
  {
    name: "Suggest a mistyped browser target",
    make(lib) {
      const { findSuggestion } = require(lib);
      return () => findSuggestion("chorme", candidates);
    },
    validate: (r) => assert.equal(r, "chrome"),
  },
  {
    name: "Compilation-targets diagnostic",
    make(lib) {
      const stage = require(path.join(fixture, "option-fixture.cjs"))(
        lib,
        "targets-app",
      );
      process.once("exit", stage.close);
      return () => {
        try {
          stage.targets({ chorme: "130" }, { ignoreBrowserslistConfig: true });
        } catch (e) {
          return e.message;
        }
      };
    },
    validate: (r) => assert.ok(r.includes("Did you mean 'chrome'")),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "bench/compare.cjs",
      "../../scripts/source-map-conformance/option-fixture.cjs",
      "../../scripts/source-map-conformance/package-lock.json",
      path.relative(root, path.join(upstream, "lib/validator.js")),
      path.relative(root, path.join(upstream, "lib/find-suggestion.js")),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
