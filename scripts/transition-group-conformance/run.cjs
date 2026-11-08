"use strict";
require("./verify.cjs");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><body></body>", {
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
const React = require("react"),
  { createRoot } = require("react-dom/client"),
  { flushSync } = require("react-dom"),
  run = require("./contracts.cjs");
(async () => {
  const before = await run(
    React,
    createRoot,
    flushSync,
    require("react-transition-group"),
  );
  const after = await run(
    React,
    createRoot,
    flushSync,
    require("./load.cjs")(),
  );
  assert.deepEqual(after, before);
  console.log(
    after.length +
      " transition/group lifecycle, CSS, interruption, ref, callback and cleanup snapshots match 4.4.5.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => dom.window.close());
