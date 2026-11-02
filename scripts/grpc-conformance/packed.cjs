"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "vgrpc-packed-"));
function run(command, args, cwd = directory) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, npm_config_cache: path.join(directory, "cache") },
  });
  assert.equal(
    r.status,
    0,
    command + " " + args.join(" ") + "\n" + r.stdout + "\n" + r.stderr,
  );
  return r.stdout;
}
try {
  const dependencies = {},
    names = new Set();
  function visit(name) {
    if (names.has(name)) return;
    names.add(name);
    const p = require(path.join(root, "packages", name, "package.json"));
    for (const n of Object.keys(p.dependencies || {})) {
      assert.ok(n.startsWith("v"));
      visit(n);
    }
  }
  visit("vgrpc-js");
  for (const name of names) {
    run(
      "bun",
      ["pm", "pack", "--ignore-scripts", "--destination", directory, "--quiet"],
      path.join(root, "packages", name),
    );
    dependencies[name] =
      "file:" +
      path.join(
        directory,
        name +
          "-" +
          require(path.join(root, "packages", name, "package.json")).version +
          ".tgz",
      );
  }
  for (const installer of ["npm", "bun"]) {
    const consumer = path.join(directory, installer);
    fs.mkdirSync(consumer);
    fs.writeFileSync(
      path.join(consumer, "package.json"),
      JSON.stringify({
        name: "grpc-archive-consumer",
        private: true,
        type: "module",
        dependencies,
        overrides: dependencies,
      }),
    );
    run(
      installer,
      [
        "install",
        "--ignore-scripts",
        ...(installer === "npm"
          ? ["--offline", "--no-audit", "--no-fund"]
          : []),
      ],
      consumer,
    );
    for (const runtime of ["node", "bun"])
      for (const mode of ["cjs", "esm"]) {
        const module = path.join(consumer, "node_modules/vgrpc-js");
        const script =
          mode === "cjs"
            ? `require(${JSON.stringify(path.join(__dirname, "callers.cjs"))})(require(${JSON.stringify(module)})).catch(e=>{console.error(e);process.exitCode=1});`
            : `import(${JSON.stringify("file://" + module + "/index.mjs")}).then(m=>require(${JSON.stringify(path.join(__dirname, "callers.cjs"))})(m)).catch(e=>{console.error(e);process.exitCode=1});`;
        run(runtime, ["-e", script], consumer);
      }
    fs.writeFileSync(
      path.join(consumer, "consumer.ts"),
      `import {Client,Channel,credentials,Metadata,type CallOptions} from 'vgrpc-js';
const client=new Client('localhost:1',credentials.createInsecure());
const channel:Channel=client.getChannel();channel.watchConnectivityState(0,Date.now(),()=>{});
const options:CallOptions={credentials:credentials.createFromMetadataGenerator((_,done)=>done(null,new Metadata()))};
// @ts-expect-error custom interceptors are outside the client scope
const unsupported:CallOptions={interceptors:[]};
client.close();void[options,unsupported];`,
    );
    fs.writeFileSync(
      path.join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          lib: ["ES2022"],
          types: [],
        },
        files: ["consumer.ts"],
      }),
    );
    run("node", [
      require("../platform-types.cjs").compiler().path,
      "-p",
      path.join(consumer, "tsconfig.json"),
    ]);
  }
  console.log(
    "Clean npm and Bun installs: CJS and ESM RPCs on Node/Bun; TypeScript 7 client scope; " +
      names.size +
      " packed VPM packages.",
  );
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
