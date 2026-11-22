"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path"),
  stage = require("./semver-fixture.cjs");
const candidate = path.join(
  process.env.VPM_TRACE_INSTALL || path.resolve(__dirname, "../../packages"),
  "vsemver",
);
const result = (fn) => {
  try {
    return { value: fn() };
  } catch (e) {
    return { error: e.name, message: e.message };
  }
};
for (const control of ["semver-current", "semver-app", "semver-v6"])
  for (const version of ["@babel/helper-compilation-targets", "targets-app"]) {
    const a = stage(path.join(__dirname, "node_modules", control), version),
      b = stage(candidate, version);
    try {
      for (const input of [
        { node: "24" },
        { chrome: "130", firefox: "132" },
        { node: "24.4.1" },
        { node: "invalid" },
        { esmodules: true },
        { browsers: ["last 1 Chrome version"] },
        {},
      ]) {
        assert.deepEqual(
          result(() => b.targets(input, { ignoreBrowserslistConfig: true })),
          result(() => a.targets(input, { ignoreBrowserslistConfig: true })),
        );
        const options = {
          configFile: false,
          babelrc: false,
          targets: input,
          browserslistConfigFile: false,
          parserOpts: { plugins: ["jsx"] },
        };
        const code = "export const Result = () => <strong>Practice</strong>;";
        assert.deepEqual(
          result(() => b.core.transformSync(code, options).code),
          result(() => a.core.transformSync(code, options).code),
        );
      }
      for (const range of ["^7", "^8", ">=7.20.0", "7.0.0"]) {
        const probe = (core) => {
          let found;
          core.transformSync("let value = 1", {
            configFile: false,
            babelrc: false,
            plugins: [
              () => ({
                pre(file) {
                  found = file.availableHelper("extends", range);
                },
              }),
            ],
          });
          return found;
        };
        assert.equal(probe(b.core), probe(a.core));
      }
      for (const range of ["^7", "^7.29.0", "^8", "7 || 8", "invalid", 7, 8]) {
        const options = {
          configFile: false,
          babelrc: false,
          plugins: [
            (api) => {
              api.assertVersion(range);
              return {};
            },
          ],
        };
        assert.deepEqual(
          result(() => b.core.transformSync("let x = 1", options).code),
          result(() => a.core.transformSync("let x = 1", options).code),
        );
      }
    } finally {
      a.close();
      b.close();
    }
  }
console.log(
  "Unchanged Babel Core and compilation-targets callers match semver 6.3.2, 7.5.4 and 7.8.6.",
);
