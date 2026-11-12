"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vdate-fns-archive-"));
const run = (bin, args, cwd = scratch) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    env: {
      ...process.env,
      npm_config_cache: path.join(os.tmpdir(), "vpm-npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(scratch, "bun-cache"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const pack = JSON.parse(
    run("npm", [
      "pack",
      root + "/packages/vdate-fns",
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  assert.ok(
    pack.files.every((f) => !/^test\/|^bench\/|node_modules/.test(f.path)),
  );
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    const fixture = require("./package.json").dependencies;
    const dependencies = {
      ...fixture,
      "date-fns": "file:" + path.join(scratch, pack.filename),
      "vdate-fns": "file:" + path.join(scratch, pack.filename),
    };
    delete dependencies["date-fns-app"];
    delete dependencies.esbuild;
    fs.writeFileSync(
      dir + "/package.json",
      JSON.stringify({ private: true, type: "module", dependencies }),
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
    const check = `import assert from 'node:assert/strict';import {createRequire}from'node:module';const require=createRequire(import.meta.url);const pkg=require('date-fns/package.json');assert.equal(pkg.name,'vdate-fns');assert.equal(pkg.dependencies,undefined);for(const [key]of Object.entries(pkg.exports)){if(key==='./package.json')continue;const name='date-fns'+(key==='.'?'':key.slice(1));const esm=await import(name),cjs=require(name);for(const k of Object.keys(cjs))assert.equal(typeof esm[k],typeof cjs[k]);}const {AdapterDateFns}=require('@mui/x-date-pickers/AdapterDateFns');const a=new AdapterDateFns();assert.equal(a.format(new Date(2026,10,12),'fullDate'),'Nov 12, 2026');assert.equal(a.parse('02/29/2024','P').getDate(),29);assert.equal(a.isValid(a.parse('02/30/2024','P')),false);console.log('packed exports and unchanged MUI adapter pass');`;
    fs.writeFileSync(dir + "/check.mjs", check);
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(__dirname + "/consumer." + ext, dir + "/consumer." + ext);
    process.stdout.write(run("node", [__dirname + "/types.cjs", dir], dir));
  }
  console.log(
    "npm/Bun clean and frozen installs: " +
      pack.size +
      " bytes packed, " +
      pack.unpackedSize +
      " bytes unpacked.",
  );
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
