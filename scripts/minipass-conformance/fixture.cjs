"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { createRequire } = require("node:module");
module.exports = function fixture(replacement) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-minipass-caller-")),
    modules = root + "/node_modules";
  fs.mkdirSync(modules);
  for (const name of [
    "glob",
    "path-scurry",
    "lru-cache",
    "minipass",
    "minimatch",
    "brace-expansion",
    "balanced-match",
  ])
    fs.cpSync(__dirname + "/node_modules/" + name, modules + "/" + name, {
      recursive: true,
    });
  let bridge;
  if (replacement) {
    const dir = modules + "/minipass";
    fs.rmSync(dir, { recursive: true });
    fs.mkdirSync(dir);
    fs.writeFileSync(
      dir + "/package.json",
      JSON.stringify({ name: "minipass", main: "index.cjs" }),
    );
    bridge = dir + "/index.cjs";
    fs.writeFileSync(
      bridge,
      `const api=require(${JSON.stringify(path.resolve(replacement))});let count=0;module.exports={...api,Minipass:class extends api.Minipass{constructor(...args){super(...args);count++}},__calls:()=>count};`,
    );
  }
  const req = createRequire(root + "/caller.cjs");
  return {
    req,
    root,
    calls: () => (bridge ? req(bridge).__calls() : 0),
    close: () => fs.rmSync(root, { recursive: true, force: true }),
  };
};
