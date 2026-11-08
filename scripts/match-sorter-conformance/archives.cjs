"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  pkg = path.join(root, "packages/vtanstack-match-sorter-utils"),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-ranking-archives-"));
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
  const archive = path.join(temp, "vtanstack-match-sorter-utils-9.2.6.tgz");
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(?:test|bench|node_modules)\//,
  );
  const unpack = path.join(temp, "unpacked");
  fs.mkdirSync(unpack);
  run("tar", ["-xzf", archive, "-C", unpack]);
  const packed = path.join(unpack, "package");
  const shippedFiles = fs.readdirSync(packed).sort();
  for (const file of shippedFiles)
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
        dependencies: { "@tanstack/match-sorter-utils": "file:" + archive },
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
    const entry = path.join(cwd, "node_modules/@tanstack/match-sorter-utils");
    // Bun may add its own cache marker on Linux. It is not archive content.
    assert.deepEqual(
      fs
        .readdirSync(entry)
        .filter((file) => !(manager === "bun" && file === ".bun-tag"))
        .sort(),
      shippedFiles,
    );
    for (const file of shippedFiles)
      assert.deepEqual(
        fs.readFileSync(path.join(entry, file)),
        fs.readFileSync(path.join(pkg, file)),
        file,
      );
    assert.equal(
      fs.existsSync(path.join(cwd, "node_modules/remove-accents")),
      false,
    );
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {rankItem,rankings} from '@tanstack/match-sorter-utils';const common=createRequire(import.meta.url)('@tanstack/match-sorter-utils');assert.equal(common.rankItem,rankItem);assert.equal(rankItem('José','Jose').rank,rankings.CASE_SENSITIVE_EQUAL);`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, ["consumer.mjs"], cwd);
      for (const test of ["run.cjs", "caller.cjs"])
        console.log(
          run(runtime, [path.join(__dirname, test)], cwd, {
            VPM_MATCH_ENTRY: entry,
          }).trim(),
        );
    }
    const types = fs
      .readFileSync(path.join(pkg, "test/types.ts"), "utf8")
      .replaceAll(
        "vtanstack-match-sorter-utils",
        "@tanstack/match-sorter-utils",
      );
    fs.writeFileSync(path.join(cwd, "consumer.mts"), types);
    fs.writeFileSync(path.join(cwd, "consumer.cts"), types);
    for (const mode of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            lib: ["ES2022"],
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
  }
  console.log(
    "Exact standalone ranking archive: fresh/frozen npm+Bun alias installs, Node/Bun current/app and unchanged MRT caller, CJS/ESM and TS7 pass; no remove-accents dependency.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
