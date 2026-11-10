"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom");
let count = 0;
for (const name of ["motion-dom", "motion-dom-app"]) {
  const api = require("../motion-utils-conformance/node_modules/" + name);
  const values = [
    "blur(0px)",
    "blur(2.5em)",
    "brightness(.5)",
    "brightness(40%)",
    "contrast(0.2)",
    "contrast(80%)",
    "saturate(3)",
    "opacity(25%)",
    "hue-rotate(120deg)",
    "hue-rotate(-.5turn)",
    "invert(.5)",
    "grayscale(30%)",
    "sepia(.8)",
    "blur(3px) brightness(20%) contrast(.8)",
  ];
  for (const text of values) {
    assert.equal(
      vpm.getAnimatableNone("filter", text),
      api.getAnimatableNone("filter", text),
    );
    count++;
    for (const frames of [
      ["none", text],
      [text, "none"],
      [0, text],
      ["0", text],
      ["none", text, "none"],
    ]) {
      // This is a public method operating on the documented protected frame state.
      const a = new api.DOMKeyframesResolver(frames, () => {}, "filter"),
        b = new vpm.DOMKeyframesResolver(frames, () => {}, "filter");
      a.resolveNoneKeyframes();
      b.resolveNoneKeyframes();
      assert.deepEqual(b.unresolvedKeyframes, a.unresolvedKeyframes);
      count++;
    }
  }
  for (const text of [
    "2px 4px #f00",
    "inset 1px 3px 5px rgba(0,0,0,.4)",
    "2px 3px #000, 5px 8px #fff",
  ]) {
    assert.equal(
      vpm.getAnimatableNone("boxShadow", text),
      api.getAnimatableNone("boxShadow", text),
    );
    count++;
  }
}
console.log(
  `${count} neutral filter/shadow and none-keyframe comparisons pass against current/app Motion; CSS correctness differences tested separately.`,
);
