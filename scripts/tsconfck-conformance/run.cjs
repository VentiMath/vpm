"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  own = require("../../packages/vtsconfck");
(async () => {
  const up = await import("tsconfck"),
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "vtsconfck-cases-")),
    );
  let checks = 0;
  const put = (name, value) => {
    const file = root + "/" + name;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      typeof value === "string" ? value : JSON.stringify(value),
    );
    return file;
  };
  const view = (r, seen = new WeakSet()) => {
    if (r && typeof r === "object") {
      if (seen.has(r)) return { link: r.tsconfigFile };
      seen.add(r);
      if (Array.isArray(r)) return r.map((x) => view(x, seen));
      return Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, view(v, seen)]),
      );
    }
    return r;
  };
  const match = async (file, options = { root }) => {
    assert.deepEqual(
      view(await own.parse(file, options)),
      view(await up.parse(file, options)),
      file,
    );
    checks++;
  };
  try {
    for (let n = 0; n < 300; n++) {
      const config = {
        compilerOptions: {
          strict: n % 2 === 0,
          baseUrl: n % 3 ? "." : "./src",
          paths: { "@/*": ["src/*"], exact: ["index.ts"] },
        },
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: ["src/excluded"],
      };
      const json = JSON.stringify(config, null, n % 4);
      const text =
        "\ufeff/* header " +
        n +
        " */\n" +
        json.replace(/\n/g, " // next\n").replace(/\n?}$/, ",\n} // end");
      assert.deepEqual(JSON.parse(own.toJson(text)), config);
      assert.equal(own.toJson(text), up.toJson(text));
      checks += 2;
    }
    put("base/base.json", {
      compilerOptions: {
        baseUrl: ".",
        paths: { "@/*": ["src/*"] },
        outDir: "out",
        rootDir: "src",
        declarationDir: "types",
        typeRoots: ["types"],
        rootDirs: ["src", "generated"],
      },
      files: ["index.ts"],
      include: ["src"],
      exclude: ["out"],
    });
    put("middle/base.json", {
      extends: "../base/base.json",
      compilerOptions: { strict: true },
    });
    put("app/tsconfig.json", {
      extends: "../middle/base.json",
      compilerOptions: { outDir: "own" },
    });
    put("app/src/file.ts", "");
    await match(root + "/app/tsconfig.json");
    await match(root + "/app/src/file.ts");
    await match(root + "/missing/a.ts");
    put("template/base.json", {
      compilerOptions: {
        baseUrl: "${configDir}",
        paths: { "@/*": ["${configDir}/src/*"] },
        outDir: "${configDir}/out",
      },
      include: ["${configDir}/src"],
    });
    put("template/app/tsconfig.json", { extends: "../base.json" });
    await match(root + "/template/base.json");
    await match(root + "/template/app/tsconfig.json");
    put("multi/a.json", {
      compilerOptions: { strict: false, paths: { a: ["a"] } },
      include: ["a"],
    });
    put("multi/b.json", {
      compilerOptions: { strict: true, paths: { b: ["b"] } },
      include: ["b"],
    });
    put("multi/tsconfig.json", {
      extends: ["./a.json", "./b.json"],
      compilerOptions: { target: "ES2022" },
    });
    const a = await own.parse(root + "/multi/tsconfig.json"),
      b = await up.parse(root + "/multi/tsconfig.json");
    assert.deepEqual(a.tsconfig, b.tsconfig);
    assert.deepEqual(
      a.extended.map((r) => r.tsconfigFile),
      b.extended.map((r) => r.tsconfigFile),
    );
    assert.deepEqual(a.extended[0].tsconfig.extends, ["./a.json", "./b.json"]);
    assert.deepEqual(b.extended[0].tsconfig.extends, ["./b.json", "./a.json"]);
    checks += 4;
    put("solution/tsconfig.json", {
      files: [],
      references: [{ path: "a" }, { path: "b" }],
    });
    put("solution/a/tsconfig.json", { include: ["../src/a"] });
    put("solution/b/tsconfig.json", { include: ["../src/b"] });
    put("solution/src/a/a.ts", "");
    await match(root + "/solution/tsconfig.json");
    await match(root + "/solution/src/a/a.ts");
    put("js/jsconfig.json", {
      compilerOptions: { allowJs: true, baseUrl: "." },
    });
    put("js/src/a.js", "");
    await match(root + "/js/src/a.js", { root, configName: "jsconfig.json" });
    put("node_modules/fixture/tsconfig.json", {
      compilerOptions: { strict: true },
    });
    for (const ignoreNodeModules of [true, false])
      assert.equal(
        await own.find(root + "/node_modules/fixture/src/a.ts", {
          root,
          ignoreNodeModules,
        }),
        await up.find(root + "/node_modules/fixture/src/a.ts", {
          root,
          ignoreNodeModules,
        }),
      );
    checks += 2;
    const options = {
      skip: (dir) => dir === "node_modules",
      configNames: ["tsconfig.json", "jsconfig.json"],
    };
    assert.deepEqual(
      await own.findAll(root, options),
      (await up.findAll(root, options)).sort(),
    );
    checks++;
    put("node_modules/@fixture/config/package.json", {
      name: "@fixture/config",
      main: "base.json",
    });
    put("node_modules/@fixture/config/base.json", {
      compilerOptions: { baseUrl: ".", strict: true },
    });
    put("package/tsconfig.json", { extends: "@fixture/config" });
    if (process.versions.bun) {
      await assert.rejects(up.parse(root + "/package/tsconfig.json"), {
        code: "EXTENDS_RESOLVE",
      });
      assert.equal(
        (await own.parse(root + "/package/tsconfig.json")).tsconfig
          .compilerOptions.strict,
        true,
      );
      checks++;
    } else await match(root + "/package/tsconfig.json");
    for (const [name, value] of [
      ["bad.json", "{"],
      ["missing.json", { extends: "./absent" }],
      ["cycle/a.json", { extends: "./b.json" }],
      ["cycle/b.json", { extends: "./a.json" }],
    ])
      put(name, value);
    for (const file of ["bad.json", "missing.json", "cycle/a.json"]) {
      const errors = [];
      for (const api of [own, up]) {
        try {
          await api.parse(root + "/" + file);
          assert.fail("Invalid input accepted");
        } catch (e) {
          errors.push({
            name: e.name,
            code: e.code,
            tsconfigFile: e.tsconfigFile,
          });
        }
      }
      assert.deepEqual(errors[0], errors[1]);
      checks++;
    }
    console.log(
      checks +
        " JSONC, inheritance, solution, discovery, package and error comparisons pass; raw extends-array mutation is explicitly corrected",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
