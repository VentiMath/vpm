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
  fixture = path.join(__dirname, "cssjanus-conformance");
const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "release-manifest.json")),
  ),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-cssjanus-release-check-"));
const hash = (x) => createHash("sha256").update(x).digest("hex");
function run(command, args, cwd = temp, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
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
    assert.equal(manifest.packages.length, 1);
    const item = manifest.packages[0];
    assert.equal(item.name, "vcssjanus");
    assert.equal(item.version, "2.3.1");
    assert.deepEqual(item.dependencies, {});
    assert.deepEqual(
      JSON.parse(
        fs.readFileSync(path.join(directory, "consumer-package.json")),
      ),
      { overrides: { cssjanus: item.url } },
    );
    for (const line of fs
      .readFileSync(path.join(directory, "SHA256SUMS"), "utf8")
      .trim()
      .split("\n")) {
      const [digest, file] = line.split("  ");
      assert.equal(hash(fs.readFileSync(path.join(directory, file))), digest);
    }
    assert.equal(
      hash(fs.readFileSync(path.join(directory, item.asset))),
      item.sha256,
    );
    if (published)
      for (const file of [
        item.asset,
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
      const location = published
        ? item.url
        : "file:" + path.join(directory, item.asset);
      fs.writeFileSync(
        path.join(cwd, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies: { "stylis-plugin-rtl": "2.1.1", stylis: "4.3.6" },
          overrides: { cssjanus: location },
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
      const requireAt = createRequire(path.join(cwd, "package.json")),
        wrapper = requireAt.resolve("stylis-plugin-rtl");
      const entry = path.dirname(
        createRequire(wrapper).resolve("cssjanus/package.json"),
      );
      function verify() {
        const metadata = JSON.parse(
          fs.readFileSync(path.join(entry, "package.json")),
        );
        assert.equal(metadata.name, item.name);
        assert.equal(metadata.version, item.version);
        assert.deepEqual(metadata.dependencies, {});
        for (const [file, digest] of Object.entries(item.sourceFiles))
          assert.equal(
            hash(fs.readFileSync(path.join(entry, file))),
            digest,
            file,
          );
      }
      verify();
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
      fs.writeFileSync(
        path.join(cwd, "consumer.mjs"),
        `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {compile,serialize,middleware,stringify} from 'stylis';const require=createRequire(import.meta.url),plugin=require('stylis-plugin-rtl').default;const child=createRequire(require.resolve('stylis-plugin-rtl'));const api=child('cssjanus');assert.equal(child('cssjanus/package.json').name,'vcssjanus');assert.equal(api.transform('left:1px'),'right:1px');assert.equal(serialize(compile('.x{left:2px;content:"left;right:{}"}'),middleware([plugin,stringify])),'.x{right:2px;content:"left;right:{}";}');`,
      );
      for (const runtime of ["node", "bun"]) {
        run(runtime, ["consumer.mjs"], cwd);
        console.log(
          run(runtime, [path.join(fixture, "run.cjs")], cwd, {
            VPM_CSSJANUS_ENTRY: entry,
          }).trim(),
        );
        run(
          runtime,
          [
            runtime === "node" ? "--test" : "test",
            path.resolve(
              __dirname,
              "../packages/vcssjanus/test/contracts.test.cjs",
            ),
          ],
          cwd,
          { VPM_CSSJANUS_ENTRY: entry },
        );
      }
      // Resolve the URL package under its public upstream install name in types.
      const typeSource = fs
        .readFileSync(path.join(fixture, "public-types.ts"), "utf8")
        .replaceAll("vcssjanus", "cssjanus");
      fs.writeFileSync(path.join(cwd, "consumer.mts"), typeSource);
      fs.writeFileSync(
        path.join(cwd, "consumer.cts"),
        typeSource +
          "\nimport common=require('cssjanus');common.transform('right:1px');",
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
              paths: { cssjanus: [path.join(entry, "index.d.mts")] },
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
            VPM_CSSJANUS_ENTRY: entry,
          }).trim(),
        );
    }
    console.log(
      (published ? "Public URL bytes verified. " : "") +
        "Exact release archives pass fresh/frozen npm/Bun override installs, unchanged installed RTL caller, Node/Bun contracts, TS7 and Chrome.",
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
