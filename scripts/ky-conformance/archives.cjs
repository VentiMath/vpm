"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vky-archives-"));
function run(bin, args, cwd = scratch, env = process.env) {
  return execFileSync(bin, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 120000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
try {
  const pack = JSON.parse(
      run("npm", [
        "pack",
        path.join(root, "packages/vky"),
        "--ignore-scripts",
        "--json",
      ]),
    )[0],
    archive = path.join(scratch, pack.filename);
  assert.ok(
    pack.files.every(
      (x) =>
        !x.path.startsWith("node_modules/") &&
        !x.path.startsWith("test/") &&
        !x.path.startsWith("bench/"),
    ),
  );
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "vky-consumer",
        private: true,
        type: "module",
        dependencies: { vky: "file:" + archive },
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
    const pkg = path.join(dir, "node_modules/vky");
    assert.deepEqual(
      require(path.join(pkg, "package.json")).dependencies,
      undefined,
    );
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import * as modern from 'vky';import * as legacy from 'vky/legacy';import {scenarios} from ${JSON.stringify(require("node:url").pathToFileURL(path.join(__dirname, "cases.mjs")).href)};const req=createRequire(import.meta.url);assert.equal(modern.default,req('vky'));assert.equal(modern.HTTPError,legacy.HTTPError);assert.equal(req('vky/legacy'),legacy.default);assert.equal((await scenarios(modern)).get.method,'GET');assert.equal((await scenarios(legacy,true)).get.method,'GET');`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(root, "packages/vky/test/index.test.cjs"),
        ],
        dir,
        {
          ...process.env,
          VKY_ENTRY: path.join(pkg, "index.cjs"),
          VKY_LEGACY_ENTRY: path.join(pkg, "legacy.cjs"),
        },
      );
    }
  }
  console.log(
    `Packed vky (${pack.size} bytes): isolated npm/Bun installs, frozen reinstalls, both runtimes, public entries and strict installed types pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
