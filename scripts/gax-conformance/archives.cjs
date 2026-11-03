"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vgax-packed-"));
function run(cmd, args, cwd = temp) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 6e6,
    env: {
      ...process.env,
      npm_config_cache: path.join(temp, "cache"),
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
    },
  });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-12000));
  return r.stdout;
}
try {
  const names = new Set(),
    dependencies = {};
  function visit(name) {
    if (names.has(name)) return;
    names.add(name);
    for (const n of Object.keys(
      require(path.join(root, "packages", name, "package.json")).dependencies ??
        {},
    )) {
      assert(n.startsWith("v"));
      visit(n);
    }
  }
  visit("vgoogle-gax");
  for (const name of names) {
    const p = require(path.join(root, "packages", name, "package.json"));
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      path.join(root, "packages", name),
    );
    dependencies[name] =
      "file:" + path.join(temp, name + "-" + p.version + ".tgz");
  }
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies,
        overrides: dependencies,
      }),
    );
    run(
      manager,
      [
        "install",
        "--ignore-scripts",
        ...(manager === "npm" ? ["--offline", "--no-audit", "--no-fund"] : []),
      ],
      cwd,
    );
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      "import assert from 'node:assert/strict';import {GrpcClient,createApiCall,CallSettings,PathTemplate,protobuf} from 'vgoogle-gax';import * as fallback from 'vgoogle-gax/fallback';import {createRequire} from 'node:module';const from=createRequire(import.meta.url),c=from('vgoogle-gax');assert.equal(c.GrpcClient,GrpcClient);assert.equal(c.createApiCall,createApiCall);assert.equal(c.fallback.GrpcClient,fallback.GrpcClient);const call=createApiCall((r,m,o,cb)=>{cb(null,42);return {cancel(){}}},new CallSettings({retry:null}));assert.equal((await call({}))[0],42);assert.equal(new PathTemplate('p/{x}').render({x:'a'}),'p/a');assert(protobuf.Root);assert(!Object.keys(from.cache).some(p=>p.includes('/vgoogle-gax/build/src/')&&!p.endsWith('/jsonProtoCache.js')));",
    );
    for (const runtime of ["node", "bun"]) run(runtime, ["consumer.mjs"], cwd);
    fs.writeFileSync(
      path.join(cwd, "consumer.ts"),
      "import {GrpcClient,PathTemplate,CallSettings,createApiCall,GoogleError,Status,type CallOptions} from 'vgoogle-gax';import {GrpcClient as Rest} from 'vgoogle-gax/fallback';const c=new GrpcClient({projectId:'fixture'});new Rest({projectId:'fixture'});const opts:CallOptions={timeout:200,retry:null};const settings=new CallSettings(opts);createApiCall(()=>({cancel(){}}),settings);new PathTemplate('p/{p}').render({p:'a'});const e=new GoogleError('x');e.code=Status.UNAVAILABLE;void c;\n// @ts-expect-error timeout must be a number\nconst bad:CallOptions={timeout:'x'};void bad;\nimport {CallSettings as SettingsOnly} from 'vgoogle-gax/gax';new SettingsOnly();\n// @ts-expect-error the settings subpath does not export the transport\nimport {GrpcClient as Missing} from 'vgoogle-gax/gax';void Missing;",
    );
    for (const mode of ["NodeNext", "Bundler"]) {
      fs.writeFileSync(
        path.join(cwd, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2022",
            module: mode === "Bundler" ? "ESNext" : mode,
            moduleResolution: mode,
            lib: ["ES2022"],
            types: [],
          },
          files: ["consumer.ts"],
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
    names.size +
      " packed VPM packages: clean npm/Bun consumers, Node/Bun CJS/ESM identity, independent entry and DOM-free TS7 pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
