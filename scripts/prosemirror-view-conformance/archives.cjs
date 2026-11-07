"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-view-model-"));
function run(cmd, args, cwd = temp, extra = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 5e6,
    env: {
      ...process.env,
      npm_config_cache: path.join(temp, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
      ...extra,
    },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const deps = {};
  for (const name of [
    "vorderedmap",
    "vprosemirror-model",
    "vprosemirror-transform",
    "vprosemirror-view",
  ]) {
    const source = path.join(root, "packages", name),
      meta = require(path.join(source, "package.json"));
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      source,
    );
    const archive = path.join(temp, name + "-" + meta.version + ".tgz");
    deps[name] = "file:" + archive;
    assert.doesNotMatch(
      run("tar", ["-tzf", archive]),
      /\/(test|bench|node_modules)\//,
    );
    const extracted = path.join(temp, name);
    fs.mkdirSync(extracted);
    run("tar", ["-xzf", archive, "-C", extracted]);
    for (const file of fs.readdirSync(path.join(extracted, "package")))
      assert.deepEqual(
        fs.readFileSync(path.join(extracted, "package", file)),
        fs.readFileSync(path.join(source, file)),
        file,
      );
  }
  for (const manager of ["npm", "bun"]) {
    const cwd = path.join(temp, manager);
    fs.mkdirSync(cwd);
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: { ...deps, "prosemirror-view": "1.42.9" },
        overrides: deps,
      }),
    );
    run(
      manager,
      [
        "install",
        "--ignore-scripts",
        ...(manager === "npm" ? ["--no-audit", "--no-fund"] : []),
      ],
      cwd,
    );
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--frozen-lockfile", "--ignore-scripts"],
      cwd,
    );
    fs.writeFileSync(
      path.join(cwd, "check.cjs"),
      `const assert=require('node:assert/strict');const {Decoration,DecorationSet}=require('vprosemirror-view/decorations');const {Schema}=require('vprosemirror-model');const {Transform}=require('vprosemirror-transform');const s=new Schema({nodes:{doc:{content:'paragraph+'},paragraph:{content:'text*'},text:{}}});const doc=s.node('doc',null,[s.node('paragraph',null,s.text('abcd'))]);const set=DecorationSet.create(doc,[Decoration.inline(1,3,{class:'selection'})]);const tr=new Transform(doc).insert(1,s.text('!'));assert.equal(set.map(tr.mapping,tr.doc).find()[0].from,2);assert.throws(()=>require('vprosemirror-view'),e=>['ERR_PACKAGE_PATH_NOT_EXPORTED','MODULE_NOT_FOUND'].includes(e.code));import('vprosemirror-view/decorations').then(m=>{assert.equal(m.Decoration,Decoration);assert.equal(m.DecorationSet,DecorationSet);console.log('module identity, mapping and root export boundary pass');});`,
    );
    for (const runtime of ["node", "bun"])
      console.log(manager + ": " + run(runtime, ["check.cjs"], cwd).trim());
    fs.copyFileSync(
      path.join(__dirname, "types.ts"),
      path.join(cwd, "types.ts"),
    );
    fs.copyFileSync(
      path.join(__dirname, "types.ts"),
      path.join(cwd, "types.cts"),
    );
    for (const resolution of ["NodeNext", "Bundler"]) {
      const config = {
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: resolution === "NodeNext" ? "NodeNext" : "ESNext",
          moduleResolution: resolution,
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          types: [],
          skipLibCheck: false,
        },
        files: ["types.ts", "types.cts"],
      };
      fs.writeFileSync(path.join(cwd, "tsconfig.json"), JSON.stringify(config));
      run(
        "node",
        [
          require("../platform-types.cjs").compiler().path,
          "-p",
          path.join(cwd, "tsconfig.json"),
        ],
        cwd,
      );
    }
    // Repeat the unchanged upstream suite and contract with the archived runtime.
    run("bun", [path.join(__dirname, "build.cjs")], root, {
      VPM_VIEW_ENTRY: path.join(
        cwd,
        "node_modules/vprosemirror-view/decorations.cjs",
      ),
    });
    for (const runtime of ["node", "bun"]) {
      const results = JSON.parse(
        run(
          runtime,
          [
            path.join(
              __dirname,
              "node_modules/.vpm-view/vpm-webtest-decoration.ts.cjs",
            ),
          ],
          root,
        ),
      );
      assert.equal(
        results.filter((r) => !r.pass).length,
        0,
        JSON.stringify(results.filter((r) => !r.pass)),
      );
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(root, "packages/vprosemirror-view/test/contracts.test.cjs"),
        ],
        root,
      );
      run(
        runtime,
        [
          "-e",
          `require(${JSON.stringify(path.join(__dirname, "node_modules/.vpm-view/vpm-caller.cjs"))})`,
        ],
        root,
      );
    }
    console.log(
      manager +
        ": exact archives, fresh/frozen install, Node/Bun, CJS/ESM, TS7 NodeNext/Bundler and decoration contracts pass.",
    );
  }
} finally {
  if (!process.env.KEEP_VPM_ARCHIVES)
    fs.rmSync(temp, { recursive: true, force: true });
}
