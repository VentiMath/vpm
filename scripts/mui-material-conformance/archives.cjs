"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vmui-material-archives-"));
const run = (bin, args, cwd = scratch) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    env: {
      ...process.env,
      npm_config_cache: path.join(os.tmpdir(), "vpm-npm-cache"),
      BUN_INSTALL_CACHE_DIR: scratch + "/bun-cache",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
try {
  const packs = new Map();
  const ordered = [],
    seen = new Set();
  function visit(name) {
    if (seen.has(name)) return;
    seen.add(name);
    const meta = require(root + "/packages/" + name + "/package.json");
    for (const dep of Object.keys(meta.dependencies || {})) {
      assert.ok(
        fs.existsSync(root + "/packages/" + dep + "/package.json"),
        "Unexpected non-VPM dependency " + dep,
      );
      visit(dep);
    }
    ordered.push(name);
  }
  visit("vmui-material");
  for (const name of ordered) {
    const stage = scratch + "/" + name;
    fs.cpSync(root + "/packages/" + name, stage, {
      recursive: true,
      filter: (p) =>
        !p.includes("node_modules") &&
        !p.includes("/bench") &&
        !p.includes("/test"),
    });
    const metadata = JSON.parse(fs.readFileSync(stage + "/package.json"));
    for (const dependency of Object.keys(metadata.dependencies || {})) {
      assert.ok(
        packs.has(dependency),
        "Unpinned internal dependency " + dependency,
      );
      metadata.dependencies[dependency] =
        "file:" + scratch + "/" + packs.get(dependency).filename;
    }
    fs.writeFileSync(stage + "/package.json", JSON.stringify(metadata));
    const packed = JSON.parse(
      run("npm", ["pack", stage, "--ignore-scripts", "--json"]),
    )[0];
    assert.ok(
      packed.files.every((f) => !/^test\/|^bench\/|node_modules/.test(f.path)),
    );
    packs.set(name, packed);
  }
  for (const manager of ["npm", "bun"]) {
    const dir = scratch + "/" + manager;
    fs.mkdirSync(dir);
    fs.writeFileSync(
      dir + "/package.json",
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: {
          "vmui-material":
            "file:" + scratch + "/" + packs.get("vmui-material").filename,
          react: "19.3.1",
          "react-dom": "19.3.1",
          "@types/react": "19.2.2",
          csstype: "3.1.3",
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
    for (const file of fs
      .readdirSync(root + "/packages/vmui-material")
      .filter((f) => /\.(?:cjs|mjs|cts|mts)$/.test(f)))
      assert.equal(
        fs.readFileSync(dir + "/node_modules/vmui-material/" + file, "utf8"),
        fs.readFileSync(root + "/packages/vmui-material/" + file, "utf8"),
      );
    for (const folder of ["utils","styles"]) for (const file of fs.readdirSync(root + "/packages/vmui-material/"+folder))
      assert.equal(fs.readFileSync(dir + "/node_modules/vmui-material/"+folder+"/" + file,"utf8"),fs.readFileSync(root + "/packages/vmui-material/"+folder+"/" + file,"utf8"));
    fs.copyFileSync(__dirname + "/archive-check.mjs", dir + "/check.mjs");
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(__dirname + "/consumer." + ext, dir + "/consumer." + ext);
    process.stdout.write(run("node", [__dirname + "/types.cjs", dir], dir));
    for (const file of [
      "contract.cjs",
      "text-contract.cjs",
      ...(manager === "npm" ? ["browser.cjs", "text-browser.cjs"] : []),
    ]) {
      process.stdout.write(
        execFileSync("node", [__dirname + "/" + file], {
          cwd: root,
          encoding: "utf8",
          timeout: 180000,
          env: { ...process.env, VPM_MATERIAL_INSTALL: dir },
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    }
  }
  console.log(
    JSON.stringify(
      [...packs].map(([name, p]) => ({
        name,
        packed: p.size,
        unpacked: p.unpackedSize,
      })),
    ),
  );
} catch (error) {
  if (error.stdout) process.stderr.write(String(error.stdout));
  if (error.stderr) process.stderr.write(String(error.stderr));
  throw error;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
