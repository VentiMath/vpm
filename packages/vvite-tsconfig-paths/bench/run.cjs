"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/vite-paths-conformance"),
  scratch = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpaths-bench-")),
  );
fs.writeFileSync(
  scratch + "/tsconfig.json",
  JSON.stringify({
    compilerOptions: { paths: { "@/*": ["src/*"], exact: ["src/exact"] } },
    include: ["src"],
  }),
);
const load = async (file) => {
  const m = await import(require("node:url").pathToFileURL(file));
  return m.default || m;
};
async function ready(file) {
  const create = await load(file),
    p = create({ parseNative: false });
  await p.configResolved({ root: scratch, logger: { warn() {} } });
  await p.buildStart?.call({});
  return p;
}
const context = { resolve: async (id) => ({ id }) };
const cases = [
  {
    name: "repeated wildcard alias resolution",
    async: true,
    async make(file) {
      const p = await ready(file);
      return () =>
        p.resolveId.call(context, "@/contest", scratch + "/src/page.tsx", {});
    },
    validate(v) {
      assert.equal(v, scratch + "/src/contest");
    },
  },
  {
    name: "non-alias module lookup",
    async: true,
    async make(file) {
      const p = await ready(file);
      return () =>
        p.resolveId.call(context, "react", scratch + "/src/page.tsx", {});
    },
    validate(v) {
      assert.equal(v, undefined);
    },
  },
  {
    name: "configuration discovery and plugin setup",
    async: true,
    async make(file) {
      const create = await load(file);
      return async () => {
        const p = create({ parseNative: false });
        await p.configResolved({ root: scratch, logger: { warn() {} } });
        await p.buildStart?.call({});
        const result = await p.resolveId.call(
          context,
          "exact",
          scratch + "/src/page.tsx",
          {},
        );
        p.closeBundle?.();
        return result;
      };
    },
    validate(v) {
      assert.equal(v, scratch + "/src/exact");
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: fixture + "/node_modules/vite-tsconfig-paths/dist/index.js",
    vpm: root + "/index.cjs",
    cases,
    files: [
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../vtsconfck/index.cjs",
      "../vtsconfck/jsonc.cjs",
      "../../scripts/vite-paths-conformance/package-lock.json",
      "../../scripts/vite-paths-conformance/node_modules/vite-tsconfig-paths",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(scratch, { recursive: true, force: true }));
