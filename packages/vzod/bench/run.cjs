"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/zod-conformance");
const form = (z) =>
  z.object(
    Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => ["field" + i, z.string().min(1)]),
    ),
  );
const values = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => ["field" + i, "Value " + i]),
);
const cases = [
  {
    name: "construct twenty-field form schema",
    make(file) {
      const z = require(file);
      return () => form(z);
    },
    validate(v) {
      assert.equal(Object.keys(v.shape).length, 20);
    },
  },
  {
    name: "valid twenty-field form",
    make(file) {
      const schema = form(require(file));
      return () => schema.safeParse(values);
    },
    validate(r) {
      assert.equal(r.success, true);
      assert.equal(r.data.field19, "Value 19");
    },
  },
  {
    name: "invalid twenty-field form",
    make(file) {
      const schema = form(require(file)),
        input = { ...values, field0: "", field10: 3 };
      return () => schema.safeParse(input).error.issues;
    },
    validate(r) {
      assert.equal(r.length, 2);
    },
  },
  {
    name: "recursive presentation document",
    make(file) {
      const z = require(file),
        node = z.lazy(() =>
          z.union([
            z.object({ type: z.literal("text"), text: z.string() }),
            z.object({ type: z.literal("group"), children: z.array(node) }),
          ]),
        );
      const input = {
        type: "group",
        children: Array.from({ length: 12 }, (_, i) => ({
          type: "group",
          children: [{ type: "text", text: "Section " + i }],
        })),
      };
      return () => node.safeParse(input);
    },
    validate(r) {
      assert.equal(r.success, true);
      assert.equal(r.data.children.length, 12);
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(path.join(fixture, "node_modules/zod")),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/zod-conformance/package-lock.json",
      "../../scripts/zod-conformance/node_modules/zod",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
