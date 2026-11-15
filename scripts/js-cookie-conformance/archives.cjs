"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vjs-cookie-archive-"));
const run = (bin, args, cwd = scratch) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    env: {
      ...process.env,
      npm_config_cache: path.join(os.tmpdir(), "vpm-npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(scratch, "bun-cache"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const pack = JSON.parse(
    run("npm", [
      "pack",
      root + "/packages/vjs-cookie",
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  assert.ok(
    pack.files.every((f) => !/^test\/|^bench\/|node_modules/.test(f.path)),
  );
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    const dependencies = {
      "vjs-cookie": "file:" + path.join(scratch, pack.filename),
    };
    fs.writeFileSync(
      dir + "/package.json",
      JSON.stringify({ private: true, type: "module", dependencies }),
    );
    run(
      manager,
      manager === "npm"
        ? ["install", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--ignore-scripts"],
      dir,
    );
    run(
      manager,
      manager === "npm"
        ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
        : ["install", "--ignore-scripts", "--frozen-lockfile"],
      dir,
    );
    fs.copyFileSync(__dirname + '/archive-check.mjs',dir+'/check.mjs');
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(__dirname + "/consumer." + ext, dir + "/consumer." + ext);
    process.stdout.write(run("node", [__dirname + "/types.cjs", dir], dir));
    if(manager==='npm')process.stdout.write(execFileSync('node',[__dirname+'/browser.cjs'],{cwd:root,env:{...process.env,VPM_COOKIE_ENTRY:dir+'/node_modules/vjs-cookie/index.mjs'},encoding:'utf8',timeout:180000}));
  }
  console.log(
    "npm/Bun clean and frozen installs: " +
      pack.size +
      " bytes packed, " +
      pack.unpackedSize +
      " bytes unpacked.",
  );
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
