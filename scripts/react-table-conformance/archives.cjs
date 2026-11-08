"use strict";
require("./check-controls.cjs").check();
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-react-table-archives-"));
function run(cmd, args, cwd = temp, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 2e6,
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
  console.log(run("bun", [path.join(__dirname, "build.cjs")], root).trim());
  const packages = {};
  const releaseDir = process.env.VPM_TABLE_RELEASE_DIR;
  const manifest =
    releaseDir &&
    JSON.parse(fs.readFileSync(path.join(releaseDir, "release-manifest.json")));
  const published = process.env.VPM_TABLE_RELEASE_PUBLISHED === "1";
  for (const name of [
    "vtanstack-store",
    "vtanstack-table-core",
    "vtanstack-react-table",
  ]) {
    const source = path.join(root, "packages", name),
      meta = require(path.join(source, "package.json"));
    if (!releaseDir)
      run(
        "bun",
        ["pm", "pack", "--ignore-scripts", "--destination", temp, "--quiet"],
        source,
      );
    const item = manifest?.packages.find((p) => p.name === name);
    const archive = path.join(
        releaseDir || temp,
        name + "-" + meta.version + ".tgz",
      ),
      unpack = path.join(temp, name);
    fs.mkdirSync(unpack);
    run("tar", ["-xzf", archive, "-C", unpack]);
    assert.doesNotMatch(
      run("tar", ["-tzf", archive]),
      /\/(?:test|bench|node_modules)\//,
    );
    const packed = path.join(unpack, "package"),
      files = fs.readdirSync(packed).sort();
    for (const file of files) {
      if (file === "package.json") {
        const expected = structuredClone(meta);
        for (const name of Object.keys(expected.dependencies ?? {}))
          expected.dependencies[name] = item
            ? item.dependencies[name]
            : require(path.join(root, "packages", name, "package.json"))
                .version;
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
    packages[name] = { archive, packed, files, url: item?.url };
  }
  for (const version of ["19.1.0", "19.2.0"])
    for (const manager of ["npm", "bun"]) {
      const cwd = path.join(temp, manager + "-" + version);
      fs.mkdirSync(cwd);
      const deps = Object.fromEntries(
        Object.entries(packages).map(([name, p]) => [
          name === "vtanstack-react-table" ? "@tanstack/react-table" : name,
          published ? p.url : "file:" + p.archive,
        ]),
      );
      const extracted = releaseDir && !published && manager === "bun";
      const installDeps = extracted ? {} : deps;
      fs.writeFileSync(
        path.join(cwd, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies: {
            ...(published
              ? {
                  "@tanstack/react-table":
                    packages["vtanstack-react-table"].url,
                }
              : installDeps),
            react: version,
            "react-dom": version,
            "@types/react": "19.1.16",
            "@types/react-dom": "19.1.9",
          },
          ...(!published && !extracted
            ? {
                overrides: {
                  "vtanstack-table-core": deps["vtanstack-table-core"],
                  "vtanstack-store": deps["vtanstack-store"],
                },
              }
            : published
              ? {
                  overrides: {
                    "@tanstack/react-table":
                      packages["vtanstack-react-table"].url,
                  },
                }
              : {}),
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
      if (extracted)
        for (const [name, p] of Object.entries(packages)) {
          const dest = path.join(
            cwd,
            "node_modules",
            name === "vtanstack-react-table" ? "@tanstack/react-table" : name,
          );
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.cpSync(p.packed, dest, { recursive: true });
        }
      const entries = {};
      for (const [name, p] of Object.entries(packages)) {
        const entry = (entries[name] = path.join(
          cwd,
          "node_modules",
          name === "vtanstack-react-table" ? "@tanstack/react-table" : name,
        ));
        assert.deepEqual(
          fs
            .readdirSync(entry)
            .filter((f) => f !== ".bun-tag")
            .sort(),
          p.files,
        );
        for (const file of p.files)
          assert.deepEqual(
            fs.readFileSync(path.join(entry, file)),
            fs.readFileSync(path.join(p.packed, file)),
          );
      }
      for (const unused of [
        "@tanstack/table-core",
        "@tanstack/react-store",
        "@tanstack/store",
      ])
        assert.equal(
          fs.existsSync(path.join(cwd, "node_modules", unused)),
          false,
        );
      const env = {
        VPM_REACT_CONSUMER: cwd,
        VPM_REACT_TABLE_ENTRY: entries["vtanstack-react-table"],
        VPM_TABLE_ENTRY: entries["vtanstack-table-core"],
        VPM_STORE_ENTRY: entries["vtanstack-store"],
      };
      fs.writeFileSync(
        path.join(cwd, "consumer.mjs"),
        `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import React from 'react';import {renderToString} from 'react-dom/server';import * as api from '@tanstack/react-table';import {useLegacyTable} from '@tanstack/react-table/legacy';import {FlexRender} from '@tanstack/react-table/flex-render';const require=createRequire(import.meta.url);assert.equal(api.useTable,require('@tanstack/react-table').useTable);assert.equal(useLegacyTable,require('@tanstack/react-table/legacy').useLegacyTable);assert.equal(FlexRender,api.FlexRender);function View(){const t=api.useTable({data:[{n:2}],columns:[{accessorKey:'n'}]});return React.createElement(FlexRender,{cell:t.getRowModel().rows[0].getAllCells()[0]});}assert.equal(renderToString(React.createElement(View)),'2');`,
      );
      for (const runtime of ["node", "bun"]) {
        run(runtime, ["consumer.mjs"], cwd);
        console.log(
          run(runtime, [path.join(__dirname, "ssr.cjs")], root, env).trim(),
        );
      }
      const types = fs.readFileSync(
        path.join(__dirname, "archive-types.ts"),
        "utf8",
      );
      for (const ext of ["mts", "cts"])
        fs.writeFileSync(path.join(cwd, "consumer." + ext), types);
      for (const mode of ["NodeNext", "Bundler"]) {
        fs.writeFileSync(
          path.join(cwd, "tsconfig.json"),
          JSON.stringify({
            files: ["consumer.mts", "consumer.cts"],
            compilerOptions: {
              strict: true,
              noEmit: true,
              target: "es2022",
              lib: ["es2022", "dom"],
              types: [],
              module: mode === "Bundler" ? "Preserve" : mode,
              moduleResolution: mode,
            },
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
      console.log(
        run("node", [path.join(__dirname, "types.cjs")], root, env).trim(),
      );
      if (manager === "npm") {
        console.log(
          run("bun", [path.join(__dirname, "build.cjs")], root, env).trim(),
        );
        console.log(
          run("node", [path.join(__dirname, "browser.cjs")], root).trim(),
        );
      }
      console.log(
        manager +
          " React " +
          version +
          ": exact three-package closure, frozen reinstall, CJS/ESM, strict types and Node/Bun pass.",
      );
    }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
