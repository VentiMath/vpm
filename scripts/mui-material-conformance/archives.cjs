"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const browserChecks=["theme-browser.cjs","browser.cjs", "text-browser.cjs", "surfaces-browser.cjs", "forms-browser.cjs", "input-browser.cjs", "input-variants-browser.cjs", "input-decorations-browser.cjs", "text-field-browser.cjs", "lists-browser.cjs", "menus-browser.cjs", "select-browser.cjs", "checkbox-browser.cjs", "radio-browser.cjs", "switch-browser.cjs", "chip-browser.cjs", "avatar-browser.cjs", "progress-browser.cjs", "skeleton-browser.cjs", "container-browser.cjs", "cards-browser.cjs", "card-action-browser.cjs", "avatar-group-browser.cjs", "tooltip-browser.cjs", "collapse-browser.cjs", "dialog-parts-browser.cjs", "dialog-browser.cjs", "slide-browser.cjs", "drawer-browser.cjs", "swipeable-drawer-browser.cjs", "tables-browser.cjs", "navigation-browser.cjs", "linear-browser.cjs", "alert-browser.cjs", "badge-browser.cjs", "list-button-browser.cjs", "bars-browser.cjs", "accordion-parts-browser.cjs", "accordion-browser.cjs", "tabs-browser.cjs", "breadcrumbs-browser.cjs", "snackbar-browser.cjs", "stack-browser.cjs", "grid-browser.cjs", "rating-browser.cjs", "globals-browser.cjs", "click-away-browser.cjs", "grow-browser.cjs", "popper-browser.cjs", "slider-browser.cjs", "steps-browser.cjs", "step-content-browser.cjs", "list-item-browser.cjs", "css-baseline-browser.cjs", "autocomplete-browser.cjs", "consumer-gaps-browser.cjs"];
const browserFilter=process.env.VPM_MATERIAL_BROWSER_FILTER;
const contractFilter=process.env.VPM_MATERIAL_CONTRACT_FILTER;
assert.ok(!browserFilter||browserFilter.split(",").every(file=>browserChecks.includes(file)),"Unknown Material browser fixture filter");
const root = path.resolve(__dirname, "../.."),
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vmui-material-archives-"));
const run = (bin, args, cwd = scratch) =>
  execFileSync(bin, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    env: {
      ...process.env,
      npm_config_cache: path.join(scratch, "npm-cache"),
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
    for (const folder of ["utils","styles","FormControl","colors","themeCssVarsAugmentation"]) for (const file of fs.readdirSync(root + "/packages/vmui-material/"+folder))
      assert.equal(fs.readFileSync(dir + "/node_modules/vmui-material/"+folder+"/" + file,"utf8"),fs.readFileSync(root + "/packages/vmui-material/"+folder+"/" + file,"utf8"));
    fs.copyFileSync(__dirname + "/archive-check.mjs", dir + "/check.mjs");
    for (const runtime of ["node", "bun"])
      process.stdout.write(run(runtime, ["check.mjs"], dir));
    for (const ext of ["mts", "cts"])
      fs.copyFileSync(__dirname + "/consumer." + ext, dir + "/consumer." + ext);
    process.stdout.write(run("node", [__dirname + "/types.cjs", dir], dir));
    const checkFiles = [
      "contract.cjs",
      "text-contract.cjs",
      "surfaces-contract.cjs",
      "forms-contract.cjs",
      "input-contract.cjs", "input-variants-contract.cjs", "input-decorations-contract.cjs", "text-field-contract.cjs", "lists-contract.cjs", "select-contract.cjs", "checkbox-contract.cjs", "radio-contract.cjs", "switch-contract.cjs", "chip-contract.cjs", "avatar-contract.cjs", "progress-contract.cjs", "skeleton-contract.cjs", "container-contract.cjs", "cards-contract.cjs", "card-action-contract.cjs", "avatar-group-contract.cjs", "tooltip-contract.cjs", "collapse-contract.cjs", "dialog-parts-contract.cjs", "dialog-contract.cjs", "slide-contract.cjs", "drawer-contract.cjs", "swipeable-drawer-contract.cjs", "tables-contract.cjs", "navigation-contract.cjs", "linear-contract.cjs", "alert-contract.cjs", "badge-contract.cjs", "list-button-contract.cjs", "bars-contract.cjs", "accordion-parts-contract.cjs", "accordion-contract.cjs", "tabs-contract.cjs", "breadcrumbs-contract.cjs", "snackbar-contract.cjs", "stack-contract.cjs", "grid-contract.cjs", "rating-contract.cjs", "globals-contract.cjs", "click-away-contract.cjs", "grow-contract.cjs", "popper-contract.cjs", "slider-contract.cjs", "steps-contract.cjs", "step-content-contract.cjs", "list-item-contract.cjs", "css-baseline-contract.cjs", "colors-contract.cjs", "color-exports-contract.cjs", "color-types.cjs", "palette-contract.cjs", "typography-contract.cjs", "transitions-contract.cjs", "theme-contract.cjs", "autocomplete-contract.cjs", "consumer-gaps-contract.cjs",
      ...(manager === "npm" ? browserChecks.filter(file=>!browserFilter||browserFilter.split(",").includes(file)) : []),
    ];
    assert.ok(!contractFilter||contractFilter.split(",").every(file=>checkFiles.includes(file)&&!browserChecks.includes(file)),"Unknown Material contract fixture filter");
    for (const file of checkFiles) {
      if(contractFilter&&!browserChecks.includes(file)&&!contractFilter.split(",").includes(file))continue;
      process.stdout.write(
        execFileSync("node", [__dirname + "/" + file], {
          cwd: root,
          encoding: "utf8",
          timeout: file === "swipeable-drawer-browser.cjs" ? 300000 : 180000,
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
