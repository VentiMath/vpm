"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const { execFileSync } = require("node:child_process");
const { fixture, packages, peer, esbuild } = require("./paths.cjs");
function load(relative) {
  const entry = path.join(packages, "vmui-material", relative);
  if (process.env.VPM_MATERIAL_INSTALL) return require(entry);
  const bundle = esbuild.buildSync({
    entryPoints: [entry],
    platform: "node",
    bundle: true,
    format: "cjs",
    write: false,
    nodePaths: [packages, fixture + "/node_modules"],
  });
  const mod = { exports: {} };
  require("node:vm").compileFunction(bundle.outputFiles[0].text, [
    "module",
    "exports",
    "require",
  ])(mod, mod.exports, require);
  return mod.exports;
}
const create = load("styles/createTypography.cjs").default;
const palette = load("palette.cjs").createPalette();
const controls = ["mui-material-app", "@mui/material"].map(
  (name) =>
    require(
      path.join(
        path.dirname(peer.resolve(name + "/styles")),
        "createTypography.js",
      ),
    ).default,
);
const variants = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "subtitle1",
  "subtitle2",
  "body1",
  "body2",
  "button",
  "caption",
  "overline",
  "inherit",
];
const data = (p) => JSON.parse(JSON.stringify(p));
function compare(options) {
  for (const control of controls) {
    const expected = control(palette, options),
      actual = create(palette, options);
    assert.deepEqual(data(actual), data(expected));
    for (const size of [-8, 0, 1, 13, 16, 24, 96, 1000])
      assert.equal(actual.pxToRem(size), expected.pxToRem(size));
  }
}
for (const fontFamily of [undefined, "Geist,Arial,sans-serif"])
  for (const fontSize of [0, 13, 14, 18])
    for (const htmlFontSize of [10, 16, 20]) {
      compare({ fontFamily, fontSize, htmlFontSize });
    }
compare({
  fontWeightLight: 200,
  fontWeightRegular: 450,
  fontWeightMedium: 600,
  fontWeightBold: 800,
  allVariants: { color: "#345", lineHeight: 1.4 },
  h2: { "@media (min-width:600px)": { fontSize: "3rem" } },
  body1: { fontSize: "0.8125rem" },
});
compare({ pxToRem: (p) => "calc(" + p + " * var(--unit))" });
compare((p) => ({ body1: { color: p.primary.main } }));
let calls = 0;
create(palette, (p) => {
  calls++;
  assert.equal(p, palette);
  return {};
});
assert.equal(calls, 1);
const options = {
  allVariants: { "@media (min-width:600px)": { fontSize: "2rem" } },
  h1: { "@media (min-width:600px)": { color: "red" } },
};
const before = structuredClone(options),
  result = create(palette, options);
assert.deepEqual(options, before);
result.h1["@media (min-width:600px)"].fontSize = "4rem";
assert.equal(result.h2["@media (min-width:600px)"].fontSize, "2rem");
assert.deepEqual(options, before);
if (process.env.VPM_APP_CHECKOUT) {
  const app = path.resolve(process.env.VPM_APP_CHECKOUT);
  const source = execFileSync(
    "git",
    [
      "-C",
      app,
      "show",
      (process.env.VPM_APP_REF || "origin/main") +
        ":src/@fuse/default-settings/FuseDefaultSettings.ts",
    ],
    { encoding: "utf8" },
  );
  const code = esbuild.transformSync(source, {
    loader: "ts",
    format: "cjs",
  }).code;
  const mod = { exports: {} },
    appRequire = require("node:module").createRequire(
      path.join(app, "package.json"),
    );
  require("node:vm").compileFunction(code, ["module", "exports", "require"])(
    mod,
    mod.exports,
    (name) =>
      name === "@mui/material/styles"
        ? peer("mui-material-app/styles")
        : appRequire(name),
  );
  const { defaultThemeOptions, mustHaveThemeOptions } = mod.exports;
  const appOptions = {
    ...defaultThemeOptions.typography,
    ...mustHaveThemeOptions.typography,
  };
  compare(appOptions);
  const actual = create(palette, appOptions);
  assert.equal(actual.fontSize, 13);
  assert.equal(actual.htmlFontSize, 16);
  assert.equal(actual.body1.fontSize, "0.8125rem");
  assert.ok(actual.fontFamily.startsWith("Geist"));
  // Feed the same resolved scale to actual Typography consumers in both renderers.
  const React = peer("react"),
    server = peer("react-dom/server");

  const upstream = peer("mui-material-app/styles"),
    UpTypography = peer("mui-material-app/Typography").default;
  const base = upstream.createTheme({ typography: appOptions });
  const make = (Provider, Component, typography) =>
    server.renderToStaticMarkup(
      React.createElement(
        Provider,
        { theme: { ...base, typography } },
        React.createElement(
          "article",
          null,
          variants.map((variant) =>
            React.createElement(
              Component,
              { key: variant, variant },
              "Practice",
            ),
          ),
        ),
      ),
    );
  // Both use upstream styling here to isolate generated typography from style-engine differences.
  assert.deepEqual(data(actual), data(base.typography));
  const rendered = make(upstream.ThemeProvider, UpTypography, actual),
    expected = make(
      upstream.ThemeProvider,
      UpTypography,
      controls[0](palette, appOptions),
    );
  const mismatch = Array.from(rendered).findIndex((c, i) => c !== expected[i]);
  assert.equal(
    mismatch,
    -1,
    rendered.slice(mismatch - 50, mismatch + 180) +
      " vs " +
      expected.slice(mismatch - 50, mismatch + 180),
  );

  console.log(
    "App Geist/13px configuration and all 14 rendered Typography variants passed.",
  );
}
console.log(
  "Typography defaults, scaling, callbacks, responsive overrides and ownership passed.",
);
