"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/resolvers-conformance");
const cases = [];
for (const version of ["zod-app", "zod"])
  for (const invalid of [false, true]) {
    cases.push({
      name:
        (version === "zod-app" ? "Zod 3" : "Zod 4") +
        (invalid
          ? " invalid nested form, all errors"
          : " valid twenty-field form"),
      async: true,
      make(file) {
        const { z } = require(path.join(fixture, "node_modules", version)),
          { zodResolver } = require(file);
        const schema = invalid
          ? z.object({
              event: z.object({ title: z.string().min(1) }),
              items: z.array(z.object({ name: z.string().min(1) })),
            })
          : z.object(
              Object.fromEntries(
                Array.from({ length: 20 }, (_, i) => [
                  "field" + i,
                  z.string().min(1),
                ]),
              ),
            );
        const input = invalid
          ? { event: { title: "" }, items: [{ name: "" }] }
          : Object.fromEntries(
              Array.from({ length: 20 }, (_, i) => ["field" + i, "Value " + i]),
            );
        const resolver = zodResolver(schema),
          options = {
            fields: {},
            criteriaMode: "all",
            names: invalid
              ? ["event.title", "items.0.name"]
              : Object.keys(input),
          };
        return () => resolver(input, undefined, options);
      },
      validate(value) {
        if (invalid) {
          assert.ok(value.errors.event.title.message);
          assert.ok(value.errors.items[0].name.message);
        } else {
          assert.equal(value.values.field19, "Value 19");
          assert.deepEqual(value.errors, {});
        }
      },
    });
  }
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      path.join(fixture, "node_modules/@hookform/resolvers/zod"),
    ),
    vpm: path.join(root, "zod.cjs"),
    cases,
    files: [
      "index.cjs",
      "zod.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/resolvers-conformance/package-lock.json",
      "../../scripts/resolvers-conformance/node_modules/@hookform/resolvers",
      "../../scripts/resolvers-conformance/node_modules/zod",
      "../../scripts/resolvers-conformance/node_modules/zod-app",
      "../../scripts/resolvers-conformance/node_modules/react-hook-form",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
