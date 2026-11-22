"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/source-map-conformance");
const upstream = path.join(fixture, "node_modules/gensync");
const cases = [];
for (const mode of ["sync", "async"]) {
  cases.push({
    name: "Delegated " + mode + " generator",
    async: mode === "async",
    make(lib) {
      const gensync = require(lib),
        leaf = gensync({ sync: (n) => n + 1, async: async (n) => n + 1 });
      const flow = gensync(function* (value) {
        for (let i = 0; i < 4; i++) value = yield* leaf(value);
        return value;
      });
      return () => flow[mode](8);
    },
    validate: (value) => assert.equal(value, 12),
  });
}
const installs = new Map();
function compiler(lib) {
  if (installs.has(lib)) return installs.get(lib);
  const dir = require(path.join(fixture, "gensync-fixture.cjs"))();
  process.once("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  fs.symlinkSync(lib, path.join(dir, "node_modules/gensync"));
  const babel = require(path.join(dir, "node_modules/@babel/core"));
  const opts = {
    cwd: dir,
    filename: path.join(dir, "example.jsx"),
    babelrc: false,
    configFile: path.join(dir, "babel.config.json"),
    sourceMaps: true,
  };
  const build = { babel, opts };
  installs.set(lib, build);
  return build;
}
for (const mode of ["Sync", "Async"]) {
  cases.push({
    name: "Babel JSX file " + mode.toLowerCase() + " build",
    async: mode === "Async",
    make(lib) {
      const { babel, opts } = compiler(lib);
      return () => babel["transformFile" + mode](opts.filename, opts);
    },
    validate: (result) => {
      assert.ok(result.code.includes("contestTheme"));
      assert.equal(result.map.sources[0], "example.jsx");
    },
  });
}
const files = [
  "index.cjs",
  "bench/compare.cjs",
  "../../scripts/source-map-conformance/gensync-fixture.cjs",
  "../../scripts/source-map-conformance/package-lock.json",
  path.relative(root, path.join(upstream, "index.js")),
];
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream, vpm: root, cases, files })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
