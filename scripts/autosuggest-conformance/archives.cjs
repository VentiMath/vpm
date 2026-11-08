"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  pkg = path.join(root, "packages/vautosuggest-highlight"),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-autosuggest-archives-"));
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
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
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    pkg,
  );
  const archive = path.join(temp, "vautosuggest-highlight-3.3.4.tgz");
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(?:test|bench|node_modules)\//,
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
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: { "vautosuggest-highlight": "file:" + archive },
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
    const entry = path.join(cwd, "node_modules/vautosuggest-highlight");
    for (const runtime of ["node", "bun"]) {
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(pkg, "test/contracts.test.cjs"),
        ],
        cwd,
        { VPM_AUTOSUGGEST_ENTRY: entry },
      );
      console.log(
        run(runtime, [path.join(__dirname, "run.cjs")], cwd, {
          VPM_AUTOSUGGEST_ENTRY: entry,
        }).trim(),
      );
    }
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {match,parse} from 'vautosuggest-highlight';import m from 'vautosuggest-highlight/match';import p from 'vautosuggest-highlight/parse';const require=createRequire(import.meta.url);assert.equal(match,m);assert.equal(parse,p);assert.equal(match,require('vautosuggest-highlight/match'));assert.equal(parse,require('vautosuggest-highlight/parse'));assert.deepEqual(m('😀 café','cafe'),[[3,7]]);`,
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
        `\nimport cm=require('vautosuggest-highlight/match');import cp=require('vautosuggest-highlight/parse');cp('abc',cm('abc','a'));`,
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
            lib: ["ES2022"],
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
    fs.writeFileSync(
      path.join(cwd, "browser.mjs"),
      `import match from 'vautosuggest-highlight/match';import parse from 'vautosuggest-highlight/parse';const text='😀 café';const parts=parse(text,match(text,'cafe'));if(JSON.stringify(parts)!==JSON.stringify([{text:'😀 ',highlight:false},{text:'café',highlight:true}]))throw Error('Incorrect browser highlight');globalThis.browserPassed=true;`,
    );
    console.log(
      run(
        "bun",
        [path.join(__dirname, "browser.cjs"), path.join(cwd, "browser.mjs")],
        cwd,
      ).trim(),
    );
    assert.deepEqual(
      require(path.join(entry, "package.json")).dependencies,
      {},
    );
  }
  console.log(
    "Exact archives: fresh/frozen npm/Bun, Node/Bun contracts, CJS/ESM identity, TS7 NodeNext/Bundler and browser bundles pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
