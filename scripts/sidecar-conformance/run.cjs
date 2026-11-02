"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  modules = path.join(__dirname, "node_modules");
for (const [file, hash] of Object.entries(require("./upstream/SHA256.json")))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex"),
    hash,
    file,
  );
const ownModules = path.join(root, "packages/vuse-sidecar/node_modules");
fs.mkdirSync(ownModules, { recursive: true });
if (!fs.existsSync(path.join(ownModules, "react")))
  fs.symlinkSync(
    path.join(modules, "react"),
    path.join(ownModules, "react"),
    "dir",
  );
for (const variant of ["upstream", "vpm"]) {
  const temp = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpm-sidecar-tests-")),
  );
  try {
    fs.symlinkSync(modules, path.join(temp, "node_modules"), "dir");
    const alias = {
      subject:
        variant === "upstream"
          ? require.resolve("use-sidecar")
          : path.join(root, "packages/vuse-sidecar/index.cjs"),
      environment:
        variant === "upstream"
          ? path.join(modules, "use-sidecar/dist/es5/env.js")
          : path.join(root, "packages/vuse-sidecar/env.cjs"),
      enzyme: path.join(temp, "mount.tsx"),
      "enzyme-adapter-react-16": path.join(temp, "adapter.ts"),
      react: path.join(modules, "react"),
      "react-dom": path.join(modules, "react-dom"),
      caller: path.join(temp, "caller.cjs"),
    };
    const selected = alias.subject,
      environment = alias.environment;
    alias.subject = path.join(temp, "subject.ts");
    alias.environment = path.join(temp, "environment.ts");
    fs.writeFileSync(
      alias.subject,
      `import {createRequire} from 'node:module';const api=createRequire(import.meta.url)(${JSON.stringify(selected)});export const {sidecar,useSidecar,setConfig,createMedium,createSidecarMedium,renderCar,exportSidecar}=api;`,
    );
    fs.writeFileSync(
      alias.environment,
      `import {createRequire} from 'node:module';export const {env}=createRequire(import.meta.url)(${JSON.stringify(environment)});`,
    );
    require("esbuild").buildSync({
      entryPoints: [
        path.join(modules, "react-remove-scroll/dist/es2015/Combination.js"),
      ],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: alias.caller,
      external: ["react", "react-dom"],
      alias: { "use-sidecar": selected },
    });
    const callerBundle = alias.caller;
    alias.caller = path.join(temp, "caller.ts");
    fs.writeFileSync(
      alias.caller,
      `import {createRequire} from 'node:module';export const RemoveScroll=createRequire(import.meta.url)(${JSON.stringify(callerBundle)}).default;`,
    );
    fs.writeFileSync(
      path.join(temp, "config.cjs"),
      `module.exports={resolve:{alias:${JSON.stringify(alias)},dedupe:['react','react-dom']},esbuild:{jsx:'automatic'},test:{threads:false,globals:true,environment:'jsdom',setupFiles:['./setup.ts'],include:['*.test.tsx']}}`,
    );
    fs.writeFileSync(
      path.join(temp, "setup.ts"),
      "import {vi,afterEach} from 'vitest';import {cleanup} from '@testing-library/react';import {unmountAll} from './mount';globalThis.jest=vi;afterEach(()=>{cleanup();unmountAll()});",
    );
    fs.writeFileSync(
      path.join(temp, "adapter.ts"),
      "export default class Adapter {}",
    );
    fs.writeFileSync(
      path.join(temp, "mount.tsx"),
      `import * as React from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';const owned=[];export const configure=()=>{};export function mount(element){const host=document.createElement('div');document.body.append(host);let failure;const root=createRoot(host,{onUncaughtError:error=>{failure=error}});owned.push(()=>{flushSync(()=>root.unmount());host.remove()});flushSync(()=>root.render(element));if(failure)throw failure;const wrapper={html:()=>host.innerHTML||null,update:()=>{flushSync(()=>{});return wrapper},setProps:props=>{element=React.cloneElement(element,props);flushSync(()=>root.render(element));return wrapper}};return wrapper}export function unmountAll(){for(const close of owned.splice(0))close()}`,
    );
    for (const file of ["medium.ts", "sizecar.tsx", "renderProp.tsx"])
      fs.writeFileSync(
        path.join(temp, file + ".test.tsx"),
        fs
          .readFileSync(
            path.join(__dirname, "upstream/__tests__", file + ".txt"),
            "utf8",
          )
          .replaceAll("from '../src'", "from 'subject'")
          .replaceAll("from '../src/env'", "from 'environment'"),
      );
    if (fs.existsSync(path.join(__dirname, "scenarios.tsx.txt")))
      fs.copyFileSync(
        path.join(__dirname, "scenarios.tsx.txt"),
        path.join(temp, "scenarios.test.tsx"),
      );
    const report = path.join(temp, "report.json"),
      child = spawnSync(
        process.execPath,
        [
          path.join(modules, "vitest/vitest.mjs"),
          "run",
          "--root",
          temp,
          "--config",
          path.join(temp, "config.cjs"),
          "--reporter=json",
          "--outputFile=" + report,
        ],
        {
          encoding: "utf8",
          timeout: 60000,
          env: {
            ...process.env,
            VPM_ORIGINAL: variant === "upstream" ? "1" : "0",
          },
        },
      );
    if (!fs.existsSync(report)) throw Error(child.stdout + child.stderr);
    const data = JSON.parse(fs.readFileSync(report));
    console.log(
      `${variant}: ${data.numPassedTests}/${data.numTotalTests} pass`,
    );
    if (data.numFailedTests)
      for (const suite of data.testResults)
        for (const t of suite.assertionResults)
          if (t.status === "failed")
            console.error(t.fullName, t.failureMessages.join("\n"));
    assert.equal(child.status, 0, child.stderr.slice(-3000));
    assert.equal(data.numFailedTests, 0);
    assert(data.numTotalTests >= 14);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
