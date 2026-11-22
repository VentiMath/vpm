"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/source-map-conformance");
const upstream = path.join(fixture, "node_modules/semver-app");
const cases = [
  {
    name: "Parse release version",
    make: (lib) => {
      const s = require(lib);
      return () => s.parse("24.22.1");
    },
    validate: (r) => assert.equal(r.version, "24.22.1"),
  },
  {
    name: "Repeated Babel range check",
    make: (lib) => {
      const s = require(lib);
      return () => s.satisfies("7.29.0", "^7.0.0-0 || ^8.0.0-0");
    },
    validate: (r) => assert.equal(r, true),
  },
  {
    name: "Repeated Range construction",
    make: (lib) => {
      const s = require(lib);
      return () => new s.Range("^7.0.0-0 || ^8.0.0-0");
    },
    validate: (r) => assert.equal(r.test("7.29.0"), true),
  },
  {
    name: "Uncached distinct ranges",
    make(lib) {
      const s = require(lib);
      let index = 0;
      return () => new s.Range("^7.0." + index++);
    },
    validate: (r) => assert.equal(r.test("7.999999.0"), true),
  },
  {
    name: "Capacitor version difference",
    make: (lib) => {
      const s = require(lib);
      return () => s.diff("8.1.0", "8.2.0");
    },
    validate: (r) => assert.equal(r, "minor"),
  },
  {
    name: "Babel compilation targets",
    make: (lib) => {
      const stage = require(path.join(fixture, "semver-fixture.cjs"))(
        lib,
        "targets-app",
      );
      process.once("exit", stage.close);
      return () =>
        stage.targets(
          { node: "24", chrome: "130", firefox: "132" },
          { ignoreBrowserslistConfig: true },
        );
    },
    validate: (r) => assert.equal(r.node, "24.0.0"),
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
      "versions.cjs",
      "ranges.cjs",
      "bench/compare.cjs",
      "../../scripts/source-map-conformance/semver-fixture.cjs",
      "../../scripts/source-map-conformance/package-lock.json",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
