"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-widget-archives-"));
const names = [
  "vreact-autosuggest",
  "vreact-themeable",
  "vsection-iterator",
  "vshallow-equal",
];
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 2e6,
    env: {
      ...process.env,
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
      npm_config_cache: path.join(temp, "npm-cache"),
      ...extra,
    },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const dependencies = {
    react: "19.1.0",
    "react-dom": "19.1.0",
    "@types/react": "19.1.16",
    "@types/react-dom": "19.1.9",
  };
  for (const name of names) {
    const pkg = path.join(root, "packages", name),
      version = require(path.join(pkg, "package.json")).version;
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      pkg,
    );
    const archive = path.join(temp, name + "-" + version + ".tgz");
    assert.doesNotMatch(
      run("tar", ["-tzf", archive]),
      /\/(?:test|bench|node_modules)\//,
    );
    const unpack = path.join(temp, name);
    fs.mkdirSync(unpack);
    run("tar", ["-xzf", archive, "-C", unpack]);
    for (const file of fs.readdirSync(path.join(unpack, "package")))
      assert.deepEqual(
        fs.readFileSync(path.join(unpack, "package", file)),
        fs.readFileSync(path.join(pkg, file)),
      );
    dependencies[name] = "file:" + archive;
  }
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies,
        overrides: Object.fromEntries(
          names.slice(1).map((name) => [name, dependencies[name]]),
        ),
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
    const entry = path.join(cwd, "node_modules/vreact-autosuggest");
    for (const runtime of ["node", "bun"])
      console.log(
        run(runtime, [path.join(__dirname, "run.cjs")], cwd, {
          VPM_WIDGET_ENTRY: entry,
        }).trim(),
      );
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import C from 'vreact-autosuggest';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';assert.equal(C,createRequire(import.meta.url)('vreact-autosuggest'));assert.match(renderToStaticMarkup(React.createElement(C,{suggestions:[],inputProps:{value:'',onChange(){}},getSuggestionValue:x=>x,renderSuggestion:x=>x,onSuggestionsFetchRequested(){}})),/combobox/);`,
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["consumer.mjs"], cwd);
    fs.copyFileSync(
      path.join(__dirname, "public-types.tsx"),
      path.join(cwd, "consumer.tsx"),
    );
    fs.writeFileSync(
      path.join(cwd, "consumer.cts"),
      `import C=require('vreact-autosuggest');import * as React from 'react';const ref=React.createRef<C<string>>();ref.current?.input?.focus();`,
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            jsx: "react-jsx",
            module: resolution === "Bundler" ? "Preserve" : resolution,
            moduleResolution: resolution,
            lib: ["ES2022", "DOM"],
            types: ["react", "react-dom"],
          },
          files: ["consumer.tsx", "consumer.cts"],
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
      VPM_WIDGET_ENTRY: entry,
    });
    if (manager === "npm")
      console.log(
        run(
          "node",
          [
            path.join(__dirname, "browser.cjs"),
            path.join(__dirname, "node_modules/.vpm-widget"),
          ],
          root,
        ).trim(),
      );
    for (const name of [
      "prop-types",
      "es6-promise",
      "react-autosuggest",
      "section-iterator",
      "react-themeable",
      "shallow-equal",
    ])
      assert.equal(
        fs.existsSync(path.join(cwd, "node_modules", name)),
        false,
        name + " should not be installed",
      );
  }
  console.log(
    "Exact four-package closure: fresh/frozen npm and Bun, Node/Bun SSR, CJS/ESM, TS7 NodeNext/Bundler and Chrome pass. No upstream runtime dependencies installed.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
