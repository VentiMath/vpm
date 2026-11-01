"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "vpm-react-interactions-archives-"),
  );
function run(command, args, cwd = temp) {
  const r = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const dependencies = {};
  for (const name of [
    "vfloating-ui-react",
    "vtabbable",
    "vfloating-ui-utils",
    "vfloating-ui-core",
    "vfloating-ui-dom",
    "vfloating-ui-react-dom",
    "react",
    "react-dom",
    "scheduler",
    "@types/react",
    "@types/react-dom",
    "csstype",
    "@floating-ui/react-dom",
    "@floating-ui/dom",
    "@floating-ui/core",
    "@floating-ui/utils",
  ]) {
    const dir = path.join(
        name.startsWith("v") ? root + "/packages" : __dirname + "/node_modules",
        name,
      ),
      meta = JSON.parse(fs.readFileSync(path.join(dir, "package.json")));
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      dir,
    );
    dependencies[name] =
      "file:" +
      path.join(
        temp,
        name.replace("@", "").replace("/", "-") + "-" + meta.version + ".tgz",
      );
    if (name.startsWith("v"))
      assert.doesNotMatch(
        run("tar", ["-tzf", dependencies[name].slice(5)]),
        /\/(test|bench|node_modules)\//,
      );
  }
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(temp, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ private: true, dependencies, overrides: dependencies }),
    );
    run(
      manager,
      [
        "install",
        "--ignore-scripts",
        ...(manager === "npm"
          ? [
              "--offline",
              "--no-audit",
              "--no-fund",
              "--cache",
              path.join(temp, "cache"),
            ]
          : []),
      ],
      dir,
    );
    fs.writeFileSync(
      path.join(dir, "consumer.cjs"),
      `const assert=require('node:assert/strict'),React=require('react'),{renderToString}=require('react-dom/server'),api=require('vfloating-ui-react');function App(){const f=api.useFloating({middleware:[api.offset(4)]});return React.createElement('div',{style:f.floatingStyles},f.placement);}assert.match(renderToString(React.createElement(App)),/bottom/);`,
    );
    fs.writeFileSync(
      path.join(dir, "consumer.mjs"),
      `import assert from 'node:assert/strict';import {useFloating} from 'vfloating-ui-react';import {createRequire} from 'node:module';assert.equal(useFloating,createRequire(import.meta.url)('vfloating-ui-react').useFloating);`,
    );
    for (const runtime of ["node", "bun"])
      for (const file of ["consumer.cjs", "consumer.mjs"])
        run(runtime, [file], dir);
    fs.writeFileSync(
      path.join(dir, "browser.mjs"),
      `import {useFloating,arrow} from 'vfloating-ui-react';globalThis.reactDOMBrowser={useFloating,arrow};`,
    );
    run(
      "bun",
      [
        "build",
        "browser.mjs",
        "--target",
        "browser",
        "--format",
        "esm",
        "--outfile",
        "browser.bundle.mjs",
      ],
      dir,
    );
    for (const ext of ["cts", "mts"])
      fs.writeFileSync(
        path.join(dir, "types." + ext),
        fs.readFileSync(path.join(__dirname, "consumer.tsx"), "utf8"),
      );
    for (const mode of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(dir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            types: [],
            jsx: "react-jsx",
            module: mode === "Bundler" ? "ESNext" : "NodeNext",
            moduleResolution: mode,
          },
          files: ["types.cts", "types.mts"],
        }),
      );
      run(
        "node",
        [
          require("../platform-types.cjs").compiler().path,
          "-p",
          "tsconfig.json",
        ],
        dir,
      );
    }
  }
  console.log(
    "Packed React interactions + DOM/core/utils: npm/Bun, CJS/ESM, SSR, browser bundle and TypeScript 7 consumers pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
