"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vcrypto-js-archive-"));
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
      root + "/packages/vcrypto-js",
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
      "vcrypto-js": "file:" + path.join(scratch, pack.filename),
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
    const check = `import assert from'node:assert/strict';import{createRequire}from'node:module';import api from'vcrypto-js';import hash from'vcrypto-js/sha256';import hmac from'vcrypto-js/hmac-sha256';import Utf8 from'vcrypto-js/enc-utf8';import Base64 from'vcrypto-js/enc-base64';const require=createRequire(import.meta.url);assert.equal(require('vcrypto-js/sha256'),hash);assert.match(require.resolve('vcrypto-js/sha256'),/sha256[.]native[.]cjs$/);assert.equal(hash('abc').toString(),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');assert.equal(hmac('what do ya want for nothing?','Jefe').toString(),'5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');assert.equal(Utf8.stringify(Base64.parse(Base64.stringify(Utf8.parse('α Math')))),'α Math');assert.equal(require('vcrypto-js/package.json').dependencies,undefined);console.log('packed hash and encoding subpaths pass');`;
    fs.writeFileSync(dir + "/check.mjs", check);
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(__dirname + "/consumer." + ext, dir + "/consumer." + ext);
    process.stdout.write(run("node", [__dirname + "/types.cjs", dir], dir));
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
