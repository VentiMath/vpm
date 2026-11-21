"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fixture = path.join(__dirname, "node_modules");
const dir = fs.mkdtempSync(path.join(fixture, ".trace-caller-"));
try {
  function run(own) {
    const cwd = path.join(dir, own ? "vpm" : "control"),
      modules = path.join(cwd, "node_modules");
    const jridge = path.join(modules, "@jridgewell");
    fs.mkdirSync(jridge, { recursive: true });
    fs.mkdirSync(path.join(modules, "@babel"), { recursive: true });
    for (const name of [
      "@babel/generator",
      "@jridgewell/gen-mapping",
      "@jridgewell/remapping",
    ]) {
      fs.cpSync(path.join(fixture, name), path.join(modules, name), {
        recursive: true,
      });
    }
    const candidate =
      process.env.VPM_TRACE_INSTALL ||
      path.resolve(__dirname, "../../packages");
    for (const [up, replacement] of [
      ["trace-mapping", "vtrace-mapping"],
      ["sourcemap-codec", "vsourcemap-codec"],
      ["resolve-uri", "vresolve-uri"],
    ]) {
      fs.symlinkSync(
        own
          ? path.join(candidate, replacement)
          : path.join(fixture, "@jridgewell", up),
        path.join(jridge, up),
      );
    }
    fs.copyFileSync(
      path.join(__dirname, "trace-consumer.mjs"),
      path.join(cwd, "probe.mjs"),
    );
    return JSON.parse(
      execFileSync(process.execPath, ["probe.mjs"], { cwd, encoding: "utf8" }),
    );
  }
  const control = run(false);
  assert.deepEqual(run(true), control);
  console.log(
    "Unchanged Babel generator, gen-mapping and remapping produce identical composed maps, positions, names and source contents.",
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
