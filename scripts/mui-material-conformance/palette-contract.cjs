"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const { fixture, packages, peer, esbuild } = require("./paths.cjs");
const entry = path.join(packages, "vmui-material/styles/createPalette.cjs");
function owned() {
  if (process.env.VPM_MATERIAL_INSTALL) return require(entry).default;
  const result = esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    nodePaths: [packages, fixture + "/node_modules"],
  });
  const mod = { exports: {} };
  require("node:vm").compileFunction(result.outputFiles[0].text, [
    "module",
    "exports",
    "require",
  ])(mod, mod.exports, require);
  return mod.exports.default;
}
const createPalette = owned();
const controls = ["mui-material-app", "@mui/material"].map(
  (p) =>
    require(
      path.join(path.dirname(peer.resolve(p + "/styles")), "createPalette.js"),
    ).default,
);
const data = (p) => JSON.parse(JSON.stringify(p));
const cases = [];
for (const mode of ["light", "dark"])
  for (const contrastThreshold of [3, 4.5, 7])
    for (const tonalOffset of [0, 0.2, { light: 0.1, dark: 0.4 }])
      for (const main of [
        "#1976d2",
        "#79a",
        "hsl(30, 80%, 40%)",
        "rgba(48, 96, 192, 0.7)",
      ])
        cases.push({ mode, contrastThreshold, tonalOffset, primary: { main } });
cases.push(
  {},
  {
    primary: { 500: "#900", 300: "#d33", 700: "#700" },
    secondary: { A400: "#090", A200: "#3d3", A700: "#070" },
  },
  {
    background: { default: "#eee" },
    text: { secondary: "#777" },
    action: { hoverOpacity: 0.2 },
    custom: { nested: { label: "Ink" } },
    primary: { main: "#543", label: "custom" },
  },
);
const oldError = console.error;
console.error = () => {};
try {
  for (const input of cases)
    for (const control of controls) {
      const before = structuredClone(input);
      const a = createPalette(input),
        b = control(input);
      assert.deepEqual(data(a), data(b));
      assert.deepEqual(input, before);
      for (const color of ["#fff", "#222", "#719", "#da4"]) {
        assert.equal(a.getContrastText(color), b.getContrastText(color));
        assert.deepEqual(
          a.augmentColor({ color: { main: color } }),
          b.augmentColor({ color: { main: color } }),
        );
      }
    }
  const a = createPalette(),
    b = createPalette();
  a.grey[100] = "changed";
  a.text.primary = "changed";
  assert.equal(b.grey[100], "#f5f5f5");
  assert.equal(b.text.primary, "rgba(0, 0, 0, 0.87)");
  for (const input of [{ primary: {} }, { primary: { main: 123 } }])
    assert.throws(() => createPalette(input), TypeError);
  const original = { main: "#123" };
  createPalette().augmentColor({ color: Object.freeze(original) });
  assert.deepEqual(original, { main: "#123" });
  for (const offset of [
    { light: 0, dark: 0 },
    { light: 0, dark: 0.2 },
  ]) {
    const p = createPalette({ tonalOffset: offset, primary: { main: "#123" } });
    assert.equal(p.primary.light, "rgb(17, 34, 51)");
  }
  const modern = {
    colorSpace: "oklch",
    primary: { main: "var(--brand)" },
    tonalOffset: 0.2,
  };
  assert.deepEqual(data(createPalette(modern)), data(controls[1](modern)));
} finally {
  console.error = oldError;
}
console.log(
  cases.length * 2,
  "palette controls and mutation, augmentation, zero-offset and native-color checks passed.",
);
