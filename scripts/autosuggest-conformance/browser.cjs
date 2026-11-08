"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
// The API is pure string processing. Execute its browser-target bundle in an
// empty global context to catch accidental Node/process/Buffer dependencies.
(async () => {
  const entry = process.argv[2];
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "iife",
    minify: true,
  });
  assert(result.success, result.logs.join("\n"));
  const context = {};
  vm.runInNewContext(await result.outputs[0].text(), context);
  assert.equal(context.browserPassed, true);
  console.log("Browser-target bundle executes without platform globals.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
