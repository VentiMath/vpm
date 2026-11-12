"use strict";
const { JSDOM } = require("./node_modules/jsdom"),
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "Event",
  "CustomEvent",
  "Node",
])
  globalThis[key] =
    key === "window"
      ? dom.window
      : key === "document"
        ? dom.window.document
        : dom.window[key];
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;
// Keep the peer identical when exercising source and separately installed archives.
const Module = require("node:module"),
  resolve = Module._resolveFilename,
  reactPath = require.resolve("./node_modules/react");
Module._resolveFilename = function (name, ...args) {
  return name === "react" ? reactPath : resolve.call(this, name, ...args);
};
const React = require("./node_modules/react"),
  { createRoot } = require("./node_modules/react-dom/client"),
  api = require(
    process.argv[2] === "vpm"
      ? process.env.VFORM_ENTRY || "../../packages/vreact-hook-form"
      : "./node_modules/" + process.argv[2],
  );
const { zodResolver } = require(
    process.env.VRESOLVERS_ZOD || "./node_modules/@hookform/resolvers/zod",
  ),
  { z } = require(process.env.VZOD_ENTRY || "./node_modules/zod");
require("./scenario.cjs")
  .scenario(React, createRoot, api, zodResolver, z)
  .then(async (result) => {
    if (process.argv[2] === "vpm")
      await require("./safety.cjs")(React, createRoot, api);
    console.log(JSON.stringify(result));
    dom.window.close();
  })
  .catch((e) => {
    console.error(e);
    dom.window.close();
    process.exitCode = 1;
  });
