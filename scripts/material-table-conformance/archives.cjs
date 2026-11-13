"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-material-archives-"));
const names = [
  "vmaterial-react-table",
  "vtanstack-react-table",
  "vtanstack-table-core",
  "vtanstack-store",
  "vtanstack-match-sorter-utils",
  "vhighlight-words",
];
function run(cmd, args, cwd = temp, env = {}) {
  const r = spawnSync(cmd, args, {
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
  if (r.error)
    throw new Error(cmd + ": " + r.error.message + "\n" + r.stdout + r.stderr, {
      cause: r.error,
    });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
try {
  const archives = {};
  const releaseDir = process.env.VPM_MATERIAL_RELEASE_DIR;
  const manifest =
    releaseDir &&
    JSON.parse(fs.readFileSync(path.join(releaseDir, "release-manifest.json")));
  const published = process.env.VPM_MATERIAL_RELEASE_PUBLISHED === "1";
  for (const name of names) {
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
      files = fs.readdirSync(packed);
    const expected = structuredClone(meta);
    for (const dep of Object.keys(expected.dependencies || {}))
      expected.dependencies[dep] = item
        ? item.dependencies[dep]
        : require(path.join(root, "packages", dep, "package.json")).version;
    for (const file of files) {
      if (file === "package.json")
        assert.deepEqual(
          JSON.parse(fs.readFileSync(path.join(packed, file))),
          expected,
        );
      else
        assert.deepEqual(
          fs.readFileSync(path.join(packed, file)),
          fs.readFileSync(path.join(source, file)),
        );
    }
    archives[name] = { archive, packed, files, url: item?.url };
  }
  for (const version of ["19.3.1"])
    for (const manager of ["npm", "bun"]) {
      const cwd = path.join(temp, manager + version);
      fs.mkdirSync(cwd);
      const deps = Object.fromEntries(
        names.map((n) => [
          n === "vmaterial-react-table" ? "material-react-table" : n,
          published ? archives[n].url : "file:" + archives[n].archive,
        ]),
      );
      // Before upload Bun cannot redirect a URL dependency with a file override.
      // Test exact extracted bytes with installed peers; public mode then tests
      // the actual untouched URL dependency graph with both package managers.
      const extracted = releaseDir && !published && manager === "bun";
      fs.writeFileSync(
        path.join(cwd, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies: {
            ...(published
              ? {
                  "material-react-table": archives["vmaterial-react-table"].url,
                }
              : extracted
                ? {}
                : deps),
            react: version,
            "react-dom": version,
            "@types/react": "19.3.0",
            "@types/react-dom": "19.3.0",
            "@mui/material": "7.2.0",
            "@mui/icons-material": "7.2.0",
            "@mui/x-date-pickers": "8.7.0",
            "@emotion/react": "11.14.0",
            "@emotion/styled": "11.14.0",
          },
          ...(!published && !extracted
            ? {
                overrides: Object.fromEntries(
                  names
                    .filter((n) => n !== "vmaterial-react-table")
                    .map((n) => [n, deps[n]]),
                ),
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
        for (const [name, p] of Object.entries(archives)) {
          const dest = path.join(
            cwd,
            "node_modules",
            name === "vmaterial-react-table" ? "material-react-table" : name,
          );
          fs.cpSync(p.packed, dest, { recursive: true });
        }
      for (const [name, p] of Object.entries(archives)) {
        const installed = path.join(
          cwd,
          "node_modules",
          name === "vmaterial-react-table" ? "material-react-table" : name,
        );
        assert.deepEqual(
          fs
            .readdirSync(installed)
            .filter((f) => f !== ".bun-tag")
            .sort(),
          p.files.toSorted(),
        );
        for (const file of p.files)
          assert.deepEqual(
            fs.readFileSync(path.join(installed, file)),
            fs.readFileSync(path.join(p.packed, file)),
          );
      }
      for (const name of [
        "@tanstack/react-table",
        "@tanstack/table-core",
        "@tanstack/react-virtual",
        "highlight-words",
      ])
        assert.equal(
          fs.existsSync(path.join(cwd, "node_modules", name)),
          false,
          name + " must not be installed",
        );
      const env = {
        VPM_MATERIAL_CONSUMER: cwd,
        VPM_TABLE_ENTRY: path.join(
          cwd,
          "node_modules/vtanstack-table-core/index.cjs",
        ),
        VPM_MATERIAL_ENTRY: path.join(
          cwd,
          "node_modules/material-react-table/index.cjs",
        ),
      };
      console.log(
        run("bun", [path.join(__dirname, "build.cjs")], root, env).trim(),
      );
      fs.writeFileSync(
        path.join(cwd, "identity.mjs"),
        "import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {useMaterialReactTable} from 'material-react-table';assert.equal(useMaterialReactTable,createRequire(import.meta.url)('material-react-table').useMaterialReactTable);",
      );
      for (const runtime of ["node", "bun"]) {
        run(runtime, ["identity.mjs"], cwd);
        console.log(
          run(
            runtime,
            [
              path.join(
                __dirname,
                "../table-conformance/grouped-selection.cjs",
              ),
            ],
            root,
            env,
          ).trim(),
        );
        console.log(
          run(runtime, [path.join(__dirname, "ssr.cjs")], root, env).trim(),
        );
      }
      console.log(
        run("node", [path.join(__dirname, "types.cjs")], root, env).trim(),
      );
      if (manager === "npm")
        console.log(
          run("node", [path.join(__dirname, "browser.cjs")], root, env).trim(),
        );
      console.log(
        manager +
          " React" +
          version +
          (extracted
            ? ": exact extracted release bytes and frozen peer install"
            : ": exact six-package closure and frozen dependency install") +
          ", Node/Bun, CJS/ESM, TS7 pass.",
      );
    }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
