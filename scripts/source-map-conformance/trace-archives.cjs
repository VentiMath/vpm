"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { execFileSync } = require("node:child_process");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-trace-pack-"));
const env = {
  ...process.env,
  npm_config_cache: path.join(scratch, "npm-cache"),
  BUN_INSTALL_CACHE_DIR: path.join(scratch, "bun-cache"),
};
function run(bin, args, cwd = scratch, extra = {}) {
  return execFileSync(bin, args, {
    cwd,
    env: { ...env, ...extra },
    encoding: "utf8",
  });
}
try {
  const dependencies = {};
  for (const name of [
    "vresolve-uri",
    "vsourcemap-codec",
    "vtrace-mapping",
    "vgen-mapping",
    "vremapping",
    "vconvert-source-map",
  ]) {
    const [packed] = JSON.parse(
      run("npm", [
        "pack",
        path.resolve(__dirname, "../../packages", name),
        "--ignore-scripts",
        "--json",
      ]),
    );
    dependencies[name] = "file:../" + packed.filename;
  }
  for (const manager of ["npm", "bun"]) {
    const dir = path.join(scratch, manager);
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        private: true,
        dependencies,
        overrides: {
          "vgen-mapping": dependencies["vgen-mapping"],
          "vtrace-mapping": dependencies["vtrace-mapping"],
          "vresolve-uri": dependencies["vresolve-uri"],
          "vsourcemap-codec": dependencies["vsourcemap-codec"],
        },
      }),
    );
    run(manager, ["install", "--ignore-scripts", "--offline"], dir);
    run(
      manager,
      manager === "bun"
        ? ["install", "--ignore-scripts", "--frozen-lockfile", "--offline"]
        : ["ci", "--offline", "--ignore-scripts"],
      dir,
    );
    for (const runtime of ["node", "bun"])
      for (const caller of ["trace-caller.cjs", "convert-caller.cjs"])
        run(runtime, [path.join(__dirname, caller)], dir, {
          VPM_TRACE_INSTALL: path.join(dir, "node_modules"),
        });
  }
  console.log(
    "Packed npm and Bun installations pass Babel and remapping through the generator and tracing stack on Node and Bun.",
  );
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
