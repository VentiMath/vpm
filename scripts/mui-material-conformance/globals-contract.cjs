"use strict";
const assert = require("node:assert/strict");
const base = require("./globals-build.cjs");
function css(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .join("");
}
for (const version of ["app", "current"]) {
  const api = (library) =>
    require(base + "/" + version + "-" + library + "/globals-ssr.cjs");
  const control = api("upstream"),
    own = api("vpm");
  for (const [kind, expected] of [
    ["navigation", "min-height:32px"],
    ["page", "rgb(12, 34, 56)"],
    ["frameSheets", "--preview-size:19px"],
  ]) {
    const actual = css(own.prepare(kind)());
    assert.ok(actual.includes(expected), actual);
    assert.equal(actual, css(control.prepare(kind)()), kind);
  }
}
console.log(
  "GlobalStyles SSR matches both Material versions for scoped themes, generated sheets and nested rules.",
);
