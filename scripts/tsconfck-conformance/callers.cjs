"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { pathToFileURL } = require("node:url"),
  { execFileSync } = require("node:child_process");
const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpm-tsconfck-callers-")),
  ),
  out = __dirname + "/node_modules/.vpm-tsconfck";
fs.mkdirSync(out, { recursive: true });
(async () => {
  try {
    const { build } = await import("vite");
    for (const version of ["current", "app"]) {
      const pkg =
        version === "app" ? "vite-tsconfig-paths-app" : "vite-tsconfig-paths";
      for (const vpm of [false, true]) {
        const dest = out + "/" + version + "-" + vpm + ".mjs";
        require("esbuild").buildSync({
          entryPoints: [require.resolve(pkg)],
          outfile: dest,
          platform: "node",
          format: "esm",
          bundle: true,
          packages: "external",
          banner: {
            js: "import { createRequire as fixtureRequire } from 'node:module'; const require = fixtureRequire(import.meta.url);",
          },
          ...(vpm
            ? {
                alias: {
                  tsconfck: path.resolve(
                    __dirname,
                    "../../packages/vtsconfck/index.mjs",
                  ),
                },
              }
            : {}),
          logLevel: "silent",
        });
        const plugin = (await import(pathToFileURL(dest))).default;
        fs.mkdirSync(root + "/src", { recursive: true });
        fs.mkdirSync(root + "/config", { recursive: true });
        fs.writeFileSync(
          root + "/package.json",
          JSON.stringify({ type: "module" }),
        );
        fs.writeFileSync(
          root + "/config/base.json",
          JSON.stringify({
            compilerOptions: {
              baseUrl: "..",
              paths: { "@feature/*": ["src/*"] },
            },
            include: ["../src"],
          }),
        );
        fs.writeFileSync(
          root + "/tsconfig.json",
          '{ /* application-shaped aliases */ "extends":"./config/base.json", "compilerOptions":{"allowJs":true}, }',
        );
        fs.writeFileSync(
          root + "/src/entry.js",
          "import{value}from'@feature/value';export{value};",
        );
        fs.writeFileSync(
          root + "/src/value.js",
          'export const value="Contest alias resolved";',
        );
        const result = await build({
          root,
          configFile: false,
          logLevel: "silent",
          plugins: [plugin({ parseNative: false })],
          build: {
            write: false,
            minify: false,
            lib: { entry: root + "/src/entry.js", formats: ["es"] },
          },
        });
        assert.match(result[0].output[0].code, /Contest alias resolved/);
        assert.doesNotMatch(result[0].output[0].code, /@feature/);
        console.log(
          version +
            " plugin " +
            (vpm ? "with VPM reader" : "control") +
            " resolves inherited aliases through an unchanged Vite build",
        );
      }
    }
    const app = "/Users/johnclyde/venti/ventimath-private";
    if (fs.existsSync(app + "/.git")) {
      const text = execFileSync("git", ["show", "origin/main:tsconfig.json"], {
          cwd: app,
          encoding: "utf8",
        }),
        target = root + "/actual/tsconfig.json";
      fs.mkdirSync(path.dirname(target));
      fs.writeFileSync(target, text);
      const own = require("../../packages/vtsconfck"),
        up = await import("tsconfck");
      assert.deepEqual(
        (await own.parse(target)).tsconfig,
        (await up.parse(target)).tsconfig,
      );
      console.log(
        "read-only app tsconfig matches upstream; private config is not retained",
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
