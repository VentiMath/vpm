"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-hoist-archive-"));
function run(command, args, cwd = temp) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
try {
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    path.join(root, "packages/vhoist-non-react-statics"),
  );
  const archive = path.join(temp, "vhoist-non-react-statics-3.3.2.tgz");
  const entries = run("tar", ["-tzf", archive]);
  assert.doesNotMatch(entries, /\/(test|bench|node_modules)\//);
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(temp, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        private: true,
        dependencies: { "vhoist-non-react-statics": "file:" + archive },
      }),
    );
    run(
      manager,
      [
        "install",
        "--ignore-scripts",
        ...(manager === "npm"
          ? ["--no-audit", "--no-fund", "--cache", path.join(temp, "cache")]
          : []),
      ],
      dir,
    );
    fs.writeFileSync(
      path.join(dir, "consumer.cjs"),
      `const assert=require('node:assert/strict'),hoist=require('vhoist-non-react-statics');assert.equal(hoist({}, {custom:42}).custom,42);`,
    );
    fs.writeFileSync(
      path.join(dir, "consumer.mjs"),
      `import assert from 'node:assert/strict';import hoist from 'vhoist-non-react-statics';import {createRequire} from 'node:module';assert.equal(hoist,createRequire(import.meta.url)('vhoist-non-react-statics'));`,
    );
    for (const runtime of ["node", "bun"])
      for (const file of ["consumer.cjs", "consumer.mjs"])
        run(runtime, [file], dir);
    fs.writeFileSync(
      path.join(dir, "browser.mjs"),
      `import hoist from 'vhoist-non-react-statics';globalThis.hoistResult=hoist({}, {custom:42}).custom;`,
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
    fs.writeFileSync(
      path.join(dir, "browser-check.mjs"),
      `import './browser.bundle.mjs';import assert from 'node:assert/strict';assert.equal(globalThis.hoistResult,42);`,
    );
    run("node", ["browser-check.mjs"], dir);
    for (const extension of ["cts", "mts"])
      fs.writeFileSync(
        path.join(dir, "types." + extension),
        `import hoist from 'vhoist-non-react-statics';const key=Symbol();function Source(){}const source=Object.assign(Source,{extra:42,[key]:'value',skip:true,displayName:'Source'});const target=hoist({},source,{skip:true});const number:number=target.extra;const string:string=target[key];
// @ts-expect-error React-owned name is excluded
target.displayName;
// @ts-expect-error blacklist excludes this property
target.skip;
void [number,string];`,
      );
    fs.writeFileSync(
      path.join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2022",
          lib: ["ES2022"],
          types: [],
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
        files: ["types.cts", "types.mts"],
      }),
    );
    run(
      "node",
      [require("../platform-types.cjs").compiler().path, "-p", "tsconfig.json"],
      dir,
    );
    const config = JSON.parse(fs.readFileSync(path.join(dir, "tsconfig.json")));
    config.compilerOptions.module = "ESNext";
    config.compilerOptions.moduleResolution = "Bundler";
    fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify(config));
    run(
      "node",
      [require("../platform-types.cjs").compiler().path, "-p", "tsconfig.json"],
      dir,
    );
  }
  console.log(
    "vhoist-non-react-statics packed npm/Bun consumers: Node/Bun CJS/ESM and TypeScript 7 pass without platform types.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
