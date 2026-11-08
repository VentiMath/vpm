"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-react-virtual-archives-"));
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 2e6,
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
  const packages = {};
  for (const name of ["vtanstack-virtual-core", "vtanstack-react-virtual"]) {
    const source = path.join(root, "packages", name),
      meta = require(path.join(source, "package.json"));
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
      source,
    );
    const archive = path.join(temp, name + "-" + meta.version + ".tgz");
    assert.doesNotMatch(
      run("tar", ["-tzf", archive]),
      /\/(?:test|bench|node_modules)\//,
    );
    const unpack = path.join(temp, name);
    fs.mkdirSync(unpack);
    run("tar", ["-xzf", archive, "-C", unpack]);
    const packed = path.join(unpack, "package"),
      files = fs.readdirSync(packed).sort();
    for (const file of files) {
      if (file === "package.json") {
        const expected = structuredClone(meta);
        if (expected.dependencies?.["vtanstack-virtual-core"])
          expected.dependencies["vtanstack-virtual-core"] = "3.19.11";
        assert.deepEqual(
          JSON.parse(fs.readFileSync(path.join(packed, file))),
          expected,
        );
      } else
        assert.deepEqual(
          fs.readFileSync(path.join(packed, file)),
          fs.readFileSync(path.join(source, file)),
          file,
        );
    }
    packages[name] = { archive, packed, files };
  }
  for (const version of ["19.1.0", "19.2.0"])
    for (const manager of ["npm", "bun"]) {
      const cwd = path.join(temp, manager + "-" + version);
      fs.mkdirSync(cwd);
      fs.writeFileSync(
        path.join(cwd, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies: {
            "@tanstack/react-virtual":
              "file:" + packages["vtanstack-react-virtual"].archive,
            "vtanstack-virtual-core":
              "file:" + packages["vtanstack-virtual-core"].archive,
            react: version,
            "react-dom": version,
            "@types/react": "19.1.16",
            "@types/react-dom": "19.1.9",
          },
          overrides: {
            "vtanstack-virtual-core":
              "file:" + packages["vtanstack-virtual-core"].archive,
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
      fs.rmSync(path.join(cwd, "node_modules"), { recursive: true });
      run(
        manager,
        manager === "npm"
          ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
          : ["install", "--frozen-lockfile", "--ignore-scripts"],
        cwd,
      );
      assert.deepEqual(fs.readFileSync(lock), before);
      const entries = {};
      for (const [name, { packed, files }] of Object.entries(packages)) {
        const entry = path.join(
          cwd,
          "node_modules",
          name === "vtanstack-react-virtual" ? "@tanstack/react-virtual" : name,
        );
        entries[name] = entry;
        assert.deepEqual(
          fs
            .readdirSync(entry)
            .filter((file) => !(manager === "bun" && file === ".bun-tag"))
            .sort(),
          files,
        );
        for (const file of files)
          assert.deepEqual(
            fs.readFileSync(path.join(entry, file)),
            fs.readFileSync(path.join(packed, file)),
            file,
          );
      }
      assert.equal(
        fs.existsSync(path.join(cwd, "node_modules/@tanstack/virtual-core")),
        false,
      );
      const env = {
        VPM_REACT_CONSUMER: cwd,
        VPM_REACT_VIRTUAL_ENTRY: entries["vtanstack-react-virtual"],
        VPM_VIRTUAL_ENTRY: entries["vtanstack-virtual-core"],
      };
      fs.writeFileSync(
        path.join(cwd, "consumer.mjs"),
        `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import React from 'react';import {renderToString} from 'react-dom/server';import * as api from '@tanstack/react-virtual';import {Virtualizer} from 'vtanstack-virtual-core';const c=createRequire(import.meta.url);assert.equal(api.useVirtualizer,c('@tanstack/react-virtual').useVirtualizer);assert.equal(api.Virtualizer,Virtualizer);function View(){const v=api.useVirtualizer({count:3,estimateSize:()=>20,getScrollElement:()=>null,initialRect:{width:100,height:100}});return React.createElement('p',null,v.getVirtualItems().length);}assert.equal(renderToString(React.createElement(View)),'<p>3</p>');`,
      );
      for (const runtime of ["node", "bun"]) {
        run(runtime, ["consumer.mjs"], cwd);
        run(runtime, [path.join(__dirname, "ssr.cjs")], cwd, env);
      }
      const types = fs
        .readFileSync(path.join(__dirname, "types.ts"), "utf8")
        .replaceAll("vtanstack-react-virtual", "@tanstack/react-virtual");
      for (const ext of ["mts", "cts"])
        fs.writeFileSync(path.join(cwd, "consumer." + ext), types);
      for (const mode of ["NodeNext", "Bundler"]) {
        fs.writeFileSync(
          path.join(cwd, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              strict: true,
              noEmit: true,
              target: "ES2022",
              lib: ["ES2022", "DOM", "DOM.Iterable"],
              types: [],
              module: mode === "Bundler" ? "Preserve" : mode,
              moduleResolution: mode,
            },
            files: ["consumer.mts", "consumer.cts"],
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
        run("bun", [path.join(__dirname, "build.cjs")], root, env);
        console.log(
          run("node", [path.join(__dirname, "browser.cjs")], root).trim(),
        );
      }
      console.log(
        manager +
          " React " +
          version +
          ": exact archive bytes, fresh/frozen install, CJS/ESM, Node/Bun SSR and TS7 pass.",
      );
    }
  console.log("React virtualizer two-package closure verified.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
