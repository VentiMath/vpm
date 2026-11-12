"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vi18next-archive-"));
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
      root + "/packages/vi18next",
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
      i18next: "file:" + path.join(scratch, pack.filename),
      vi18next: "file:" + path.join(scratch, pack.filename),
    };
    delete dependencies["i18next-app"];
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
    const check = `import assert from 'node:assert/strict';import {createRequire}from'node:module';import React from'react';import {renderToString}from'react-dom/server';import engine,{createInstance}from'i18next';import {I18nextProvider,useTranslation,initReactI18next}from'react-i18next';const require=createRequire(import.meta.url);assert.equal(require('i18next/package.json').name,'vi18next');assert.equal(require('vi18next/package.json').dependencies,undefined);const x=createInstance();await x.use(initReactI18next).init({lng:'en',resources:{en:{translation:{title:'Contest archive',count_other:'{{count}} problems'}}}});function View(){const{t}=useTranslation();return React.createElement('p',null,t('title'),': ',t('count',{count:2}));}assert.equal(renderToString(React.createElement(I18nextProvider,{i18n:x},React.createElement(View))),'<p>Contest archive<!-- -->: <!-- -->2 problems</p>');await x.changeLanguage('ar');assert.equal(x.dir(),'rtl');assert.equal(typeof engine.t,'function');console.log('packed engine exports and unchanged React SSR pass');`;
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
