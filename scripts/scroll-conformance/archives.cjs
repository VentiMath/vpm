"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vscroll-consumer-"));
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
    "vuse-callback-ref",
    "vuse-sidecar",
    "vreact-remove-scroll",
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
          "vreact-remove-scroll-bar": archives["vreact-remove-scroll-bar"],
          "vuse-callback-ref": archives["vuse-callback-ref"],
          "vuse-sidecar": archives["vuse-sidecar"],
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
      "import * as api from 'vreact-remove-scroll';import {RemoveScroll as UI} from 'vreact-remove-scroll/UI';import Sidecar from 'vreact-remove-scroll/sidecar';import {createRequire} from 'node:module';const require=createRequire(import.meta.url),c=require('vreact-remove-scroll');if(api.RemoveScroll!==c.RemoveScroll||UI!==require('vreact-remove-scroll/UI').RemoveScroll||Sidecar!==require('vreact-remove-scroll/sidecar'))throw Error('identity');const React=require('react'),{renderToString}=require('react-dom/server');if(renderToString(React.createElement(api.RemoveScroll,null,'content'))!=='<div>content</div>')throw Error('SSR');",
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["test.mjs"], cwd);
    fs.writeFileSync(
      path.join(cwd, "browser.mjs"),
      "import React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {RemoveScroll} from 'vreact-remove-scroll';import {setNonce} from 'vget-nonce';setNonce('browser');const host=document.createElement('main');document.body.append(host);const view=createRoot(host);flushSync(()=>view.render(React.createElement(RemoveScroll,null,'content')));const event=new WheelEvent('wheel',{deltaY:10,bubbles:true,cancelable:true});document.body.dispatchEvent(event);globalThis.observed=[event.defaultPrevented,document.body.getAttribute('data-scroll-locked'),document.querySelector('style').nonce];flushSync(()=>view.unmount());observed.push(document.querySelectorAll('style').length);const after=new WheelEvent('wheel',{deltaY:10,bubbles:true,cancelable:true});document.body.dispatchEvent(after);observed.push(after.defaultPrevented);",
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
        /node_modules\/(tslib|react-remove-scroll|react-remove-scroll-bar|react-style-singleton|get-nonce|use-sidecar|use-callback-ref)\//.test(
          name,
        ),
      ),
    );
    const dom = new (from("jsdom").JSDOM)(
      "<!doctype html><html><head></head><body></body></html>",
      { runScripts: "outside-only" },
    );
    vm.runInContext(result.outputFiles[0].text, dom.getInternalVMContext());
    assert.deepEqual(Array.from(dom.window.observed), [
      true,
      "1",
      "browser",
      0,
      false,
    ]);
    dom.window.close();
    fs.writeFileSync(
      path.join(cwd, "consumer.tsx"),
      "import {createRef} from 'react';import {RemoveScroll} from 'vreact-remove-scroll';import {RemoveScroll as UI} from 'vreact-remove-scroll/UI';import Sidecar from 'vreact-remove-scroll/sidecar';const ref=createRef<HTMLElement>();const node=<RemoveScroll ref={ref} gapMode='padding' allowPinchZoom shards={[ref]}><div/></RemoveScroll>;const ui=<UI sideCar={Sidecar} forwardProps><article/></UI>;const name:string=RemoveScroll.classNames.zeroRight;\n// @ts-expect-error forwarding requires an element\nconst invalid=<RemoveScroll forwardProps>text</RemoveScroll>;\n",
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
    "Clean npm/Bun archives, CJS/ESM identity, Node/Bun SSR, scroll-lock browser bundles and TS7 consumers pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
