"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-keyname-archives-"));
function run(cmd, args, cwd = temp, env = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 2e6,
    env: {
      ...process.env,
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
      npm_config_cache: path.join(temp, "npm-cache"),
      ...env,
    },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
try {
  const packageDir = path.join(root, "packages/vw3c-keyname");
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    packageDir,
  );
  const archive = path.join(temp, "vw3c-keyname-2.2.8.tgz");
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(test|bench|node_modules)\//,
  );
  const unpack = path.join(temp, "unpack");
  fs.mkdirSync(unpack);
  run("tar", ["-xzf", archive, "-C", unpack]);
  for (const file of fs.readdirSync(path.join(unpack, "package")))
    assert.deepEqual(
      fs.readFileSync(path.join(unpack, "package", file)),
      fs.readFileSync(path.join(packageDir, file)),
      file,
    );
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: { "vw3c-keyname": "file:" + archive },
      }),
    );
    run(
      manager,
      [
        "install",
        "--ignore-scripts",
        ...(manager === "npm" ? ["--no-audit", "--no-fund"] : []),
      ],
      cwd,
    );
    const lock = path.join(
        cwd,
        manager === "npm" ? "package-lock.json" : "bun.lock",
      ),
      before = fs.readFileSync(lock);
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd,
    );
    assert.deepEqual(fs.readFileSync(lock), before);
    const entry = path.join(cwd, "node_modules/vw3c-keyname/index.cjs");
    for (const runtime of ["node", "bun"]) {
      console.log(
        run(
          runtime,
          [
            runtime === "node" ? "--test" : "test",
            path.join(packageDir, "test/contracts.test.cjs"),
          ],
          cwd,
          { VPM_KEYNAME_ENTRY: entry },
        ).trim(),
      );
      console.log(
        run(runtime, [path.join(__dirname, "callers.cjs")], cwd, {
          VPM_KEYNAME_ENTRY: entry,
        }).trim(),
      );
    }
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {keyName,base,shift} from 'vw3c-keyname';const c=createRequire(import.meta.url)('vw3c-keyname');assert.equal(c.keyName,keyName);assert.equal(c.base,base);assert.equal(c.shift,shift);assert.equal(keyName({keyCode:13}),'Enter');`,
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["consumer.mjs"], cwd);
    const types = fs.readFileSync(
      path.join(__dirname, "public-types.ts"),
      "utf8",
    );
    fs.writeFileSync(path.join(cwd, "consumer.mts"), types);
    fs.writeFileSync(
      path.join(cwd, "consumer.cts"),
      types +
        `\nimport Cjs = require('vw3c-keyname');const cjsName:string=Cjs.keyName({keyCode:13});`,
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            module: resolution === "Bundler" ? "Preserve" : resolution,
            moduleResolution: resolution,
            lib: ["ES2022", "DOM"],
            types: [],
          },
          files: ["consumer.mts", "consumer.cts"],
        }),
      );
      run(
        "node",
        [
          require("../platform-types.cjs").compiler().path,
          "-p",
          "tsconfig.json",
        ],
        cwd,
      );
    }
    run("bun", [path.join(__dirname, "build.cjs")], root, {
      VPM_KEYNAME_ENTRY: entry,
    });
    if (manager === "npm")
      console.log(
        run(
          "node",
          [
            path.join(__dirname, "browser.cjs"),
            path.join(__dirname, "node_modules/.vpm-keyname"),
          ],
          root,
        ).trim(),
      );
    assert.deepEqual(
      require(path.join(cwd, "node_modules/vw3c-keyname/package.json"))
        .dependencies,
      {},
    );
  }
  console.log(
    "Exact one-package archives: fresh/frozen npm/Bun, Node/Bun contracts and real ProseMirror keymap callers, CJS/ESM identity, TS7 CJS/ESM NodeNext/Bundler with DOM declarations, native Chrome keyboard events pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
