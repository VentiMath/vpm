"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const stage = require("./option-fixture.cjs");
const local = path.join(
  process.env.VPM_TRACE_INSTALL || path.resolve(__dirname, "../../packages"),
  "vbabel-helper-validator-option",
);
const upstream = path.join(
  __dirname,
  "node_modules/@babel/helper-validator-option",
);
function result(fn) {
  try {
    return { value: fn() };
  } catch (e) {
    return { error: e.name, message: e.message };
  }
}
for (const version of ["@babel/helper-compilation-targets", "targets-app"]) {
  const a = stage(upstream, version),
    b = stage(local, version);
  try {
    for (const input of [
      { node: "24" },
      { chrome: "130", firefox: "132" },
      { browsers: ["last 1 Chrome version"] },
      { chorme: "130" },
      { node: "invalid" },
      { browsers: 42 },
      { safrai: "18" },
      {},
    ]) {
      const expected = result(() =>
        a.targets(input, { ignoreBrowserslistConfig: true }),
      );
      assert.deepEqual(
        result(() => b.targets(input, { ignoreBrowserslistConfig: true })),
        expected,
      );
      const options = {
        configFile: false,
        babelrc: false,
        targets: input,
        browserslistConfigFile: false,
        parserOpts: { plugins: ["jsx"] },
      };
      const code = "export const Result = () => <strong>Practice</strong>;";
      const build = (core) => core.transformSync(code, options).code;
      assert.deepEqual(
        result(() => build(b.core)),
        result(() => build(a.core)),
      );
    }
    assert.match(
      result(() => b.targets({ chorme: "130" })).message,
      /Did you mean 'chrome'/,
    );
  } finally {
    a.close();
    b.close();
  }
}
console.log("Current/app compilation targets and Babel Core validation match.");
