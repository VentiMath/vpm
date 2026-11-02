"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-sidecar-archive-"));
function run(cmd, args, cwd = temp) {
  const p = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 120000 });
  assert.equal(p.status, 0, p.stdout + p.stderr);
  return p.stdout;
}
try {
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    path.join(root, "packages/vuse-sidecar"),
  );
  const archive = path.join(
    temp,
    "vuse-sidecar-" +
      require(path.join(root, "packages/vuse-sidecar/package.json")).version +
      ".tgz",
  );
  for (const file of [
    "README.md",
    "LICENSE",
    "PROVENANCE.json",
    "index.cjs",
    "index.mjs",
    "index.d.ts",
    "medium.cjs",
    "env.cjs",
  ])
    assert.ok(
      run("tar", ["-tzf", archive]).includes("package/" + file),
      "archive missing " + file,
    );
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(test|bench|node_modules)\//,
  );
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        dependencies: {
          "vuse-sidecar": "file:" + archive,
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
    const source =
      "const React=require('react'),{renderToString}=require('react-dom/server'),api=require('vuse-sidecar');let imports=0;const Lazy=api.sidecar(()=>{imports++;throw Error('SSR import')});const medium=api.createMedium('fallback');medium.useMedium('ready');if(medium.read()!=='ready')throw Error('medium');if(renderToString(React.createElement(Lazy,{sideCar:null}))!==''||imports)throw Error('SSR must not load');const Bridge=api.renderCar(()=>null,()=>[3]);if(renderToString(React.createElement(Bridge,null,value=>React.createElement('span',null,value)))!=='<span>3</span>')throw Error('SSR renderCar');";
    fs.writeFileSync(path.join(cwd, "consumer.cjs"), source);
    fs.writeFileSync(
      path.join(cwd, "consumer.mjs"),
      "import {createRequire} from 'node:module';import * as sidecarApi from 'vuse-sidecar';const require=createRequire(import.meta.url);for(const key of Object.keys(sidecarApi))if(sidecarApi[key]!==require('vuse-sidecar')[key])throw Error('identity '+key);" +
        source,
    );
    for (const runtime of ["node", "bun"])
      for (const file of ["consumer.cjs", "consumer.mjs"])
        run(runtime, [file], cwd);
    fs.writeFileSync(
      path.join(cwd, "browser.mjs"),
      "import {createMedium,createSidecarMedium,exportSidecar} from 'vuse-sidecar';const m=createMedium(),drop=m.useMedium(7);m.useMedium(7);drop();if(m.read()!==7)throw Error('registration');const side=createSidecarMedium();const C=()=>null;exportSidecar(side,C);if(side.read()!==C)throw Error('sidecar');",
    );
    const bundle = require("esbuild").buildSync({
      entryPoints: [path.join(cwd, "browser.mjs")],
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      metafile: true,
      define: { "process.env.NODE_ENV": '"production"' },
    });
    vm.runInNewContext(bundle.outputFiles[0].text, {});
    assert.ok(
      !Object.keys(bundle.metafile.inputs).some((name) =>
        /node_modules\/(?:tslib|detect-node-es|use-sidecar)\//.test(name),
      ),
      "browser loads no upstream runtime",
    );
    fs.copyFileSync(
      path.join(__dirname, "consumer.tsx"),
      path.join(cwd, "consumer.tsx"),
    );
    // JSX is compiled in a TSX consumer; CJS/ESM runtime identity is checked above.
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
    "Packed sidecar: npm/Bun installs, Node/Bun CJS/ESM identity and SSR, standalone browser bundle and strict TS7 JSX consumers pass.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
