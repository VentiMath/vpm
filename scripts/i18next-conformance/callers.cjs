"use strict";
// Read-only audit of a private checkout; reports counts, never resource text.
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  esbuild = require("esbuild");
const repo =
    process.env.VENTIMATH_REPO || "/Users/johnclyde/venti/ventimath-private",
  ref = process.env.VENTIMATH_REF || "origin/main";
const git = (args) =>
  execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
const revision = git(["rev-parse", ref]).trim(),
  cache = new Map(),
  files = git(["ls-tree", "-r", "--name-only", ref, "src"]).trim().split("\n");
const moduleAt = (file) => {
  if (cache.has(file)) return cache.get(file);
  const source = git(["show", ref + ":" + file]),
    code = esbuild.transformSync(source, {
      loader: "ts",
      format: "cjs",
      target: "es2022",
    }).code,
    module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (specifier) => {
      if (!specifier.startsWith("."))
        throw Error(
          "Unexpected translation import " + specifier + " in " + file,
        );
      const base = path.posix.normalize(
          path.posix.join(path.posix.dirname(file), specifier),
        ),
        found = [base, base + ".ts", base + "/index.ts"].find((x) =>
          files.includes(x),
        );
      if (!found) throw Error("Missing translation import " + base);
      return moduleAt(found);
    },
  };
  vm.runInNewContext(code, sandbox, {
    timeout: 1000,
    contextCodeGeneration: { strings: false, wasm: false },
  });
  cache.set(file, module.exports);
  return module.exports;
};
(async () => {
  const v = require("../../packages/vi18next").createInstance(),
    up = require("i18next").createInstance(),
    old = require("i18next-app").createInstance();
  for (const x of [v, up, old])
    await x.init({
      lng: "en",
      fallbackLng: "en",
      keySeparator: false,
      interpolation: { escapeValue: false },
      resources: {},
    });
  const bundles = [];
  for (const file of files.filter(
    (f) => f.includes("/i18n/") && f.endsWith("/index.ts"),
  )) {
    const source = git(["show", ref + ":" + file]),
      imports = new Map(
        [...source.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)].map(
          (m) => [m[1], m[2]],
        ),
      );
    for (const m of source.matchAll(
      /\.addResourceBundle\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*(\w+)/g,
    )) {
      const spec = imports.get(m[3]);
      if (!spec || !spec.startsWith("."))
        throw Error("Unresolved translation binding in " + file);
      const moduleFile =
        path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)) +
        ".ts";
      const resource = JSON.parse(JSON.stringify(moduleAt(moduleFile).default));
      for (const x of [v, up, old]) x.addResourceBundle(m[1], m[2], resource);
      bundles.push({ lng: m[1], ns: m[2], file: moduleFile, resource });
    }
  }
  let comparisons = 0,
    legacyDifferences = 0,
    empty = 0;
  const nonstrings = new Set(),
    migrationKinds = {};
  for (const { lng, ns, resource, file } of bundles)
    for (const [key, value] of Object.entries(resource)) {
      if (typeof value !== "string") {
        nonstrings.add(file);
        continue;
      }
      if (value === "") empty++;
      const data = {};
      for (const m of value.matchAll(/{{\s*-?\s*([^},]+)(?:,[^}]+)?\s*}}/g)) {
        const token = m[1].trim();
        if (!token.includes(".")) data[token] = "Example";
      }
      for (const count of [undefined, 0, 1, 2, 5, 11]) {
        const options = {
          ...data,
          lng,
          ns,
          ...(count === undefined ? {} : { count }),
        };
        const a = v.t(key, options),
          b = up.t(key, options),
          c = old.t(key, { ...options });
        assert.deepEqual(a, b, "Current mismatch at " + file + " / " + key);
        comparisons++;
        if (a !== c) {
          legacyDifferences++;
          const kind = value === "" ? "empty translation default" : "other";
          migrationKinds[kind] = (migrationKinds[kind] || 0) + 1;
        }
      }
    }
  const report = {
    revision,
    current: "27.1.1",
    application: "25.0.1",
    bundles: bundles.length,
    namespaces: new Set(bundles.map((b) => b.ns)).size,
    languages: [...new Set(bundles.map((b) => b.lng))].sort(),
    comparisons,
    currentDifferences: 0,
    legacyDifferences,
    migrationKinds,
    emptyTranslations: empty,
    filesWithNonStringTopLevelValues: nonstrings.size,
    privateSourceShipped: false,
  };
  fs.writeFileSync(
    __dirname + "/app-audit.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(report);
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
