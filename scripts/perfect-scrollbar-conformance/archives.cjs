"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(
    path.join(os.tmpdir(), "vperfect-scrollbar-archives-"),
  );
const run = (bin, args, cwd = scratch, extra = {}) =>
  execFileSync(bin, args, {
    cwd,
    env: {
      ...process.env,
      ...extra,
      npm_config_cache: path.join(scratch, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(scratch, "bun-cache"),
    },
    encoding: "utf8",
    timeout: 180000,
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const pack = JSON.parse(
    run("npm", [
      "pack",
      path.join(root, "packages/vperfect-scrollbar"),
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  assert.ok(
    pack.files.every((x) => !/^test\/|^bench\/|^node_modules\//.test(x.path)),
  );
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "vperfect-scrollbar-consumer",
        private: true,
        type: "module",
        dependencies: {
          "vperfect-scrollbar": "file:" + path.join(scratch, pack.filename),
          react: "19.3.1",
          "@types/react": "19.2.2",
        },
      }),
    );
    run(
      manager,
      manager === "npm"
        ? ["install", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--ignore-scripts"],
      dir,
    );
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--ignore-scripts", "--frozen-lockfile"],
      dir,
    );
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(
        path.join(__dirname, "consumer." + ext),
        path.join(dir, "consumer." + ext),
      );
    run("node", [path.join(__dirname, "types.cjs"), dir]);
    const pkg = path.join(dir, "node_modules/vperfect-scrollbar"),
      env = { VPERFECT_ENTRY: path.join(pkg, "index.cjs"), VPERFECT_DIR: pkg };
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import Ps from 'vperfect-scrollbar';const require=createRequire(import.meta.url);assert.equal(Ps,require('vperfect-scrollbar'));assert.equal(require('vperfect-scrollbar/package.json').dependencies,undefined);assert.ok(require.resolve('vperfect-scrollbar/css/perfect-scrollbar.css').endsWith('.css'));`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(
            root,
            "packages/vperfect-scrollbar/test/scrollbar.test.cjs",
          ),
        ],
        dir,
        env,
      );
      run(runtime, [path.join(__dirname, "run.cjs")], dir, env);
    }
    if (manager === "npm")
      run("node", [path.join(__dirname, "browser.cjs")], dir, env);
  }
  console.log(
    `Packed vperfect-scrollbar (${pack.size} bytes): npm/Bun fresh and frozen installs, ESM/CJS/CSS, installed types/tests/browser pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
