"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vstyle-consumer-"));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const archives = {};
  for (const name of ["vget-nonce", "vreact-style-singleton"]) {
    const dir = path.join(root, "packages", name),
      version = require(path.join(dir, "package.json")).version;
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      dir,
    );
    archives[name] = "file:" + path.join(temp, `${name}-${version}.tgz`);
    assert.doesNotMatch(
      run("tar", ["-tzf", archives[name].slice(5)]),
      /\/(node_modules|bench|test)\//,
    );
  }
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        overrides: {"vget-nonce": archives["vget-nonce"]},
        dependencies: {
          ...archives,
          react: "19.1.0",
          "react-dom": "19.1.0",
          "@types/react": "19.2.10",
          "@types/react-dom": "19.2.3",
        },
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
      cwd,
    );
    fs.writeFileSync(
      path.join(cwd, "test.mjs"),
      "import * as api from 'vreact-style-singleton';import {createRequire} from 'node:module';const require=createRequire(import.meta.url), c=require('vreact-style-singleton');for(const k of Object.keys(api))if(api[k]!==c[k])throw Error('identity');const React=require('react'),{renderToString}=require('react-dom/server');if(renderToString(React.createElement(api.styleSingleton(),{styles:'a{}'}))!=='')throw Error('SSR');api.stylesheetSingleton().add('a{}');",
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["test.mjs"], cwd);
    fs.writeFileSync(
      path.join(cwd, "browser.mjs"),
      "import {stylesheetSingleton} from 'vreact-style-singleton';import {setNonce} from 'vget-nonce';setNonce('packed');const sheet=stylesheetSingleton();sheet.add('body{}');globalThis.observed=[document.head.childElementCount,document.head.firstChild.nonce];sheet.remove();observed.push(document.head.childElementCount);",
    );
    const { createRequire } = require("node:module"),
      from = createRequire(
        path.join(root, "scripts/sidecar-conformance/package.json"),
      );
    const result = from("esbuild").buildSync({
      entryPoints: [path.join(cwd, "browser.mjs")],
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      metafile: true,
      define: { "process.env.NODE_ENV": '"production"' },
    });
    assert(
      !Object.keys(result.metafile.inputs).some((name) =>
        /node_modules\/(tslib|react-style-singleton|get-nonce)\//.test(name),
      ),
    );
    const dom = new (from("jsdom").JSDOM)("<!doctype html><head></head>"),
      ctx = { document: dom.window.document };
    vm.runInNewContext(result.outputFiles[0].text, ctx);
    assert.deepEqual(Array.from(ctx.observed), [1, "packed", 0]);
    dom.window.close();
    fs.writeFileSync(
      path.join(cwd, "consumer.tsx"),
      "import {styleSingleton,styleHookSingleton,stylesheetSingleton} from 'vreact-style-singleton';const Style=styleSingleton();const node=<Style styles='a{}' dynamic/>;const useStyle=styleHookSingleton();function Hook(){useStyle('a{}',true);return null;}const sheet=stylesheetSingleton();sheet.add('a{}');sheet.remove();\n// @ts-expect-error CSS must be a string\nsheet.add(3);\n// @ts-expect-error dynamic must be boolean\nconst invalid=<Style styles='a{}' dynamic='yes'/>;\n",
    );
    for (const mode of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            lib: ["ES2022", "DOM"],
            types: [],
            jsx: "react-jsx",
            module: mode === "Bundler" ? "ESNext" : mode,
            moduleResolution: mode,
          },
          files: ["consumer.tsx"],
        }),
      );
      run(
        "node",
        [
          require("../platform-types.cjs").compiler().path,
          "-p",
          "tsconfig.json",
        ],
        cwd,
      );
    }
  }
  console.log(
    "Clean npm/Bun archives, CJS/ESM identity, Node/Bun SSR, nonce-aware browser bundles and TS7 consumers pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
