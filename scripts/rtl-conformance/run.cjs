"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
const replacement = require(
  process.env.VPM_RTL_ENTRY || "../../packages/vstylis-plugin-rtl",
);
for (const [file, hash] of Object.entries(require("./upstream/hashes.json")))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex"),
    hash,
  );
const suite = new Function(
  "compile",
  "middleware",
  "prefixer",
  "serialize",
  "stringify",
  "stylisRtlPlugin",
  "describe",
  "it",
  "expect",
  fs.readFileSync(
    path.join(__dirname, "node_modules/.vpm-rtl/tests.cjs"),
    "utf8",
  ),
);
let count = 0;
for (const engine of [require("stylis"), require("../../packages/vstylis")])
  for (const plugin of [require("stylis-plugin-rtl").default, replacement]) {
    suite(
      engine.compile,
      engine.middleware,
      engine.prefixer,
      engine.serialize,
      engine.stringify,
      plugin,
      (_n, fn) => fn(),
      (_n, fn) => {
        fn();
        count++;
      },
      (value) => ({
        toMatchInlineSnapshot: (s) => assert.equal(value, JSON.parse(s)),
      }),
    );
  }
console.log(
  count +
    " unchanged upstream cases across original/VPM middleware and upstream/VPM Stylis pass.",
);
const pipeline = require("./pipeline.cjs"),
  load = require("./load.cjs");
let seed = 64127;
const random = (n) =>
  ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) >>> 8) % n;
const declarations = [
  "margin-left:12px",
  "right:auto",
  "padding:1px 2px 3px 4px",
  "border-radius:1px 2px 3px 4px",
  "background-position:20% 40%",
  "transform:translateX(10px)",
  "box-shadow:2px 3px red",
  "text-align:left",
  "/*! @noflip */padding-left:8px",
];
let checks = 0;
for (const engine of [require("stylis"), require("../../packages/vstylis")]) {
  const controls = [
    load(engine, require("cssjanus")),
    load(engine, require("cssjanus-app")),
  ];
  for (let i = 0; i < 1200; i++) {
    const css =
        ".left{" +
        Array.from(
          { length: 1 + random(8) },
          () => declarations[random(declarations.length)],
        ).join(";") +
        "; & .nested{margin-left:3px}}",
      options = { rtl: i % 3 !== 0, layer: i % 2 === 0, prefix: i % 4 === 0 };
    for (const control of controls) {
      let expected = pipeline(engine, control, css, options);
      // The unchanged wrapper misses lifted nested rules after the app layer
      // middleware changes their parent's type. Only this exact fixture is corrected.
      if (options.layer && options.rtl) {
        assert.match(expected, /\.left \.nested\{margin-left:3px;\}/);
        expected = expected.replace(
          ".left .nested{margin-left:3px;}",
          ".left .nested{margin-right:3px;}",
        );
      }
      assert.equal(pipeline(engine, replacement, css, options), expected);
      checks++;
    }
  }
}
console.log(
  checks +
    " seeded current/app RTL pipeline comparisons pass; 1600 layer+nested cases explicitly assert the corrected missed flip.",
);
