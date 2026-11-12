"use strict";
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vzod-archives-"));
const run = (bin, args, cwd = scratch, extra = {}) =>
  execFileSync(bin, args, {
    cwd,
    env: {
      ...process.env,
      ...extra,
      npm_config_cache: path.join(scratch, "npm-cache"),
      BUN_INSTALL_CACHE_DIR: path.join(scratch, "bun-cache"),
    },
    encoding: "utf8",
    timeout: 180000,
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const pack = JSON.parse(
    run("npm", [
      "pack",
      path.join(root, "packages/vzod"),
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  assert.ok(
    pack.files.every((x) => !/^test\/|^bench\/|^node_modules\//.test(x.path)),
  );
  const formPack = JSON.parse(
    run("npm", [
      "pack",
      path.join(root, "packages/vreact-hook-form"),
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  const resolverPack = JSON.parse(
    run("npm", [
      "pack",
      path.join(root, "packages/vhookform-resolvers"),
      "--ignore-scripts",
      "--json",
    ]),
  )[0];
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "vzod-consumer",
        private: true,
        type: "module",
        dependencies: {
          vzod: "file:" + path.join(scratch, pack.filename),
          "vhookform-resolvers":
            "file:" + path.join(scratch, resolverPack.filename),
          react: "19.3.1",
          "react-dom": "19.3.1",
          zod: "4.6.7",
          "zod-app": "npm:zod@3.24.3",
          "vreact-hook-form": "file:" + path.join(scratch, formPack.filename),
          "react-hook-form": "7.92.0",
          "@types/react": "19.2.2",
        },
      }),
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
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(
        path.join(__dirname, "consumer." + ext),
        path.join(dir, "consumer." + ext),
      );
    run("node", [path.join(__dirname, "types.cjs"), dir]);
    const pkg = path.join(dir, "node_modules/vzod"),
      env = {
        VZOD_ENTRY: path.join(pkg, "index.cjs"),
        VRESOLVERS_ZOD: path.join(
          dir,
          "node_modules/vhookform-resolvers/zod.cjs",
        ),
      };
    fs.writeFileSync(
      path.join(dir, "check.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {z} from 'vzod';import {zodResolver} from 'vhookform-resolvers/zod';const require=createRequire(import.meta.url);assert.equal(z.string,require('vzod').string);assert.equal(require('vzod/package.json').dependencies,undefined);const schema=z.object({name:z.string()});assert.deepEqual(await zodResolver(schema)({name:'Ada'},null,{fields:{}}),{values:{name:'Ada'},errors:{}});`,
    );
    for (const runtime of ["node", "bun"]) {
      run(runtime, [path.join(dir, "check.mjs")], dir);
      run(
        runtime,
        [
          runtime === "node" ? "--test" : "test",
          path.join(root, "packages/vzod/test/schema.test.cjs"),
        ],
        dir,
        env,
      );
      run(runtime, [path.join(__dirname, "run.cjs")], dir, env);
    }
    run("node", [path.join(__dirname, "forms.cjs")], dir, env);
  }
  console.log(
    `Packed vzod (${pack.size} bytes): npm/Bun fresh and frozen installs, ESM/CJS, installed types and behavior checks pass.`,
  );
} catch (e) {
  console.error(e.stdout?.toString(), e.stderr?.toString());
  throw e;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
