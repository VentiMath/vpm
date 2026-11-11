"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vgoober-archives-"));
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
  const pack = JSON.parse(
      run("npm", [
        "pack",
        path.join(root, "packages/vgoober"),
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
        name: "vgoober-consumer",
        private: true,
        type: "module",
        dependencies: { vgoober: "file:" + archive },
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
    const pkg = path.join(dir, "node_modules/vgoober");
    assert.deepEqual(
      require(path.join(pkg, "package.json")).dependencies,
      undefined,
    );
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import * as api from 'vgoober';const req=createRequire(import.meta.url);assert.equal(api.css,req('vgoober').css);assert.equal(api.extractCss,req('vgoober').extractCss);const name=api.css({color:'red'});assert.ok(api.extractCss().includes(name));`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(runtime, [path.join(__dirname,"run.cjs")],dir,{...process.env,VGOOBER_ENTRY:path.join(pkg,"index.cjs")});
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(root, "packages/vgoober/test/styles.test.cjs"),
        ],
        dir,
        {
          ...process.env,
          VGOOBER_ENTRY: path.join(pkg, "index.cjs"),
        },
      );
    }
    if (manager === "npm") run("node", [path.join(__dirname,"browser.cjs")], dir, {...process.env,VGOOBER_ENTRY:path.join(pkg,"index.cjs")});
  }
  console.log(
    `Packed vgoober (${pack.size} bytes): isolated npm/Bun installs, frozen reinstalls, both runtimes, CSS entries and strict installed types pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
