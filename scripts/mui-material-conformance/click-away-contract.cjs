"use strict";
const assert = require("node:assert/strict"),
  base = require("./click-away-build.cjs");
for (const version of ["current", "app"])
  for (const kind of ["search", "sidebar"]) {
    const render = (lib) =>
      require(base + "/" + version + "-" + lib + "/click-away-ssr.cjs").prepare(
        kind,
      )();
    assert.match(render("vpm"), kind === "search" ? /^<section/ : /^<nav/);
    assert.equal(render("vpm"), render("upstream"));
  }
console.log(
  "Search and sidebar render their original semantic roots with both Material controls.",
);
