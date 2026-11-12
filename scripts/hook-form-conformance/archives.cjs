"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(
    path.join(os.tmpdir(), "vreact-hook-form-archives-"),
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
      path.join(root, "packages/vreact-hook-form"),
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
        name: "vreact-hook-form-consumer",
        private: true,
        type: "module",
        overrides: {
          "react-hook-form": "file:" + path.join(scratch, pack.filename),
        },
        dependencies: {
          "vreact-hook-form": "file:" + path.join(scratch, pack.filename),
          react: "19.3.1",
          "react-dom": "19.3.1",
          zod: "3.24.3",
          "@hookform/resolvers": "5.0.1",
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
    const pkg = path.join(dir, "node_modules/vreact-hook-form"),
      env = {
        VFORM_ENTRY: path.join(pkg, "index.cjs"),
        VFORM_STORE: path.join(pkg, "store.cjs"),
      };
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import * as api from 'vreact-hook-form';import React from 'react';import {renderToString} from 'react-dom/server';const require=createRequire(import.meta.url);assert.equal(api.useForm,require('vreact-hook-form').useForm);assert.equal(require('vreact-hook-form/package.json').dependencies,undefined);function Form(){const f=api.useForm({defaultValues:{name:'Alice'}});return React.createElement(api.Controller,{control:f.control,name:'name',render:({field})=>React.createElement('input',field)});}assert.match(renderToString(React.createElement(Form)),/value="Alice"/);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(root, "packages/vreact-hook-form/test/store.test.cjs"),
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
    `Packed vreact-hook-form (${pack.size} bytes): npm/Bun fresh and frozen installs, ESM/CJS, installed types/tests/browser pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
