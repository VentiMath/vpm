"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/hoist-conformance");
const cases = [
  {
    name: "function wrapper / four statics",
    make: (directory) => {
      const hoist = require(directory);
      function Source() {}
      Object.assign(Source, { first: 1, second: 2, third: 3, fourth: 4 });
      return () => hoist(function Wrapper() {}, Source).fourth;
    },
    validate: (v) => assert.equal(v, 4),
  },
  {
    name: "memo wrapper / custom symbol and static",
    make: (directory) => {
      const hoist = require(directory),
        key = Symbol("custom"),
        source = {
          $$typeof: Symbol.for("react.memo"),
          type: () => null,
          compare: null,
          meta: 1,
          [key]: 2,
        };
      return () => hoist(function Wrapper() {}, source)[key];
    },
    validate: (v) => assert.equal(v, 2),
  },
  {
    name: "inheritance / eight component levels",
    make: (directory) => {
      const hoist = require(directory);
      let source = Object.create(null);
      for (let i = 0; i < 8; i++)
        source = Object.assign(Object.create(source), { ["level" + i]: i });
      return () => hoist({}, source).level7;
    },
    validate: (v) => assert.equal(v, 7),
  },
  {
    name: "descriptor / getter, symbol and blacklist",
    make: (directory) => {
      const hoist = require(directory),
        key = Symbol("symbol"),
        source = { keep: 1, skip: 2, [key]: 3 };
      Object.defineProperty(source, "computed", {
        get() {
          return this.keep;
        },
        configurable: true,
      });
      const blacklist = { skip: true };
      return () => hoist({}, source, blacklist).computed;
    },
    validate: (v) => assert.equal(v, 1),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/hoist-non-react-statics"),
    vpm: root,
    cases,
    files: [
      "package.json",
      "index.cjs",
      "runtime.mjs",
      "bench/compare.cjs",
      "../../scripts/hoist-conformance/package-lock.json",
      "../../scripts/hoist-conformance/node_modules/hoist-non-react-statics",
      "../../scripts/hoist-conformance/node_modules/react-is",
    ],
    validationOnly: process.argv.includes("--validate"),
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
