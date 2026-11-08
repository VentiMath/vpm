"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  pkg = path.join(root, "packages/vreact-swipeable"),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-swipeable-archives-"));
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 3e6,
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
  run("bun", [path.join(__dirname, "build.cjs")], root);
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    pkg,
  );
  const archive = path.join(temp, "vreact-swipeable-7.0.2.tgz");
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
      fs.readFileSync(path.join(pkg, file)),
      file,
    );
  for (const [manager, react] of [
    ["npm", "19.1.0"],
    ["bun", "19.2.4"],
  ]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: {
          "vreact-swipeable": "file:" + archive,
          react,
          "react-dom": react,
          "@types/react": "19.2.14",
        },
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
    const entry = path.join(cwd, "node_modules/vreact-swipeable"),
      env = { VPM_SWIPEABLE_ENTRY: entry, VPM_REACT_ROOT: cwd };
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createRequire} from 'node:module';import{useSwipeable,LEFT,RIGHT,UP,DOWN}from'vreact-swipeable';assert.equal(useSwipeable,createRequire(import.meta.url)('vreact-swipeable').useSwipeable);function View(){return React.createElement('div',useSwipeable({trackMouse:true}));}assert.equal(renderToStaticMarkup(React.createElement(View)),'<div></div>');assert.deepEqual([LEFT,RIGHT,UP,DOWN],['Left','Right','Up','Down']);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, ["consumer.mjs"], cwd);
      for (const variant of ["upstream", "vpm"])
        for (const script of ["upstream.cjs", "regressions.cjs"])
          console.log(
            run(
              runtime,
              [path.join(__dirname, script), variant],
              cwd,
              env,
            ).trim(),
          );
    }
    fs.copyFileSync(
      path.join(__dirname, "public-types.tsx"),
      path.join(cwd, "consumer.tsx"),
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            exactOptionalPropertyTypes: true,
            noEmit: true,
            jsx: "react-jsx",
            target: "ES2022",
            module: resolution === "Bundler" ? "Preserve" : resolution,
            moduleResolution: resolution,
            lib: ["ES2022", "DOM"],
            types: [],
          },
          files: ["consumer.tsx"],
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
    run("bun", [path.join(__dirname, "build.cjs")], root, env);
    console.log(
      react,
      run(
        "node",
        [
          path.join(__dirname, "browser.cjs"),
          path.join(__dirname, "node_modules/.vpm-swipeable"),
        ],
        root,
        env,
      ).trim(),
    );
    assert.deepEqual(
      require(path.join(entry, "package.json")).dependencies,
      {},
    );
  }
  console.log(
    "Exact archives: fresh/frozen npm/Bun, Node/Bun CJS/ESM SSR, TS7 DOM types, upstream/regression cases and Chrome gesture/scroll checks on React19.1/19.2 pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
