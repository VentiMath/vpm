"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vscrollbar-consumer-"));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const archives = {};
  for (const name of [
    "vget-nonce",
    "vreact-style-singleton",
    "vreact-remove-scroll-bar",
  ]) {
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
        overrides: {
          "vget-nonce": archives["vget-nonce"],
          "vreact-style-singleton": archives["vreact-style-singleton"],
        },
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
      "import * as api from 'vreact-remove-scroll-bar';import * as constants from 'vreact-remove-scroll-bar/constants';import {createRequire} from 'node:module';const require=createRequire(import.meta.url),c=require('vreact-remove-scroll-bar');for(const k of Object.keys(api))if(api[k]!==c[k])throw Error('identity');if(constants.zeroRightClassName!==api.zeroRightClassName)throw Error('constants');const React=require('react'),{renderToString}=require('react-dom/server');if(renderToString(React.createElement(api.RemoveScrollBar))!=='')throw Error('SSR');if(api.getGapWidth().gap!==0)throw Error('SSR gap');",
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["test.mjs"], cwd);
    fs.writeFileSync(
      path.join(cwd, "browser.mjs"),
      "import {getGapWidth,removedBarSizeVariable} from 'vreact-remove-scroll-bar';globalThis.observed=[getGapWidth().gap,removedBarSizeVariable];",
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
        /node_modules\/(tslib|react-remove-scroll-bar|react-style-singleton|get-nonce)\//.test(
          name,
        ),
      ),
    );
    const dom = new (from("jsdom").JSDOM)("<!doctype html><head></head>"),
      ctx = { document: dom.window.document, window: dom.window };
    vm.runInNewContext(result.outputFiles[0].text, ctx);
    assert.deepEqual(Array.from(ctx.observed), [
      1024,
      "--removed-body-scroll-bar-size",
    ]);
    dom.window.close();
    fs.writeFileSync(
      path.join(cwd, "consumer.tsx"),
      "import {RemoveScrollBar,getGapWidth,type GapOffset,type GapMode} from 'vreact-remove-scroll-bar';import {zeroRightClassName} from 'vreact-remove-scroll-bar/constants';const node=<RemoveScrollBar gapMode='padding' noRelative noImportant/>;const mode:GapMode='margin';const measured:GapOffset=getGapWidth(mode);const cls:string=zeroRightClassName;\n// @ts-expect-error unsupported gap mode\nconst invalid=<RemoveScrollBar gapMode='border'/>;\n",
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
    "Clean npm/Bun archives, CJS/ESM identity, Node/Bun SSR, scrollbar browser bundles and TS7 consumers pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
