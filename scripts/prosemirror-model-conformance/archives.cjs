"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-model-archives-"));
function run(cmd, args, cwd = temp, extra = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 5e6,
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
  const deps = {};
  for (const name of ["vorderedmap", "vprosemirror-model"]) {
    const source = path.join(root, "packages", name),
      meta = require(path.join(source, "package.json"));
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      source,
    );
    const archive = path.join(temp, name + "-" + meta.version + ".tgz");
    deps[name] = "file:" + archive;
    assert.doesNotMatch(
      run("tar", ["-tzf", archive]),
      /\/(test|bench|node_modules)\//,
    );
    const unpack = path.join(temp, name);
    fs.mkdirSync(unpack);
    run("tar", ["-xzf", archive, "-C", unpack]);
    for (const file of fs.readdirSync(path.join(unpack, "package")))
      assert.deepEqual(
        fs.readFileSync(path.join(unpack, "package", file)),
        fs.readFileSync(path.join(source, file)),
        file,
      );
  }
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: deps,
        overrides: { vorderedmap: deps.vorderedmap },
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
    const entry = path.join(cwd, "node_modules/vprosemirror-model/index.cjs");
    for (const runtime of ["node", "bun"])
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          ...["contracts", "dom"].map((name) =>
            path.join(
              root,
              "packages/vprosemirror-model/test",
              name + ".test.cjs",
            ),
          ),
        ],
        cwd,
        { VPM_MODEL_ENTRY: entry },
      );
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {Schema,Node,DOMParser} from 'vprosemirror-model';const c=createRequire(import.meta.url)('vprosemirror-model');assert.equal(c.Schema,Schema);assert.equal(c.Node,Node);assert.equal(c.DOMParser,DOMParser);`,
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["consumer.mjs"], cwd);
    const types = fs.readFileSync(
      path.join(__dirname, "public-types.ts"),
      "utf8",
    );
    for (const suffix of ["mts", "cts"])
      fs.writeFileSync(path.join(cwd, "consumer." + suffix), types);
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
    run("bun", [path.join(__dirname, "build.cjs"), "vpm"], root, {
      VPM_MODEL_ENTRY: entry,
    });
    const built = path.join(__dirname, "node_modules/.vpm-model");
    for (const runtime of ["node", "bun"]) {
      const results = ["vpm", "upstream", "app"].map((v) =>
        JSON.parse(run(runtime, [path.join(built, v + "-callers.cjs")], root)),
      );
      assert.deepEqual(results[0], results[1]);
      assert.deepEqual(results[0], results[2]);
    }
    if (manager === "npm") {
      fs.writeFileSync(
        path.join(cwd, "bundle.js"),
        ["upstream", "app", "vpm"]
          .map((v) =>
            fs.readFileSync(path.join(built, v + "-browser.js"), "utf8"),
          )
          .join("\n") +
          `\nwindow.runChecks=()=>{const r=Object.values(window.modelResults);if(r.length!==3||r.some(x=>JSON.stringify(x)!==JSON.stringify(r[0])))throw Error('Browser caller mismatch');return {variants:3,snapshots:r[0].length,equal:true}};`,
      );
      console.log(
        run("node", [path.join(__dirname, "browser.cjs"), cwd], root).trim(),
      );
    }
    console.log(
      manager +
        ": exact archives, fresh/frozen install, Node/Bun edits and Tiptap callers, CJS/ESM identity, TS7 CJS/ESM NodeNext/Bundler pass.",
    );
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
