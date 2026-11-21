"use strict";
const assert = require("node:assert/strict"),
  dir = require("./grow-build.cjs");
for (const version of ["current", "app"]) {
  const api = (lib) =>
      require(dir + "/" + version + "-" + lib + "/grow-ssr.cjs"),
    own = api("vpm"),
    control = api("upstream");
  assert.equal(own.supportsAuto, true);
  for (const open of [false, true])
    for (const appear of [false, true])
      for (const options of [
        {},
        { mountOnEnter: true },
        { unmountOnExit: true },
        {
          timeout: 125,
          style: { opacity: 0.3, color: "red", transformOrigin: "right top" },
        },
      ]) {
        const props = { in: open, appear, ...options };
        assert.equal(
          own.render(props),
          control.render(props),
          JSON.stringify(props),
        );
      }
}
console.log("32 Grow SSR comparisons matched both Material versions.");
