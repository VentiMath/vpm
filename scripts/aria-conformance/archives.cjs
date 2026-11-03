"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "varia-archives-"));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    path.join(root, "packages/varia-hidden"),
  );
  const archive = path.join(temp, "varia-hidden-1.2.6.tgz");
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(node_modules|bench|test)\//,
  );
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        dependencies: { "varia-hidden": "file:" + archive },
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
      "import * as api from 'varia-hidden';import {createRequire} from 'node:module';const req=createRequire(import.meta.url),c=req('varia-hidden');for(const k of Object.keys(api))if(api[k]!==c[k])throw Error('identity');if(api.supportsInert())throw Error('SSR');api.hideOthers([])();api.inertOthers([])();api.suppressOthers([])();",
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["test.mjs"], cwd);
    fs.writeFileSync(
      path.join(cwd, "test.ts"),
      "import {hideOthers,inertOthers,suppressOthers,supportsInert,type Undo} from 'varia-hidden';const node=document.createElement('div');const nodes:readonly Element[]=[node];const undo:Undo=hideOthers(nodes);undo();inertOthers(node,document.body,'marker')();suppressOthers(nodes)();const inert:boolean=supportsInert();void inert;",
    );
    run(
      "node",
      [
        require("../platform-types.cjs").compiler().path,
        "--noEmit",
        "--strict",
        "--module",
        "NodeNext",
        "--target",
        "esnext",
        "test.ts",
      ],
      cwd,
    );
    const build = require("esbuild").buildSync({
      stdin: { contents: "export * from 'varia-hidden'", resolveDir: cwd },
      bundle: true,
      platform: "browser",
      format: "iife",
      globalName: "aria",
      write: false,
      metafile: true,
    });
    assert(
      Object.keys(build.metafile.inputs).every(
        (f) => !f.includes("/aria-hidden/") && !f.includes("/tslib/"),
      ),
    );
    const dom = new (require("jsdom").JSDOM)(
      "<body><main></main><aside></aside>",
      { runScripts: "outside-only" },
    );
    dom.window.eval(build.outputFiles[0].text);
    const api = dom.window.aria,
      d = dom.window.document,
      u = api.hideOthers(d.querySelector("main"));
    assert.equal(d.querySelector("aside").getAttribute("aria-hidden"), "true");
    u();
    assert(!d.querySelector("[aria-hidden]"));
    dom.window.close();
  }
  console.log(
    "Clean npm/Bun archives: CJS/ESM shared identity, Node/Bun server safety, TS7 readonly targets and browser bundle pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
