"use strict";
// Run against an unmodified js-tokens v4.0.0 checkout passed as the argument.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const api = require("../../packages/vjs-tokens");
const dir = path.resolve(process.argv[2]);
const entry = path.join(dir, "test/index.js");
const localRequire = createRequire(entry);
let count = 0;
process.chdir(dir);
function controlRequire(name) {
  if (name === "../") return api;
  if (name === "util")
    return {
      ...require("node:util"),
      isRegExp: require("node:util").types.isRegExp,
    };
  return localRequire(name);
}
const failures = [];
require("node:vm").compileFunction(fs.readFileSync(entry, "utf8"), [
  "suite",
  "test",
  "require",
])(
  (_, body) => body(),
  (label, body) => {
    count++;
    try {
      body();
    } catch (e) {
      failures.push([label, e.message]);
    }
  },
  controlRequire,
);
for (const [label, message] of failures)
  console.error(JSON.stringify(label), message.slice(0, 220));
assert.equal(failures.length, 0);
console.log(count, "upstream cases passed.");
