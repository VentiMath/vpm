"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom/index.cjs");
let checks = 0;
function element() {
  return {
    nodeType: 1,
    style: {
      opacity: "",
      width: "",
      height: "",
      fill: "",
      stroke: "",
      strokeWidth: "",
      setProperty(k, v) {
        this[k] = String(v);
      },
    },
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
  };
}
function snapshot(e) {
  return {
    style: Object.fromEntries(
      Object.entries(e.style).filter(([, v]) => typeof v !== "function"),
    ),
    attrs: e.attrs,
    prop: e.prop,
  };
}
function trace(api, type, keys, initial, next) {
  const e = element(),
    values = Object.fromEntries(keys.map((k) => [k, api.motionValue(initial)]));
  const off = api[type](type === "propEffect" ? e : [e], values),
    rows = [];
  for (let i = 0; i < 12; i++) {
    for (const v of Object.values(values)) v.set(next(i));
    api.frameSteps.render.process({
      timestamp: 100 + i * 16,
      delta: 16,
      isProcessing: true,
    });
    rows.push(JSON.parse(JSON.stringify(snapshot(e))));
  }
  off();
  for (const v of Object.values(values)) v.set(999);
  api.frameSteps.render.process({
    timestamp: 400,
    delta: 16,
    isProcessing: true,
  });
  rows.push(snapshot(e));
  return rows;
}
for (const controlName of ["motion-dom", "motion-dom-app"]) {
  const upstream = require(
    "../motion-utils-conformance/node_modules/" + controlName,
  );
  const cases = [
    ["propEffect", ["prop"], 0, (i) => i / 10],
    ...[
      "opacity",
      "width",
      "height",
      "zIndex",
      "borderTopWidth",
      "marginInline",
      "paddingBlockStart",
      "--size",
      "originX",
      "originZ",
    ].map((k) => ["styleEffect", [k], 0, (i) => i / 5]),
    ...[
      "x",
      "y",
      "z",
      "scale",
      "scaleX",
      "rotate",
      "rotateX",
      "skew",
      "transformPerspective",
    ].map((k) => ["styleEffect", [k], 0, (i) => i * 7]),
    ["styleEffect", ["x", "rotate", "scale", "originY"], 0, (i) => i / 5],
    ...[
      "viewBox",
      "dataValue",
      "ariaLabel",
      "strokeWidth",
      "x",
      "disabled",
    ].map((k) => ["attrEffect", [k], "", (i) => "value " + i]),
    ...[
      "cx",
      "fill",
      "strokeWidth",
      "attrWidth",
      "viewBox",
      "pathLength",
      "pathSpacing",
      "pathOffset",
    ].map((k) => ["svgEffect", [k], 0, (i) => i / 20]),
    ["svgEffect", ["pathLength", "pathOffset"], 0, (i) => i / 20],
    [
      "svgEffect",
      ["pathLength", "pathSpacing", "pathOffset"],
      0,
      (i) => i / 20,
    ],
  ];
  for (const key of [
    "x",
    "y",
    "scale",
    "rotate",
    "originX",
    "width",
    "filter",
    "backgroundColor",
    "transform",
  ]) {
    const values =
      key === "backgroundColor"
        ? ["red", "#fff", "rgb(1, 2, 3)"]
        : key === "filter"
          ? ["none", "blur(2px)"]
          : key === "transform"
            ? ["none", "translateX(10px)"]
            : key === "scale"
              ? ["1", "2", "0"]
              : key === "rotate"
                ? ["0deg", "90deg"]
                : ["0px", "5px", "10%"];
    cases.push([
      "styleEffect",
      [key],
      values[0],
      (i) => values[i % values.length],
    ]);
  }
  if (controlName === "motion-dom")
    cases.push(["svgEffect", ["x", "scale", "originX"], 0, (i) => i / 20]);
  for (const [type, keys, initial, next] of cases) {
    const a = trace(upstream, type, keys, initial, next),
      b = trace(vpm, type, keys, initial, next);
    for (let i = 0; i < a.length; i++) {
      assert.deepEqual(b[i], a[i], `${controlName} ${type} ${keys} frame ${i}`);
      checks++;
    }
  }
  // Current state ownership and manual-flush contracts.
  if (controlName === "motion-dom")
    for (const api of [upstream, vpm]) {
      const e = element(),
        a = api.motionValue(0.2),
        b = api.motionValue(0.3),
        old = api.styleEffect([e], { opacity: a }),
        off = api.styleEffect([e], { opacity: b });
      old();
      b.set(0.7);
      api.styleEffect.flush(e);
      assert.equal(e.style.opacity, 0.7);
      assert.equal(api.styleEffect.get(e, "opacity"), b);
      const values = api.releaseElement(e);
      assert.equal(values.get("opacity"), b);
      off();
      checks += 3;
    }
  console.log(
    controlName +
      ": style, attributes, object properties, SVG paths and cleanup match",
  );
}
console.log(checks + " DOM effect comparisons pass");
