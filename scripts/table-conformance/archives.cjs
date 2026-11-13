"use strict";
require("./check-controls.cjs").check();
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-table-archives-"));
function run(cmd, args, cwd = temp, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 2e6,
    env: {
      ...process.env,
      npm_config_cache: path.join(temp, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
      ...env,
    },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const archives = {},
    packedDirs = {};
  for (const name of ["vtanstack-store", "vtanstack-table-core"]) {
    const pkg = path.join(root, "packages", name),
      meta = require(path.join(pkg, "package.json"));
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      pkg,
    );
    const archive = path.join(temp, name + "-" + meta.version + ".tgz");
    archives[name] = archive;
    const unpack = path.join(temp, name);
    fs.mkdirSync(unpack);
    run("tar", ["-xzf", archive, "-C", unpack]);
    const packed = (packedDirs[name] = path.join(unpack, "package"));
    assert.doesNotMatch(
      run("tar", ["-tzf", archive]),
      /\/(?:test|bench|node_modules)\//,
    );
    for (const file of fs.readdirSync(packed)) {
      if (file === "package.json") {
        const expected = structuredClone(meta);
        if (expected.dependencies?.["vtanstack-store"])
          expected.dependencies["vtanstack-store"] = "0.11.2";
        assert.deepEqual(
          JSON.parse(fs.readFileSync(path.join(packed, file))),
          expected,
        );
      } else
        assert.deepEqual(
          fs.readFileSync(path.join(packed, file)),
          fs.readFileSync(path.join(pkg, file)),
        );
    }
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
          "vtanstack-table-core": "file:" + archives["vtanstack-table-core"],
          "vtanstack-store": "file:" + archives["vtanstack-store"],
        },
        overrides: { "vtanstack-store": "file:" + archives["vtanstack-store"] },
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
        : ["install", "--ignore-scripts", "--frozen-lockfile"],
      cwd,
    );
    assert.deepEqual(fs.readFileSync(lock), before);
    for (const name of Object.keys(archives)) {
      const installed = path.join(cwd, "node_modules", name),
        packed = packedDirs[name];
      assert.deepEqual(
        fs
          .readdirSync(installed)
          .filter((f) => f !== ".bun-tag")
          .sort(),
        fs.readdirSync(packed).sort(),
      );
      for (const file of fs.readdirSync(packed))
        assert.deepEqual(
          fs.readFileSync(path.join(installed, file)),
          fs.readFileSync(path.join(packed, file)),
        );
    }
    const entry = path.join(cwd, "node_modules/vtanstack-table-core");
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import {constructTable} from 'vtanstack-table-core';import {createRequire} from 'node:module';import assert from 'node:assert/strict';assert.equal(constructTable,createRequire(import.meta.url)('vtanstack-table-core').constructTable);assert.equal(constructTable({data:[{n:2}],columns:[{accessorKey:'n'}]}).getRowModel().rows[0].getValue('n'),2);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, ["consumer.mjs"], cwd);
      for (const file of [
        "run.cjs",
        "state.cjs",
        "matrix.cjs",
        "grouped-selection.cjs",
        "functions.cjs",
      ])
        console.log(
          run(runtime, [path.join(__dirname, file)], root, {
            VPM_TABLE_ENTRY: entry,
          }).trim(),
        );
    }
    const types = fs.readFileSync(
      path.join(root, "packages/vtanstack-table-core/test/types.ts"),
      "utf8",
    );
    for (const ext of ["mts", "cts"])
      fs.writeFileSync(path.join(cwd, "consumer." + ext), types);
    for (const mode of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          files: ["consumer.mts", "consumer.cts"],
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "es2022",
            lib: ["es2022"],
            types: [],
            module: mode === "Bundler" ? "Preserve" : mode,
            moduleResolution: mode,
          },
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
    console.log(
      manager +
        ": exact archives, frozen install, CJS/ESM, Node/Bun and TS7 consumers pass.",
    );
    if (manager === "bun") {
      console.log(
        run("bun", [path.join(__dirname, "build.cjs")], root, {
          VPM_TABLE_ENTRY: entry,
        }).trim(),
      );
      console.log(
        run("node", [path.join(__dirname, "browser.cjs")], root).trim(),
      );
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
