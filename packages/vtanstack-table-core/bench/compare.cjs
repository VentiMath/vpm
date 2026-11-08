"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/table-conformance"),
  control = createRequire(path.join(fixture, "package.json")),
  { create } = require(path.join(fixture, "cases.cjs"));
const cases = [];
for (const current of [true, false])
  for (const kind of ["create48", "cached-page", "sort500", "filter500"])
    cases.push({
      name: (current ? "Table9 " : "App8 ") + kind,
      make(file) {
        const api =
          file === root
            ? require(root)
            : control(current ? "@tanstack/table-core" : "table-app");
        if (kind === "create48")
          return () => create(api, current).getCoreRowModel().rows.length;
        const rows = Array.from({ length: 500 }, (_, i) => ({
          id: "p" + i,
          price: i,
          name: i % 2 ? "Algebra" : "Geometry",
        }));
        const t = create(
          api,
          current,
          kind === "cached-page" ? {} : { data: rows },
        );
        let flip = false;
        t.getRowModel();
        if (kind === "cached-page") return () => t.getRowModel().rows.length;
        if (kind === "sort500")
          return () => {
            flip = !flip;
            t.setSorting([{ id: "price", desc: flip }]);
            return t.getRowModel().rows[0].original.price === (flip ? 499 : 0);
          };
        return () => {
          flip = !flip;
          t.getColumn("name").setFilterValue(flip ? "Algebra" : "Geometry");
          return t.getFilteredRowModel().rows.length;
        };
      },
      validate: (value) =>
        assert.equal(
          value,
          kind === "create48"
            ? 48
            : kind === "cached-page"
              ? 15
              : kind === "filter500"
                ? 250
                : true,
        ),
    });
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: control.resolve("@tanstack/table-core"),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "functions.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../vtanstack-store/index.cjs",
      "../../scripts/table-conformance/cases.cjs",
      "../../scripts/table-conformance/package-lock.json",
      "../../scripts/table-conformance/node_modules/@tanstack/table-core/dist",
      "../../scripts/table-conformance/node_modules/table-app/build/lib",
      "../../scripts/table-conformance/node_modules/@tanstack/store/dist",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
