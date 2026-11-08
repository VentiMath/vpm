"use strict";
const assert = require("node:assert/strict"),
  a = require("table-app"),
  v = require(
    process.env.VPM_TABLE_ENTRY || "../../packages/vtanstack-table-core",
  );
const values = [
  "",
  "A",
  "a",
  "a2",
  "a10",
  "2",
  "10",
  "abc 1",
  "abc 01",
  "01a",
  "1b",
  null,
  undefined,
  1,
  2,
  false,
  true,
  Infinity,
  NaN,
  new Date(0),
  new Date(1),
];
let count = 0;
for (const name of Object.keys(a.sortingFns))
  for (const x of values)
    for (const y of values) {
      const ar = { getValue: () => x },
        br = { getValue: () => y };
      assert.equal(
        Math.sign(v.sortingFns[name](ar, br, "x")),
        Math.sign(a.sortingFns[name](ar, br, "x")),
        name + " " + String(x) + " " + String(y),
      );
      count++;
    }
console.log(count + " sorting-function comparisons match the app control.");
