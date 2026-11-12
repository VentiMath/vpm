"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(
    path.join(os.tmpdir(), "vmui-private-theming-archive-"),
  );
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
      root + "/packages/vmui-private-theming",
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
    const dependencies = {
      react: "19.3.1",
      "react-dom": "19.3.1",
      "@types/react": "19.2.2",
      "vmui-private-theming": "file:" + path.join(scratch, pack.filename),
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
    const check = `import assert from'node:assert/strict';import{createRequire}from'node:module';import React from'react';import{renderToString}from'react-dom/server';import{ThemeProvider,useTheme}from'vmui-private-theming';import Provider from'vmui-private-theming/ThemeProvider';const require=createRequire(import.meta.url);assert.equal(ThemeProvider,Provider);assert.equal(require('vmui-private-theming').useTheme,useTheme);function View(){const t=useTheme();return React.createElement('p',null,t.color);}assert.equal(renderToString(React.createElement(ThemeProvider,{theme:{color:'blue'}},React.createElement(View))),'<p>blue</p>');assert.equal(require('vmui-private-theming/package.json').dependencies,undefined);console.log('packed theme context and CJS/ESM subpaths pass');`;
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
