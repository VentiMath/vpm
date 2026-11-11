"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vnotistack-archives-"));
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
  const dependencies = {},
    overrides = {};
  let size;
  for (const name of [
    "vnotistack",
    "vgoober",
    "vclsx",
    "vreact-transition-group",
  ]) {
    const pack = JSON.parse(
      run("npm", [
        "pack",
        path.join(root, "packages", name),
        "--ignore-scripts",
        "--json",
      ]),
    )[0];
    assert.ok(
      pack.files.every((x) => !/^test\/|^bench\/|^node_modules\//.test(x.path)),
    );
    dependencies[name] = "file:" + path.join(scratch, pack.filename);
    if (name !== "vnotistack") overrides[name] = dependencies[name];
    else size = pack.size;
  }
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "vnotistack-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...dependencies,
          react: "19.3.1",
          "react-dom": "19.3.1",
          "@types/react": "19.2.2",
          "@types/react-dom": "19.2.2",
        },
        overrides,
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
    const pkg = path.join(dir, "node_modules/vnotistack"),
      env = {
        VNOTISTACK_ENTRY: path.join(pkg, "index.cjs"),
        VNOTISTACK_DIR: pkg,
      };
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import * as api from 'vnotistack';const require=createRequire(import.meta.url);assert.equal(api.SnackbarProvider,require('vnotistack').SnackbarProvider);assert.equal(api.enqueueSnackbar,require('vnotistack').enqueueSnackbar);assert.deepEqual(Object.keys(require('vnotistack/package.json').dependencies).sort(),['vclsx','vgoober','vreact-transition-group']);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(root, "packages/vnotistack/test/queue.test.cjs"),
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
    `Packed vnotistack (${size} bytes): npm/Bun isolated and frozen installs, CJS/ESM, both runtimes, strict types and installed browser checks pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
