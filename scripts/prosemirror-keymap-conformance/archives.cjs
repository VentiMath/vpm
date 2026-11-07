"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-keymap-archives-"));
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
  for (const name of [
    "vorderedmap",
    "vprosemirror-model",
    "vprosemirror-transform",
    "vprosemirror-state",
    "vw3c-keyname",
    "vprosemirror-keymap",
  ]) {
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
        dependencies: {
          ...deps,
          "prosemirror-view": "1.42.9",
          "prosemirror-state": deps["vprosemirror-state"],
          "prosemirror-model": deps["vprosemirror-model"],
          "prosemirror-transform": deps["vprosemirror-transform"],
        },
        overrides: {
          vorderedmap: deps.vorderedmap,
          "vw3c-keyname": deps["vw3c-keyname"],
          "vprosemirror-state": deps["vprosemirror-state"],
          "vprosemirror-model": deps["vprosemirror-model"],
          "vprosemirror-transform": deps["vprosemirror-transform"],
          "prosemirror-state": deps["vprosemirror-state"],
          "prosemirror-model": deps["vprosemirror-model"],
          "prosemirror-transform": deps["vprosemirror-transform"],
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
    const modelEntry = path.join(
        cwd,
        "node_modules/vprosemirror-model/index.cjs",
      ),
      entry = path.join(cwd, "node_modules/vprosemirror-keymap/index.cjs"),
      stateEntry = path.join(cwd, "node_modules/vprosemirror-state/index.cjs"),
      transformEntry = path.join(
        cwd,
        "node_modules/vprosemirror-transform/index.cjs",
      );
    for (const runtime of ["node", "bun"])
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          ...["contracts"].map((name) =>
            path.join(
              root,
              "packages/vprosemirror-keymap/test",
              name + ".test.cjs",
            ),
          ),
        ],
        cwd,
        {
          VPM_KEYMAP_ENTRY: entry,
          VPM_KEYNAME_ENTRY: path.join(
            cwd,
            "node_modules/vw3c-keyname/index.cjs",
          ),
          VPM_STATE_ENTRY: stateEntry,
          VPM_TRANSFORM_ENTRY: transformEntry,
          VPM_MODEL_ENTRY: modelEntry,
        },
      );
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {keymap,keydownHandler} from 'vprosemirror-keymap';const c=createRequire(import.meta.url)('vprosemirror-keymap');assert.equal(c.keymap,keymap);assert.equal(c.keydownHandler,keydownHandler);`,
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["consumer.mjs"], cwd);
    const types = fs.readFileSync(
      path.join(__dirname, "public-types.ts"),
      "utf8",
    );
    fs.writeFileSync(path.join(cwd, "consumer.mts"), types);
    const aliases = new Map(),
      imports = [];
    const cjsBody = types.replace(
      /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];/g,
      (_all, names, source) => {
        const ns = "Module" + imports.length;
        imports.push(`import ${ns} = require(${JSON.stringify(source)});`);
        for (const name of names
          .split(",")
          .map((n) => n.trim().replace(/^type /, "")))
          if (name) aliases.set(name, ns + "." + name);
        return "";
      },
    );
    fs.writeFileSync(
      path.join(cwd, "consumer.cts"),
      imports.join("\n") +
        "\n" +
        cjsBody.replace(
          new RegExp("\\b(" + [...aliases.keys()].join("|") + ")\\b", "g"),
          (name) => aliases.get(name),
        ),
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
      console.log(
        manager + ": checking " + resolution + " public declarations",
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
      VPM_KEYMAP_ENTRY: entry,
      VPM_KEYNAME_ENTRY: path.join(cwd, "node_modules/vw3c-keyname/index.cjs"),
      VPM_STATE_ENTRY: stateEntry,
      VPM_TRANSFORM_ENTRY: transformEntry,
      VPM_MODEL_ENTRY: modelEntry,
    });
    const built = path.join(__dirname, "node_modules/.vpm-keymap");
    for (const runtime of ["node", "bun"]) {
      const results = ["upstream", "vpm"].map((v) =>
        JSON.parse(run(runtime, [path.join(built, v + "-tests.cjs")], root)),
      );
      assert.deepEqual(
        results[0].map(({ name, pass }) => ({ name, pass })),
        results[1].map(({ name, pass }) => ({ name, pass })),
      );
      const failed = results[1].filter((r) => !r.pass);
      assert.equal(failed.length, 1);
      assert.equal(
        failed[0].name,
        require("./upstream.json").knownPublishedMismatch.test,
      );
    }
    if (manager === "npm") {
      fs.copyFileSync(
        path.join(built, "bundle.js"),
        path.join(cwd, "bundle.js"),
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
