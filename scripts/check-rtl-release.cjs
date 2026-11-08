"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process"),
  { createHash } = require("node:crypto"),
  { createRequire } = require("node:module");
const directory = path.resolve(process.argv[2] || "."),
  published = process.argv.includes("--published"),
  fixture = path.join(__dirname, "rtl-conformance");
const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "release-manifest.json")),
  ),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-rtl-release-check-"));
const hash = (x) => createHash("sha256").update(x).digest("hex");
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 4e6,
    env: {
      ...process.env,
      BUN_INSTALL_CACHE_DIR: path.join(temp, "bun-cache"),
      npm_config_cache: path.join(temp, "npm-cache"),
      ...extra,
    },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.stdout;
}
(async () => {
  try {
    assert.deepEqual(manifest.packages.map((x) => x.name).sort(), [
      "vcssjanus",
      "vstylis-plugin-rtl",
    ]);
    const top = manifest.packages.find((x) => x.name === "vstylis-plugin-rtl"),
      child = manifest.packages.find((x) => x.name === "vcssjanus");
    assert.deepEqual(top.dependencies, { vcssjanus: child.url });
    assert.deepEqual(child.dependencies, {});
    assert.deepEqual(
      JSON.parse(
        fs.readFileSync(path.join(directory, "consumer-package.json")),
      ),
      { dependencies: { "stylis-plugin-rtl": top.url } },
    );
    for (const line of fs
      .readFileSync(path.join(directory, "SHA256SUMS"), "utf8")
      .trim()
      .split("\n")) {
      const [digest, file] = line.split("  ");
      assert.equal(hash(fs.readFileSync(path.join(directory, file))), digest);
    }
    if (published)
      for (const file of [
        ...manifest.packages.map((x) => x.asset),
        "release-manifest.json",
        "consumer-package.json",
        "SHA256SUMS",
      ]) {
        const r = await fetch(
          "https://github.com/VentiMath/vpm/releases/download/" +
            manifest.tag +
            "/" +
            file,
        );
        assert(r.ok, file + ": " + r.status);
        assert.deepEqual(
          Buffer.from(await r.arrayBuffer()),
          fs.readFileSync(path.join(directory, file)),
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
          dependencies: {
            ...(published || manager === "npm"
              ? {
                  "stylis-plugin-rtl": published
                    ? top.url
                    : "file:" + path.join(directory, top.asset),
                }
              : {}),
            stylis: "4.3.6",
          },
          ...(!published && manager === "npm"
            ? {
                overrides: {
                  vcssjanus: "file:" + path.join(directory, child.asset),
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
      // Bun resolves embedded tarball URLs before local overrides. Before the
      // release exists, exercise its exact archive bytes without rewriting them;
      // published mode must pass real fresh/frozen URL installs with no override.
      if (!published && manager === "bun")
        for (const item of manifest.packages) {
          const unpack = path.join(cwd, "unpack-" + item.name);
          fs.mkdirSync(unpack);
          run(
            "tar",
            ["-xzf", path.join(directory, item.asset), "-C", unpack],
            cwd,
          );
          fs.renameSync(
            path.join(unpack, "package"),
            path.join(cwd, "node_modules", manifest.installNames[item.name]),
          );
        }
      const requireAt = createRequire(path.join(cwd, "package.json")),
        entry = path.dirname(
          requireAt.resolve("stylis-plugin-rtl/package.json"),
        );
      const childEntry = path.dirname(
        createRequire(path.join(entry, "package.json")).resolve(
          "vcssjanus/package.json",
        ),
      );
      function verify() {
        for (const item of manifest.packages) {
          const dir = item === top ? entry : childEntry,
            m = JSON.parse(fs.readFileSync(path.join(dir, "package.json")));
          assert.equal(m.name, item.name);
          assert.equal(m.version, item.version);
          assert.deepEqual(m.dependencies, item.dependencies);
          for (const [file, digest] of Object.entries(item.sourceFiles))
            assert.equal(
              hash(fs.readFileSync(path.join(dir, file))),
              digest,
              file,
            );
        }
      }
      verify();
      if (published || manager === "npm") {
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
        verify();
      }
      fs.writeFileSync(
        path.join(cwd, "consumer.mjs"),
        `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import rtl from 'stylis-plugin-rtl';import {compile,serialize,middleware,stringify} from 'stylis';const require=createRequire(import.meta.url);assert.equal(rtl,require('stylis-plugin-rtl').default);assert.equal(require('stylis-plugin-rtl/package.json').name,'vstylis-plugin-rtl');assert.equal(serialize(compile('@layer a{.x{left:2px}}'),middleware([rtl,stringify])),'@layer a{.x{right:2px;}}');`,
      );
      for (const runtime of ["node", "bun"]) {
        run(runtime, ["consumer.mjs"], cwd);
        console.log(
          run(runtime, [path.join(fixture, "run.cjs")], cwd, {
            VPM_RTL_ENTRY: entry,
          }).trim(),
        );
        run(
          runtime,
          [
            runtime === "node" ? "--test" : "test",
            path.resolve(
              __dirname,
              "../packages/vstylis-plugin-rtl/test/contracts.test.cjs",
            ),
          ],
          cwd,
          { VPM_RTL_ENTRY: entry },
        );
      }
      const types = fs
        .readFileSync(path.join(fixture, "public-types.ts"), "utf8")
        .replaceAll("vstylis-plugin-rtl", "stylis-plugin-rtl");
      fs.writeFileSync(path.join(cwd, "consumer.mts"), types);
      fs.writeFileSync(
        path.join(cwd, "consumer.cts"),
        types +
          "\nimport c=require('stylis-plugin-rtl');const cb:(...args:Parameters<typeof c>)=>void=c.default;",
      );
      for (const mode of ["NodeNext", "Bundler"]) {
        fs.writeFileSync(
          path.join(cwd, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              strict: true,
              noEmit: true,
              target: "ES2022",
              module: mode === "Bundler" ? "Preserve" : mode,
              moduleResolution: mode,
              lib: ["ES2022"],
              types: [],
            },
            files: ["consumer.mts", "consumer.cts"],
          }),
        );
        run(
          "node",
          [
            require("./platform-types.cjs").compiler().path,
            "-p",
            "tsconfig.json",
          ],
          cwd,
        );
      }
      if (manager === "npm")
        console.log(
          run("node", [path.join(fixture, "browser.cjs")], cwd, {
            VPM_RTL_ENTRY: entry,
          }).trim(),
        );
    }
    console.log(
      (published
        ? "Public bytes and URL installs"
        : "Prepublication npm installs and exact extracted Bun archives") +
        " verified: two packages, original import name, Node/Bun/TS7, Chrome and internal dependency hashes." +
        (published
          ? " Fresh/frozen npm/Bun URL installs pass without overrides."
          : ""),
    );
  } finally {
    fs.rmSync(temp, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
