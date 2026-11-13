"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/table-conformance"),
  control = createRequire(path.join(fixture, "package.json")),
  { create } = require(path.join(fixture, "cases.cjs"));
const data = Array.from({ length: 44 }, (_, i) => ({
  id: "r" + i,
  category: "Site " + (i < 24 ? Math.floor(i / 2) : i - 12),
}));
const cases = [];
for (const current of [true, false])
  for (const grouped of [true, false])
    cases.push({
      name:
        (current ? "Table9 " : "App8 ") +
        (grouped ? "collapsed-group page" : "flat page"),
      make(file) {
        const api =
          file === root
            ? require(root)
            : control(current ? "@tanstack/table-core" : "table-app");
        const table = create(api, current, {
          data,
          initialState: {
            grouping: grouped ? ["category"] : [],
            pagination: { pageIndex: 0, pageSize: 15 },
          },
        });
        table.getRowModel();
        return () => {
          table.toggleAllPageRowsSelected(true);
          const selected = table.getSelectedRowModel().rows.length;
          table.toggleAllPageRowsSelected(false);
          return selected * 100 + table.getSelectedRowModel().rows.length;
        };
      },
      validate: (value) => assert.equal(value, (grouped ? 27 : 15) * 100),
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
      "bench/selection.cjs",
      "../vtanstack-store/index.cjs",
      "../../scripts/table-conformance/cases.cjs",
      "../../scripts/table-conformance/package-lock.json",
      "../../scripts/table-conformance/node_modules/@tanstack/table-core/dist",
      "../../scripts/table-conformance/node_modules/table-app/build/lib",
      "../../scripts/table-conformance/node_modules/@tanstack/store/dist",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
