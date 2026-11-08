"use strict";
const assert = require("node:assert/strict"),
  { create } = require("./cases.cjs");
const v = require(
    process.env.VPM_TABLE_ENTRY || "../../packages/vtanstack-table-core",
  ),
  app = require("table-app"),
  current = require("@tanstack/table-core");
let seed = 0x12345678;
const random = (n) => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) % n;
};
let count = 0;
for (const latest of [false, true])
  for (let trial = 0; trial < 24; trial++) {
    const rows = Array.from({ length: 30 + random(70) }, (_, i) => ({
      id: "r" + i,
      name: ["Book", "Course", "Algebra"][random(3)] + " " + random(20),
      category: ["a", "b", "c"][random(3)],
      price: random(100),
      active: !!random(2),
      tags: ["math"],
    }));
    const a = create(v, latest, { data: rows }),
      b = create(latest ? current : app, latest, { data: rows });
    for (let turn = 0; turn < 24; turn++) {
      const op = random(8),
        desc = !!random(2),
        page = random(3),
        size = 1 + random(15),
        filter = ["", "Algebra", "Book"][random(3)],
        group = !!random(2),
        id = "r" + random(rows.length);
      for (const t of [a, b]) {
        if (op === 0) t.setSorting([{ id: "price", desc }]);
        if (op === 1) t.getColumn("name").setFilterValue(filter);
        if (op === 2) t.setPageIndex(page);
        if (op === 3) t.setPageSize(size);
        if (op === 4) {
          t.setGrouping(group ? ["category"] : []);
          t.setExpanded(group);
        }
        if (op === 5) t.getRow(id, true).toggleSelected();
        if (op === 6) t.setGlobalFilter(filter);
        if (op === 7) t.getColumn("price").toggleVisibility(desc);
      }
      const snap = (t) => ({
        rows: t
          .getRowModel()
          .rows.map((r) => [
            r.id,
            r.depth,
            r.getValue("price"),
            r
              .getVisibleCells()
              .map((c) => [
                c.column.id,
                c.getIsGrouped(),
                c.getIsPlaceholder(),
                c.getIsAggregated(),
              ]),
          ]),
        select: t.getSelectedRowModel().rows.map((r) => r.id),
        count: t.getRowCount(),
        pages: t.getPageCount(),
      });
      assert.deepEqual(
        snap(a),
        snap(b),
        `${latest ? "9" : "8"} trial ${trial} turn ${turn} op${op}`,
      );
      count++;
    }
  }
console.log(count + " seeded Table8/Table9 state transitions match.");
