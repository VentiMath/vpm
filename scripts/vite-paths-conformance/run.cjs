"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const own = require("../../packages/vvite-tsconfig-paths");
async function main() {
  const current = (await import("vite-tsconfig-paths")).default,
    app = (await import("vite-tsconfig-paths-app")).default;
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpm-paths-")),
  );
  const put = (file, value) => {
    file = path.join(root, file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      typeof value === "string" ? value : JSON.stringify(value),
    );
    return file;
  };
  const resolve = async (id) => {
    const tail = id.match(/[?#].*$/)?.[0] || "",
      bare = id.slice(0, id.length - tail.length);
    for (const file of [bare, bare + ".ts", bare + ".js", bare + "/index.ts"]) {
      try {
        if (fs.statSync(file).isFile()) return { id: file + tail };
      } catch {}
    }
    return null;
  };
  let checks = 0;
  try {
    put("package.json", { type: "module" });
    put("base/paths.json", {
      compilerOptions: {
        baseUrl: "..",
        paths: {
          "@/*": ["missing/*", "src/*"],
          "@/special/*": ["special/*"],
          exact: ["src/exact"],
          "@suffix/*/tail": ["src/*"],
        },
      },
      include: ["../src", "../special"],
      exclude: ["../src/excluded"],
    });
    put("tsconfig.json", {
      extends: "./base/paths.json",
      compilerOptions: { allowJs: true },
    });
    put("src/entry.ts", "");
    put("src/entry.js", "");
    put("src/excluded/file.ts", "");
    for (let n = 0; n < 30; n++) {
      put("src/a" + n + ".ts", "export default " + n);
      put("special/a" + n + ".ts", "export default " + n);
    }
    put("src/exact.ts", "export const value=71");
    for (const opts of [
      {},
      { loose: true },
      { projects: ["."] },
      { root: "." },
    ]) {
      const plugins = [current(opts), app(opts), own(opts)];
      for (const plugin of plugins) {
        await plugin.configResolved({
          root,
          logger: {
            warn() {},
            error: console.error,
            hasErrorLogged: () => false,
          },
        });
        await plugin.buildStart?.call({});
      }
      for (const ext of ["ts", "js", "vue", "css"])
        for (let n = 0; n < 30; n++)
          for (const id of [
            "@/a" + n,
            "@/special/a" + n,
            "@suffix/a" + n + "/tail",
            "exact",
            "no-match",
            "./relative",
            "@/a" + n + "?raw",
          ]) {
            const values = [];
            for (const plugin of plugins)
              values.push(
                await plugin.resolveId.call(
                  { resolve },
                  id,
                  root + "/src/entry." + ext,
                  {},
                ),
              );
            assert.deepEqual(
              values.slice(1),
              [values[0], values[0]],
              JSON.stringify({ opts, id, ext, values }),
            );
            checks++;
          }
      for (const plugin of plugins)
        assert.equal(
          await plugin.resolveId.call(
            { resolve },
            "exact",
            root + "/src/excluded/file.ts",
            {},
          ),
          undefined,
        );
      for (const plugin of plugins) plugin.closeBundle?.();
    }
    const { build } = await import("vite");
    put(
      "src/entry.ts",
      "import {value} from 'exact';import a from '@/special/a1';export const result=value+a;",
    );
    for (const plugin of [current, app, own]) {
      const result = await build({
        root,
        configFile: false,
        logLevel: "silent",
        plugins: [plugin({ parseNative: false })],
        build: {
          write: false,
          minify: false,
          lib: { entry: root + "/src/entry.ts", formats: ["es"] },
        },
      });
      assert.match(result[0].output[0].code, /71/);
      assert.doesNotMatch(result[0].output[0].code, /@\/special/);
      checks++;
    }
    console.log(
      checks + " path-resolution comparisons and real Vite builds pass",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
