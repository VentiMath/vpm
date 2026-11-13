"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vmui-utils-archives-"));
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
  for (const name of ["vclsx", "vmui-utils"]) {
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
          "vmui-utils":
            "file:" + scratch + "/" + packs.get("vmui-utils").filename,
          react: "19.3.1",
          "react-dom": "19.3.1",
          "@types/react": "19.2.2",
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
        fs.readFileSync(dir + "/node_modules/vmui-utils/" + file, "utf8"),
        fs.readFileSync(root + "/packages/vmui-utils/" + file, "utf8"),
      );
    fs.writeFileSync(
      dir + "/check.mjs",
      `import assert from'node:assert/strict';import{createRequire}from'node:module';import React from'react';import{renderToString}from'react-dom/server';import{deepmerge,unstable_useControlled,unstable_useEventCallback}from'vmui-utils';import merge from'vmui-utils/deepmerge';const require=createRequire(import.meta.url);assert.equal(require('vmui-utils').deepmerge,deepmerge);assert.equal(merge,deepmerge);assert.deepEqual(merge({a:{b:1}},{a:{c:2}}),{a:{b:1,c:2}});function View(){const[value]=unstable_useControlled({controlled:undefined,default:'Math',name:'View'});const read=unstable_useEventCallback(()=>value);return React.createElement('p',null,read());}assert.equal(renderToString(React.createElement(View)),'<p>Math</p>');for(const name of Object.keys(require('vmui-utils/package.json').exports)){if(name==='.'||name==='./package.json')continue;const id='vmui-utils/'+name.slice(2);const c=require(id),m=await import(id);if(c.default)assert.equal(m.default,c.default,id);else for(const key of Object.keys(c))assert.equal(m[key],c[key],id+':'+key);}for(const name of ['@mui/utils','@babel/runtime','prop-types','react-is'])assert.throws(()=>require.resolve(name));console.log('packed MUI utility hooks, every subpath, CJS/ESM identity and pinned closure pass');`,
    );
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(
        __dirname + "/archive-consumer." + ext,
        dir + "/consumer." + ext,
      );
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
