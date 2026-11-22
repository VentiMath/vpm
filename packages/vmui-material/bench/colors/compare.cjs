"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const {
  peer,
} = require("../../../../scripts/mui-material-conformance/paths.cjs");
const upstream = peer.resolve("mui-material-app/styles"),
  vpm = path.resolve(root, "../vmui-system/colors.cjs");
const cases = [
  {
    name: "Translucent ink on a paper background",
    make(lib) {
      const { decomposeColor, getContrastRatio } = require(lib);
      return () => {
        const {
          values: [r, g, b, a],
        } = decomposeColor("rgba(35, 64, 80, 0.72)");
        const rgb = [r, g, b].map((channel) => channel * a + 255 * (1 - a));
        return getContrastRatio("rgb(" + rgb.join(",") + ")", "#fff");
      };
    },
    validate(value) {
      assert.ok(value > 4.5);
    },
  },
  {
    name: "Choose a readable role shade",
    make(lib) {
      const { getContrastRatio, darken } = require(lib);
      return () => {
        for (let i = 0; i < 20; i++) {
          const shade = darken("#c19a73", i / 20);
          if (
            getContrastRatio(shade, "#fff") >= 4.5 &&
            getContrastRatio(shade, "#f4f4f4") >= 4.5
          )
            return shade;
        }
      };
    },
    validate(value) {
      assert.equal(value, "rgb(135, 107, 80)");
    },
  },
];
require("../../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm,
    cases,
    files: [
      "styles/index.cjs",
      "../vmui-system/colors.cjs",
      "bench/colors/compare.cjs",
      path.relative(root, upstream),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
