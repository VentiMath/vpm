"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const fixture = path.join(__dirname, "node_modules");
async function build(dir) {
  const core = path.join(dir, "node_modules/@babel/core"),
    babel = require(core);
  assert.equal(
    require("node:module")
      .createRequire(path.join(core, "package.json"))
      .resolve("gensync"),
    fs.realpathSync(require.resolve(path.join(dir, "node_modules/gensync"))),
  );
  const filename = path.join(dir, "example.jsx"),
    opts = {
      cwd: dir,
      filename,
      configFile: path.join(dir, "babel.config.json"),
      babelrc: false,
      sourceMaps: true,
    };
  const config = babel.loadPartialConfigSync(opts),
    asyncConfig = await babel.loadPartialConfigAsync(opts);
  assert.equal(config.hasFilesystemConfig(), true);
  assert.deepEqual([...config.files], [...asyncConfig.files]);
  const source = fs.readFileSync(filename, "utf8"),
    normalize = (r) => [
      r.code,
      r.map.mappings,
      r.map.sources,
      r.map.sourcesContent,
    ];
  const sync = normalize(babel.transformFileSync(filename, opts));
  assert.ok(sync[0].includes("contestTheme") && sync[1]);
  assert.deepEqual(
    normalize(await babel.transformFileAsync(filename, opts)),
    sync,
  );
  const callback = await new Promise((ok, fail) =>
    babel.transformFile(filename, opts, (e, v) => (e ? fail(e) : ok(v))),
  );
  assert.deepEqual(normalize(callback), sync);
  assert.deepEqual(normalize(babel.transformSync(source, opts)), sync);
  assert.deepEqual(normalize(await babel.transformAsync(source, opts)), sync);
  const asyncPlugin = {
    ...opts,
    plugins: [
      () => ({
        async pre() {
          await Promise.resolve();
          this.file.metadata.prepared = true;
        },
      }),
    ],
  };
  const asyncResult = await babel.transformAsync(source, asyncPlugin);
  assert.equal(asyncResult.metadata.prepared, true);
  assert.throws(() => babel.transformSync(source, asyncPlugin), /async/i);
  const missing = path.join(dir, "absent.jsx");
  await assert.rejects(babel.transformFileAsync(missing, opts), {
    code: "ENOENT",
  });
  return JSON.stringify(sync);
}
if (process.argv[2]) {
  build(process.argv[2])
    .then((x) => process.stdout.write(x))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
} else {
  const dir = require("./gensync-fixture.cjs")();
  try {
    const alias = path.join(dir, "node_modules/gensync");
    const run = (target) => {
      fs.symlinkSync(target, alias);
      try {
        return execFileSync(process.execPath, [__filename, dir], {
          encoding: "utf8",
        });
      } finally {
        fs.unlinkSync(alias);
      }
    };
    const control = run(path.join(fixture, "gensync"));
    const owned = run(
      path.resolve(
        process.env.VPM_TRACE_INSTALL || path.join(__dirname, "../../packages"),
        "vgensync",
      ),
    );
    assert.equal(owned, control);
    console.log(
      "Babel Core 7.29.0 configuration discovery, sync/async/callback JSX builds, maps, plugin timing and missing files match.",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
