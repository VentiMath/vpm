"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(
    path.join(os.tmpdir(), "vvite-tsconfig-paths-archives-"),
  );
const run = (bin, args, cwd = scratch) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    env: {
      ...process.env,
      npm_config_cache: path.join(os.tmpdir(), "vpm-npm-cache"),
      BUN_INSTALL_CACHE_DIR: scratch + "/bun-cache",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const packs = new Map();
  for (const name of ["vtsconfck", "vvite-tsconfig-paths"]) {
    const stage = scratch + "/" + name;
    fs.cpSync(root + "/packages/" + name, stage, {
      recursive: true,
      filter: (p) =>
        !p.includes("node_modules") &&
        !p.includes("/bench") &&
        !p.includes("/test"),
    });
    const metadata = JSON.parse(fs.readFileSync(stage + "/package.json"));
    for (const dependency of Object.keys(metadata.dependencies || {})) {
      assert.ok(
        packs.has(dependency),
        "Unpinned internal dependency " + dependency,
      );
      metadata.dependencies[dependency] =
        "file:" + scratch + "/" + packs.get(dependency).filename;
    }
    fs.writeFileSync(stage + "/package.json", JSON.stringify(metadata));
    const packed = JSON.parse(
      run("npm", ["pack", stage, "--ignore-scripts", "--json"]),
    )[0];
    assert.ok(
      packed.files.every((f) => !/^test\/|^bench\/|node_modules/.test(f.path)),
    );
    packs.set(name, packed);
  }
  for (const manager of ["npm", "bun"]) {
    const dir = scratch + "/" + manager;
    fs.mkdirSync(dir);
    fs.writeFileSync(
      dir + "/package.json",
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: {
          "vvite-tsconfig-paths":
            "file:" +
            scratch +
            "/" +
            packs.get("vvite-tsconfig-paths").filename,
        },
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
    for (const file of ["index.cjs", "index.mjs", "index.d.cts", "index.d.mts"])
      assert.equal(
        fs.readFileSync(
          dir + "/node_modules/vvite-tsconfig-paths/" + file,
          "utf8",
        ),
        fs.readFileSync(
          root + "/packages/vvite-tsconfig-paths/" + file,
          "utf8",
        ),
      );
    fs.writeFileSync(
      dir + "/check.mjs",
      `import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';import plugin from'vvite-tsconfig-paths';const require=createRequire(import.meta.url);assert.equal(require('vvite-tsconfig-paths'),plugin);fs.writeFileSync('tsconfig.json',JSON.stringify({compilerOptions:{paths:{'@/*':['src/*']}}}));const p=plugin({parseNative:false});await p.configResolved({root:process.cwd(),logger:{warn(){}}});const value=await p.resolveId.call({resolve:async id=>({id})},'@/contest',path.resolve('src/a.ts'),{});assert.equal(value,path.resolve('src/contest'));p.closeBundle();for(const name of ['globrex','debug','tsconfck'])assert.throws(()=>require.resolve(name));console.log('packed alias resolution, CJS/ESM and pinned reader closure pass');`,
    );
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(__dirname + "/consumer." + ext, dir + "/consumer." + ext);
    process.stdout.write(run("node", [__dirname + "/types.cjs", dir], dir));
  }
  console.log(
    JSON.stringify(
      [...packs].map(([name, p]) => ({
        name,
        packed: p.size,
        unpacked: p.unpackedSize,
      })),
    ),
  );
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
