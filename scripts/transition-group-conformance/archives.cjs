"use strict";
require("./verify.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const repo = path.resolve(__dirname, "../.."),
  pkg = path.join(repo, "packages/vreact-transition-group");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-transition-archive-"));
function run(command, args, cwd = temp, env = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 3e6,
    env: {
      ...process.env,
      npm_config_cache: path.join(temp, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
      ...env,
    },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  run(
    "bun",
    ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
    pkg,
  );
  const archive = path.join(temp, "vreact-transition-group-4.4.5.tgz"),
    unpack = path.join(temp, "unpack");
  assert.doesNotMatch(
    run("tar", ["-tzf", archive]),
    /\/(?:test|bench|node_modules)\//,
  );
  fs.mkdirSync(unpack);
  run("tar", ["-xzf", archive, "-C", unpack]);
  for (const file of fs.readdirSync(path.join(unpack, "package")))
    assert.deepEqual(
      fs.readFileSync(path.join(unpack, "package", file)),
      fs.readFileSync(path.join(pkg, file)),
    );
  for (const version of ["19.1.0", "19.2.0"])
    for (const manager of ["npm", "bun"]) {
      const cwd = path.join(temp, manager + version);
      fs.mkdirSync(cwd);
      fs.writeFileSync(
        path.join(cwd, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies: {
            "vreact-transition-group": "file:" + archive,
            react: version,
            "react-dom": version,
            "@types/react": "19.1.16",
            "@types/react-dom": "19.1.9",
          },
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
      const lock = path.join(
          cwd,
          manager === "npm" ? "package-lock.json" : "bun.lock",
        ),
        before = fs.readFileSync(lock);
      run(
        manager,
        manager === "npm"
          ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
          : ["install", "--frozen-lockfile", "--ignore-scripts"],
        cwd,
      );
      assert.deepEqual(fs.readFileSync(lock), before);
      const entry = path.join(cwd, "node_modules/vreact-transition-group");
      for (const name of [
        "react-transition-group",
        "dom-helpers",
        "@babel/runtime",
        "prop-types",
      ])
        assert.equal(
          fs.existsSync(path.join(cwd, "node_modules", name)),
          false,
          name,
        );
      fs.writeFileSync(
        path.join(cwd, "consumer.mjs"),
        `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {Transition,CSSTransition,TransitionGroup} from 'vreact-transition-group';import Sub from 'vreact-transition-group/Transition';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';const c=createRequire(import.meta.url);assert.equal(Transition,c('vreact-transition-group').Transition);assert.equal(Sub,Transition);assert.equal(c('vreact-transition-group/CSSTransition'),CSSTransition);assert.equal(c('vreact-transition-group/TransitionGroup'),TransitionGroup);assert.equal(renderToStaticMarkup(React.createElement(Transition,{nodeRef:React.createRef(),in:true,timeout:0},phase=>React.createElement('span',null,phase))),'<span>entered</span>');`,
      );
      for (const runtime of ["node", "bun"]) {
        run(runtime, ["consumer.mjs"], cwd);
        for (const file of ["ssr.cjs", "run.cjs", "improvements.cjs"])
          console.log(
            run(runtime, [path.join(__dirname, file)], cwd, {
              VPM_TRANSITION_ENTRY: entry,
            }).trim(),
          );
      }
      fs.copyFileSync(
        path.join(__dirname, "public-types.tsx"),
        path.join(cwd, "consumer.tsx"),
      );
      fs.writeFileSync(
        path.join(cwd, "consumer.cts"),
        `import api = require('vreact-transition-group');import * as React from 'react';React.createElement(api.Transition,{nodeRef:React.createRef<HTMLDivElement>(),in:true},React.createElement('div'));`,
      );
      for (const mode of ["NodeNext", "Bundler"]) {
        fs.writeFileSync(
          path.join(cwd, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              strict: true,
              noEmit: true,
              target: "ES2022",
              jsx: "react-jsx",
              module: mode === "Bundler" ? "Preserve" : mode,
              moduleResolution: mode,
              lib: ["ES2022", "DOM"],
              types: ["react", "react-dom"],
            },
            files: ["consumer.tsx", "consumer.cts"],
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
      if (manager === "npm") {
        const mui = path.join(__dirname, "node_modules/@mui");
        fs.writeFileSync(
          path.join(cwd, "mui.tsx"),
          `import * as React from 'react';import Collapse from ${JSON.stringify(mui + "/material/Collapse")};import Fade from ${JSON.stringify(mui + "/material/Fade")};import {DateTimePicker} from ${JSON.stringify(mui + "/x-date-pickers/DateTimePicker")};export const navigation=<Collapse in timeout="auto" onEnter={node=>node.focus()}><button>Practice</button></Collapse>;export const picker=<DateTimePicker defaultValue={new Date()} reduceAnimations={false}/>;export const fade=<Fade in><div/></Fade>;`,
        );
        fs.writeFileSync(
          path.join(cwd, "mui.json"),
          JSON.stringify({
            compilerOptions: {
              strict: true,
              noEmit: true,
              target: "ES2022",
              jsx: "react-jsx",
              module: "Preserve",
              moduleResolution: "Bundler",
              lib: ["ES2022", "DOM"],
              types: ["react", "react-dom"],
              paths: {
                "react-transition-group": [entry + "/index.d.cts"],
                "react-transition-group/*": [entry + "/*.d.cts"],
              },
            },
            files: ["mui.tsx"],
          }),
        );
        run(
          "node",
          [require("../platform-types.cjs").compiler().path, "-p", "mui.json"],
          cwd,
        );
        run("bun", [path.join(__dirname, "build.cjs")], repo, {
          VPM_TRANSITION_ENTRY: entry,
          VPM_TRANSITION_CONSUMER: cwd,
        });
        console.log(
          run("node", [path.join(__dirname, "browser.cjs")], repo).trim(),
        );
      }
      console.log(
        manager,
        version,
        "exact bytes, fresh/frozen install, CJS/ESM and TS7 pass.",
      );
    }
  console.log(
    "Exact transition archive verified without upstream runtime dependencies.",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
