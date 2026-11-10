"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vmotion-dom-archives-"));
function run(bin, args, cwd = scratch, env = process.env) {
  return execFileSync(bin, args, {
    cwd,
    env: {
      ...env,
      npm_config_cache: path.join(scratch, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(scratch, "bun-cache"),
    },
    encoding: "utf8",
    timeout: 120000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
try {
  const dependency = JSON.parse(
    run("npm", [
      "pack",
      path.join(root, "packages/vmotion-utils"),
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  const dependencyArchive = path.join(scratch, dependency.filename);
  const pack = JSON.parse(
      run("npm", [
        "pack",
        path.join(root, "packages/vmotion-dom"),
        "--ignore-scripts",
        "--json",
      ]),
    )[0],
    archive = path.join(scratch, pack.filename);
  assert.ok(
    pack.files.every(
      (x) =>
        !x.path.startsWith("node_modules/") &&
        !x.path.startsWith("test/") &&
        !x.path.startsWith("bench/"),
    ),
  );
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "vmotion-dom-consumer",
        private: true,
        type: "module",
        overrides: { "vmotion-utils": "file:" + dependencyArchive },
        dependencies: {
          "vmotion-dom": "file:" + archive,
          "vmotion-utils": "file:" + dependencyArchive,
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
    const pkg = path.join(dir, "node_modules/vmotion-dom");
    assert.deepEqual(require(path.join(pkg, "package.json")).dependencies, {
      "vmotion-utils": "14.7.0",
    });
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import * as api from 'vmotion-dom';const req=createRequire(import.meta.url);assert.equal(api.interpolate,req('vmotion-dom').interpolate);assert.equal(api.MotionValue,req('vmotion-dom').MotionValue);assert.equal(api.frameData,req('vmotion-dom').frameData);assert.equal(api.createEffect,req('vmotion-dom').createEffect);assert.equal(api.MotionValueState,req('vmotion-dom').MotionValueState);assert.equal(api.animate.addEffect,api.addEffect);assert.equal(api.interpolate([0,1],[0,100])(.25),25);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          ...fs
            .readdirSync(path.join(root, "packages/vmotion-dom/test"))
            .filter((name) => name.endsWith(".test.cjs"))
            .map((name) => path.join(root, "packages/vmotion-dom/test", name)),
        ],
        dir,
        {
          ...process.env,
          VMOTION_DOM_ENTRY: path.join(pkg, "index.cjs"),
        },
      );
    }
  }
  console.log(
    `Packed vmotion-dom (${pack.size} bytes): isolated npm/Bun installs, frozen reinstalls, both runtimes, utility entries and strict installed types pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
