"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/rtl-conformance"),
  upstream = path.join(fixture, "node_modules/stylis-plugin-rtl");
const cases = [];
for (const [name, css, options] of [
  ["short rule", ".x{margin-left:12px;padding:1px 2px 3px 4px}", {}],
  ["unchanged rule", ".x{display:flex;color:red;align-items:center}", {}],
  [
    "nested component",
    ".x{padding-left:3px; & .item{margin-right:8px;&:hover{left:2px}}}",
    {},
  ],
  [
    "actual app layer pipeline",
    ".card{margin:1px 2px 3px 4px;padding-left:12px;border-radius:1px 2px 3px 4px;text-align:left;box-shadow:2px 3px 4px red}.avatar{background-position:20% 40%;transform:translateX(3px)}",
    { layer: true },
  ],
  [
    "varied stylesheet",
    Array.from(
      { length: 30 },
      (_, i) =>
        ".c" +
        i +
        "{margin-left:" +
        i +
        "px;padding:1px 2px 3px 4px;box-shadow:2px 3px red}",
    ).join(""),
    {},
  ],
])
  cases.push({
    name,
    make(file) {
      const engine = require(path.join(fixture, "node_modules/stylis")),
        pipeline = require(path.join(fixture, "pipeline.cjs")),
        plugin = require(file).default || require(file);
      return () => pipeline(engine, plugin, css, options);
    },
    validate(s) {
      const engine = require(path.join(fixture, "node_modules/stylis"));
      assert.equal(
        s,
        require(path.join(fixture, "pipeline.cjs"))(
          engine,
          require(upstream).default,
          css,
          options,
        ),
      );
    },
  });
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "package.json",
      "PROVENANCE.json",
      "index.cjs",
      "index.mjs",
      "index.d.cts",
      "index.d.mts",
      "bench/compare.cjs",
      "../vcssjanus/index.cjs",
      "../../scripts/rtl-conformance/pipeline.cjs",
      "../../scripts/rtl-conformance/package-lock.json",
      "../../scripts/rtl-conformance/node_modules/stylis-plugin-rtl",
      "../../scripts/rtl-conformance/node_modules/cssjanus",
      "../../scripts/rtl-conformance/node_modules/stylis",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
