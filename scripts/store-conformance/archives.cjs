"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  pkg = path.join(root, "packages/vtanstack-store"),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-store-archives-"));
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 2e6,
    env: {
      ...process.env,
      npm_config_cache: path.join(temp, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
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
  const archive = path.join(temp, "vtanstack-store-0.11.2.tgz");
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(?:test|bench|node_modules)\//,
  );
  const unpack = path.join(temp, "unpack");
  fs.mkdirSync(unpack);
  run("tar", ["-xzf", archive, "-C", unpack]);
  const packed = path.join(unpack, "package"),
    files = fs.readdirSync(packed).sort();
  for (const file of files)
    assert.deepEqual(
      fs.readFileSync(path.join(packed, file)),
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
        dependencies: {
          "@tanstack/store": "file:" + archive,
          "@tanstack/table-core": "9.3.1",
        },
        overrides: { "@tanstack/store": "file:" + archive },
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
    fs.rmSync(path.join(cwd, "node_modules"), { recursive: true });
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd,
    );
    assert.deepEqual(fs.readFileSync(lock), before);
    const entry = path.join(cwd, "node_modules/@tanstack/store");
    assert.deepEqual(
      fs
        .readdirSync(entry)
        .filter((file) => !(manager === "bun" && file === ".bun-tag"))
        .sort(),
      files,
    );
    for (const file of files)
      assert.deepEqual(
        fs.readFileSync(path.join(entry, file)),
        fs.readFileSync(path.join(packed, file)),
        file,
      );
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createAtom} from '@tanstack/store';import {constructTable,tableFeatures} from '@tanstack/table-core';import {storeReactivityBindings} from '@tanstack/table-core/store-reactivity-bindings';const c=createRequire(import.meta.url);assert.equal(createAtom,c('@tanstack/store').createAtom);const table=constructTable({features:tableFeatures({coreReactivityFeature:storeReactivityBindings()}),data:[{n:1}],columns:[{accessorKey:'n'}]});assert.equal(table.getRowModel().rows[0].getValue('n'),1);table.setOptions(old=>({...old,data:[{n:2}]}));assert.equal(table.getRowModel().rows[0].getValue('n'),2);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, ["consumer.mjs"], cwd);
      for (const test of ["run.cjs", "async.cjs"])
        console.log(
          run(runtime, [path.join(__dirname, test)], cwd, {
            VPM_STORE_ENTRY: entry,
          }).trim(),
        );
    }
    const types =
      fs
        .readFileSync(path.join(pkg, "test/types.ts"), "utf8")
        .replaceAll("vtanstack-store", "@tanstack/store") +
      `\nimport {constructTable,tableFeatures} from '@tanstack/table-core';import {storeReactivityBindings} from '@tanstack/table-core/store-reactivity-bindings';const table=constructTable({features:tableFeatures({coreReactivityFeature:storeReactivityBindings()}),data:[{n:1}],columns:[{accessorKey:'n'}]});const rows=table.getRowModel().rows;void rows;\n`;
    for (const ext of ["mts", "cts"])
      fs.writeFileSync(path.join(cwd, "consumer." + ext), types);
    for (const mode of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            types: [],
            module: mode === "Bundler" ? "Preserve" : mode,
            moduleResolution: mode,
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
      VPM_STORE_ENTRY: entry,
    });
    for (const runtime of ["node", "bun"])
      console.log(
        run(runtime, [path.join(__dirname, "table.cjs")], root).trim(),
      );
    console.log(
      manager +
        ": exact archive, frozen reinstall, Node/Bun, CJS/ESM and TS7 Table consumer pass.",
    );
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
