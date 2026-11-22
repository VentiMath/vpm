"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { fixture, packages, peer, esbuild } = require("./paths.cjs");
function materialStyles() {
  const entry = path.join(packages, "vmui-material/styles/index.cjs");
  if (process.env.VPM_MATERIAL_INSTALL) return require(entry);
  const bundled = esbuild.buildSync({
    entryPoints: [entry],
    platform: "node",
    format: "cjs",
    bundle: true,
    write: false,
    nodePaths: [packages, path.join(fixture, "node_modules")],
  });
  const mod = { exports: {} };
  require("node:vm").compileFunction(bundled.outputFiles[0].text, [
    "module",
    "exports",
    "require",
  ])(mod, mod.exports, require);
  return mod.exports;
}
const styles = materialStyles();
const control = peer("mui-material-app/styles");
const current = peer("@mui/material/styles");
const examples = {
  alpha: ["#4285ab", 0.5],
  darken: ["hsla(40, 100%, 75%, 0.8)", 0.15],
  decomposeColor: ["#fff8"],
  emphasize: ["#878787"],
  getContrastRatio: ["#767676", "#fff"],
  getLuminance: ["rgb(12, 82, 143)"],
  hexToRgb: ["#123a"],
  hslToRgb: ["hsl(40, 100%, 75%)"],
  lighten: ["#123", 0.25],
  recomposeColor: [{ type: "hsl", values: [90, 50, 50] }],
  rgbToHex: ["rgba(17, 34, 51, 0.5)"],
};
for (const [name, args] of Object.entries(examples))
  for (const lib of [control, current])
    assert.deepEqual(
      styles[name](...structuredClone(args)),
      lib[name](...structuredClone(args)),
      name,
    );
assert.equal(styles.hslToRgb("hsl(40, 100%, 75%)"), "rgb(255, 213, 128)");
assert.equal(styles.hslToRgb("hsl(-120, 100%, 50%)"), "rgb(0, 0, 255)");
assert.ok(styles.getContrastRatio("#767676", "#fff") >= 4.5);
assert.ok(styles.getContrastRatio("#777", "#fff") < 4.5);
for (let h = 0; h < 360; h += 5)
  for (let l = 5; l < 100; l += 5) {
    const value = "hsla(" + h + ", 75%, " + l + "%, 0.64)";
    assert.equal(styles.hslToRgb(value), control.hslToRgb(value));
    assert.equal(styles.getLuminance(value), current.getLuminance(value));
  }
if (process.env.VPM_APP_CHECKOUT) {
  const { compileFunction } = require("node:vm");
  const ref = process.env.VPM_APP_REF || "origin/main";
  const source = (file) =>
    execFileSync(
      "git",
      ["-C", process.env.VPM_APP_CHECKOUT, "show", ref + ":" + file],
      { encoding: "utf8" },
    );
  const hook = source("src/@fuse/core/FuseSettings/hooks/fuseThemeHooks.tsx");
  const start = hook.indexOf("const MIN_TEXT_CONTRAST"),
    end = hook.indexOf("const generatedThemes", start);
  assert.ok(
    start >= 0 && end > start,
    "locate the application's palette logic",
  );
  const names = [
    "darken",
    "decomposeColor",
    "getContrastRatio",
    "getLuminance",
    "hslToRgb",
    "lighten",
  ];
  const body = esbuild.transformSync(hook.slice(start, end), {
    loader: "ts",
  }).code;
  const paletteFor = (api) =>
    compileFunction(
      body + "\nreturn {readablePalette,contrastOn};",
      names,
    )(...names.map((k) => api[k]));
  const baseline = paletteFor(control),
    candidate = paletteFor(styles);
  const modules = { "@mui/material/colors": peer("mui-material-app/colors") };
  for (const name of ["fuseDark", "paletteText", "skyBlue", "themesConfig"]) {
    const js = esbuild.transformSync(
      source("src/@fuse/colors/" + name + ".ts"),
      { loader: "ts", format: "cjs" },
    ).code;
    const mod = { exports: {} };
    compileFunction(js, ["module", "require"])(mod, (k) => {
      assert.ok(modules[k], k);
      return modules[k];
    });
    modules["./" + name] = mod.exports;
  }
  const palettes = Object.values(modules["./themesConfig"].themesConfig).map(
    (p) => p.palette,
  );
  assert.ok(palettes.length > 0 && palettes.every(Boolean));
  palettes.push({
    mode: "light",
    primary: { main: "hsl(40, 100%, 75%)" },
    text: { secondary: "rgba(80, 90, 100, 0.45)" },
  });
  for (const input of palettes) {
    const palette = control.createTheme({ palette: input }).palette;
    const output = candidate.readablePalette(palette);
    assert.deepEqual(output, baseline.readablePalette(palette));
    for (const role of [
      "primary",
      "secondary",
      "error",
      "warning",
      "info",
      "success",
    ]) {
      const { main, light, dark, contrastText } = output[role];
      assert.equal(light, palette[role].light);
      for (const bg of [palette.background.paper, palette.background.default]) {
        assert.ok(baseline.contrastOn(main, bg) >= 4.5);
        assert.ok(baseline.contrastOn(output.text.secondary, bg) >= 4.5);
      }
      for (const fill of [main, dark])
        assert.ok(baseline.contrastOn(contrastText, fill) >= 4.5);
    }
  }
  console.log(
    palettes.length - 1,
    "app presets plus a custom picker palette matched the app's Material control.",
  );
}
console.log("Material styles color and contrast contracts passed.");
