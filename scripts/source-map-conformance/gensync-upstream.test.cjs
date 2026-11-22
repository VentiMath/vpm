"use strict";
// The published suite uses Jest globals and the pre-Node-8 util.promisify alias.
const { describe, test, expect } = require("bun:test"),
  fs = require("node:fs"),
  { compileFunction } = require("node:vm");
const path = require.resolve("gensync/test/index.test.js");
const run = compileFunction(
  fs.readFileSync(path, "utf8"),
  ["require", "describe", "test", "expect"],
  { filename: path },
);
run(
  (name) => {
    if (name === "../") return require("../../packages/vgensync");
    if (name === "util.promisify") return require("node:util").promisify;
    return require(name);
  },
  describe,
  test,
  expect,
);
