"use strict";
const assert = require("node:assert/strict"),
  base = require("./build.cjs");
let n = 0;
for (const version of ["current", "app"]) {
  const control = require(base + "/" + version + "-upstream/caller.cjs"),
    own = require(base + "/" + version + "-vpm/caller.cjs");
  for (const nested of [false, true])
    for (const compact of [false, true])
      for (const color of ["#123456", "#abcdef", "#eeddcc"]) {
        assert.equal(
          own.run(color, nested, compact),
          control.run(color, nested, compact),
          version + " " + color,
        );
        n++;
      }
}
console.log(
  n +
    " unchanged current/app MUI System styled, inheritance, variants, sx and global CSS snapshots match",
);
