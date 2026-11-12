"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  os = require("node:os"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/tsconfck-conformance"),
  scratch = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vtsconfck-bench-")),
  );
const load = (file) =>
  import(require("node:url").pathToFileURL(file)).then((m) => m.default || m);
const text =
  "/* aliases */\n" +
  JSON.stringify(
    {
      compilerOptions: {
        baseUrl: ".",
        paths: Object.fromEntries(
          Array.from({ length: 35 }, (_, n) => [
            "@group" + n + "/*",
            ["src/group" + n + "/*"],
          ]),
        ),
      },
      include: ["src/**/*"],
    },
    null,
    2,
  ).replace(/}$/, ",\n}");
fs.writeFileSync(scratch + "/base.json", text);
fs.writeFileSync(
  scratch + "/tsconfig.json",
  JSON.stringify({ extends: "./base.json", compilerOptions: { strict: true } }),
);
const cases = [
  {
    name: "JSONC alias conversion",
    async make(file) {
      const api = await load(file);
      return () => api.toJson(text);
    },
    validate(v) {
      assert.equal(
        JSON.parse(v).compilerOptions.paths["@group12/*"][0],
        "src/group12/*",
      );
    },
  },
  {
    name: "cached configuration read",
    async: true,
    async make(file) {
      const api = await load(file),
        cache = new api.TSConfckCache();
      await api.parse(scratch + "/tsconfig.json", { cache });
      return () => api.parse(scratch + "/tsconfig.json", { cache });
    },
    validate(v) {
      assert.equal(v.tsconfig.compilerOptions.strict, true);
      assert.equal(
        v.tsconfig.compilerOptions.paths["@group12/*"][0],
        "src/group12/*",
      );
    },
  },
  {
    name: "uncached inherited configuration",
    async: true,
    async make(file) {
      const api = await load(file);
      return () => api.parse(scratch + "/tsconfig.json");
    },
    validate(v) {
      assert.equal(v.tsconfig.compilerOptions.strict, true);
      assert.equal(v.extended.length, 2);
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: fixture + "/node_modules/tsconfck/src/index.js",
    vpm: root + "/index.cjs",
    cases,
    files: [
      "index.cjs",
      "jsonc.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/tsconfck-conformance/package-lock.json",
      "../../scripts/tsconfck-conformance/node_modules/tsconfck",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(scratch, { recursive: true, force: true }));
