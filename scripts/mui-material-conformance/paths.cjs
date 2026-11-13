"use strict";
const path = require("node:path");
const fixture = path.resolve(__dirname, "../mui-system-conformance");
const root = path.resolve(__dirname, "../..");
const packages = process.env.VPM_MATERIAL_INSTALL
  ? path.join(process.env.VPM_MATERIAL_INSTALL, "node_modules")
  : path.join(root, "packages");
const { createRequire } = require("node:module"),
  peer = createRequire(path.join(fixture, "package.json"));
module.exports = { fixture, root, packages, peer, esbuild: peer("esbuild") };
