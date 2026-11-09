"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom");
let checks = 0;
const sample = (api, frames, initial, async = false) => {
  let result;
  const value = api.motionValue(initial);
  const r = new api.KeyframeResolver(
    frames,
    (...x) => (result = x),
    "opacity",
    value,
    { readValue: () => 0.4 },
    async,
  );
  r.scheduleResolve();
  if (async) api.flushKeyframeResolvers();
  return result;
};
for (const name of ["motion-dom", "motion-dom-app"]) {
  const api = require("../motion-utils-conformance/node_modules/" + name);
  for (const frames of [
    [null, 1],
    [null, null, 3],
    [1, null, 4],
    [1, 2, 4],
    ["10px", null, "20px"],
  ])
    for (const initial of [undefined, 0, 4])
      for (const async of [false, true]) {
        assert.deepEqual(
          sample(vpm, frames, initial, async),
          sample(api, frames, initial, async),
        );
        checks++;
      }
  for (let i = 0; i < 80; i++) {
    const matrices = [
      `matrix(${1 + i / 10},0,0,${1 + i / 20},${i},${-i})`,
      `matrix3d(${1 + i / 10},0,0,0,0,${1 + i / 20},0,0,0,0,2,0,${i},${-i},${i / 2},1)`,
    ];
    for (const matrix of matrices)
      for (const key of [
        "x",
        "y",
        "scale",
        "scaleX",
        "scaleY",
        ...(name === "motion-dom" ? ["scaleZ"] : []),
        "rotate",
        "rotateZ",
      ]) {
        assert.ok(
          Math.abs(
            vpm.parseValueFromTransform(matrix, key) -
              api.parseValueFromTransform(matrix.replaceAll(",", ", "), key),
          ) < 1e-9,
        );
        checks++;
      }
  }
  for (const key of [
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "x",
    "scale",
    "rotate",
    "marginLeft",
    "paddingInlineStart",
    "borderTopWidth",
    "borderTopLeftRadius",
    "letterSpacing",
    "originX",
  ])
    for (const value of [0, 1, 25]) {
      const a = [value, null, "10px"],
        b = a.slice();
      api.applyPxDefaults(a, key);
      vpm.applyPxDefaults(b, key);
      assert.deepEqual(a, b);
      checks++;
    }
  console.log(
    name +
      ": base resolver, axis-aligned transform reads and pixel defaults pass",
  );
}
const api = require("../motion-utils-conformance/node_modules/motion-dom");
const values = {
  transform: "matrix(2,0,0,3,10,20)",
  width: "20px",
  opacity: ".4",
  "--gap": "4px",
};
const element = {
  ownerDocument: {
    defaultView: {
      getComputedStyle: () => ({
        ...values,
        getPropertyValue: (key) => values[key] ?? "",
      }),
    },
  },
  getAttribute: (key) =>
    ({ "stroke-width": "2", viewBox: "0 0 20 20" })[key] ?? null,
};
const old = global.getComputedStyle;
global.getComputedStyle = element.ownerDocument.defaultView.getComputedStyle;
try {
  for (const key of [
    "x",
    "y",
    "scale",
    "width",
    "opacity",
    "--gap",
    "missing",
  ]) {
    assert.equal(
      vpm.readStyleValue(element, key),
      api.readStyleValue(element, key),
    );
    checks++;
  }
  for (const key of [
    "strokeWidth",
    "viewBox",
    "opacity",
    "x",
    "scale",
    "missing",
  ]) {
    assert.equal(
      vpm.readSVGValue(element, key),
      api.readSVGValue(element, key),
    );
    checks++;
  }
} finally {
  if (old) global.getComputedStyle = old;
  else delete global.getComputedStyle;
}
console.log(
  checks +
    " element read/keyframe comparisons pass; rotation/default-axis differences have separate analytical regressions",
);
