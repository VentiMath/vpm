"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { execFileSync } = require("node:child_process");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-mappings-"));
const pkg = path.resolve(__dirname, "../../packages/vsourcemap-codec");
const run = (bin, args, cwd, env = {}) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      npm_config_cache: folder + "/cache",
      BUN_INSTALL_CACHE_DIR: folder + "/bun-cache",
    },
  });
try {
  const archive = JSON.parse(
    run("npm", ["pack", pkg, "--json", "--ignore-scripts"], folder),
  )[0].filename;
  for (const manager of ["npm", "bun"]) {
    const cwd = folder + "/" + manager;
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      cwd + "/package.json",
      JSON.stringify({
        private: true,
        dependencies: { "vsourcemap-codec": "file:../" + archive },
      }),
    );
    run(manager, ["install", "--ignore-scripts"], cwd);
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts"]
        : ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd,
    );
    fs.writeFileSync(
      cwd + "/check.mjs",
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';
      import {encode,decode} from 'vsourcemap-codec';
      const api=createRequire(import.meta.url)('vsourcemap-codec');assert.equal(api.decode,decode);assert.deepEqual(decode(encode([[[0]]])),[[[0]]]);`,
    );
    for (const bin of ["node", "bun"]) {
      run(bin, ["check.mjs"], cwd);
      run(bin, [__dirname + "/codec-caller.cjs"], cwd, {
        VPM_SOURCEMAP_CODEC: cwd + "/node_modules/vsourcemap-codec",
      });
    }
  }
  console.log(
    "Fresh/frozen npm and Bun installs pass module and build caller checks",
  );
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
}
