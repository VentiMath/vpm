"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
require("./subjects-fixture.cjs").globals();
const path = require("node:path"),
  entry = require.resolve(
    "../motion-utils-conformance/node_modules/framer-motion/dom",
  ),
  wrapper = require(entry),
  control = require(
    require.resolve("motion-dom", { paths: [path.dirname(entry)] }),
  ),
  vpm = require("../../packages/vmotion-dom");
const { snapshot } = require("./effect-end-fixture.cjs");
(async () => {
  let count = 0;
  for (const mode of ["direct", "object", "registered"])
    for (const n of [0, 1, 2, 8]) {
      assert.deepEqual(
        await snapshot(vpm, n, mode),
        await snapshot(control, n, mode, wrapper.animate),
        mode + " " + n,
      );
      count++;
    }
  console.log(
    count + " custom/object end-value snapshots match Motion DOM 14.7.0.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
