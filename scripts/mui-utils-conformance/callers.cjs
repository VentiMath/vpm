"use strict";
const assert = require("node:assert/strict"),
  base = require("./build.cjs");
let count = 0;
for (const version of ["current", "app"])
  for (const color of ["#123456", "#abcdef"])
    for (const compact of [false, true]) {
      const a = require(base + "/" + version + "-vpm/caller.cjs").run(
          color,
          compact,
        ),
        b = require(base + "/" + version + "-upstream/caller.cjs").run(
          color,
          compact,
        );
      assert.equal(a, b, version + " " + color);
      count++;
    }
console.log(
  count + " unchanged MUI Material form/menu/tab/dialog SSR snapshots match",
);
