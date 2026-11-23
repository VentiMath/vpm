"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-minipass-archive-"));
const run = (bin, args, cwd = tmp, extra = {}) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    env: {
      ...process.env,
      npm_config_cache: tmp + "/npm-cache",
      BUN_INSTALL_CACHE_DIR: tmp + "/bun-cache",
      npm_config_audit: "false",
      npm_config_fund: "false",
      ...extra,
    },
  });
try {
  const pack = JSON.parse(
    run("npm", [
      "pack",
      root + "/packages/vminipass",
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  assert(
    pack.files.every(
      (f) => !f.path.startsWith("test/") && !f.path.startsWith("bench/"),
    ),
  );
  for (const manager of ["npm", "bun"]) {
    const cwd = tmp + "/" + manager;
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      cwd + "/package.json",
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: { vminipass: "file:../" + pack.filename },
      }),
    );
    run(manager, ["install", "--ignore-scripts"], cwd);
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts"]
        : ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd,
    );
    fs.writeFileSync(
      cwd + "/check.mjs",
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {Minipass,isStream} from 'vminipass';assert.equal(createRequire(import.meta.url)('vminipass').Minipass,Minipass);const s=new Minipass({encoding:'utf8'});s.end('unicode 🦋');assert.equal(await s.concat(),'unicode 🦋');assert(isStream(s));`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, ["check.mjs"], cwd);
      process.stdout.write(
        run(runtime, [__dirname + "/callers.cjs"], cwd, {
          VPM_MINIPASS_PACKAGE: cwd + "/node_modules/vminipass",
        }),
      );
    }
    const types = fs
      .readFileSync(root + "/packages/vminipass/test/types.ts", "utf8")
      .replace(/["']\.\.\/index\.cjs["']/, "'vminipass'");
    for (const ext of ["cts", "mts"])
      fs.writeFileSync(cwd + "/check." + ext, types);
    const platform = require("../platform-types.cjs"),
      config = platform.configuration([cwd + "/check.cts", cwd + "/check.mts"]);
    platform.clean(platform.compile(config));
    config.files = [cwd + "/check.mts"];
    config.compilerOptions.module = "ESNext";
    config.compilerOptions.moduleResolution = "Bundler";
    platform.clean(platform.compile(config));
  }
  console.log(
    "Fresh/frozen npm+Bun vminipass archives, CJS/ESM, Node/Bun unchanged callers and DOM-free TS7 consumers pass.",
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
