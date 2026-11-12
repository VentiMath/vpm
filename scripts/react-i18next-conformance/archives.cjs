"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vreact-i18next-archive-"));
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
  const enginePack = JSON.parse(
    run("npm", [
      "pack",
      root + "/packages/vi18next",
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  const stage = path.join(scratch, "wrapper");
  fs.cpSync(root + "/packages/vreact-i18next", stage, {
    recursive: true,
    filter: (source) => !source.includes("node_modules"),
  });
  const metadata = JSON.parse(fs.readFileSync(stage + "/package.json"));
  metadata.dependencies.vi18next =
    "file:" + path.join(scratch, enginePack.filename);
  fs.writeFileSync(stage + "/package.json", JSON.stringify(metadata));
  const pack = JSON.parse(
    run("npm", ["pack", stage, "--ignore-scripts", "--json"]),
  )[0];
  assert.ok(
    pack.files.every((f) => !/^test\/|^bench\/|node_modules/.test(f.path)),
  );
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    const dependencies = {
      react: "19.3.1",
      "react-dom": "19.3.1",
      "@types/react": "19.2.2",
      vi18next: "file:" + path.join(scratch, enginePack.filename),
      "vreact-i18next": "file:" + path.join(scratch, pack.filename),
      "react-i18next": "file:" + path.join(scratch, pack.filename),
    };
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
    for (const file of ["index.cjs", "index.mjs", "index.d.cts", "index.d.mts"])
      assert.equal(
        fs.readFileSync(dir + "/node_modules/vreact-i18next/" + file, "utf8"),
        fs.readFileSync(root + "/packages/vreact-i18next/" + file, "utf8"),
      );
    const check = `import assert from 'node:assert/strict';import {createRequire}from'node:module';import React from'react';import{renderToString}from'react-dom/server';import{createInstance}from'vi18next';import{I18nextProvider,useTranslation,initReactI18next}from'vreact-i18next';const require=createRequire(import.meta.url);assert.equal(require('react-i18next/package.json').name,'vreact-i18next');assert.equal(require('vreact-i18next').useTranslation,useTranslation);assert.deepEqual(Object.keys(require('vreact-i18next/package.json').dependencies),['vi18next']);const x=createInstance();await x.use(initReactI18next).init({lng:'en',resources:{en:{translation:{TITLE:'Contest archive'}}}});function View(){const{t}=useTranslation();return React.createElement('p',null,t('TITLE'));}assert.equal(renderToString(React.createElement(I18nextProvider,{i18n:x},React.createElement(View))),'<p>Contest archive</p>');console.log('packed hooks/provider and pinned VPM engine SSR pass');`;
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
