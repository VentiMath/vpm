"use strict";
const assert = require("node:assert/strict");
const { create } = require("./cases.cjs");
const own = require(
  process.env.VPM_TABLE_ENTRY || "../../packages/vtanstack-table-core",
);
const rows = Array.from({ length: 12 }, (_, i) => ({
  id: "r" + i,
  name: "Resource " + i,
  category: ["A", "B", "C"][Math.floor(i / 4)],
  active: i % 2 === 0,
  price: i,
}));
function snapshot(t) {
  return {
    page: t.getRowModel().rows.map((r) => r.id),
    selection: { ...(t.getState?.() || t.store.get()).rowSelection },
    leaves: t.getSelectedRowModel().flatRows.map((r) => r.id),
    all: t.getIsAllPageRowsSelected(),
    some: t.getIsSomePageRowsSelected(),
  };
}
function run(api, current, extra = {}) {
  const t = create(api, current, {
    data: rows,
    initialState: {
      grouping: ["category"],
      pagination: { pageIndex: 0, pageSize: 2 },
    },
    ...extra,
  });
  const out = [];
  const take = (label) => out.push({ label, ...snapshot(t) });
  take("collapsed");
  t.getToggleAllPageRowsSelectedHandler()({ target: { checked: true } });
  take("header selects");
  t.getToggleAllPageRowsSelectedHandler()({ target: { checked: false } });
  take("header clears");
  t.getRowModel().rows[0].toggleSelected(true);
  take("group selects");
  t.toggleAllPageRowsSelected(false);
  take("header clears group descendants");
  t.getCoreRowModel().rows[0].toggleSelected(true);
  take("leaf only");
  t.toggleAllPageRowsSelected();
  take("toggle from partial");
  t.setPageIndex(1);
  take("next page");
  t.toggleAllPageRowsSelected(true);
  take("select page 2 preserves page 1");
  t.toggleAllPageRowsSelected(false);
  take("clear page 2 preserves page 1");
  t.setPageIndex(0);
  t.setExpanded(true);
  take("expanded");
  t.toggleAllPageRowsSelected(false);
  take("clear expanded page");
  t.toggleAllPageRowsSelected(true);
  take("select expanded page");
  t.resetRowSelection();
  t.setExpanded({});
  t.setColumnFilters([{ id: "price", value: [2, 9] }]);
  take("filtered");
  t.toggleAllPageRowsSelected(true);
  take("filtered header selects");
  t.toggleAllPageRowsSelected(false);
  take("filtered header clears");
  return out;
}
let count = 0;
for (const [name, current] of [
  ["table-app", false],
  ["@tanstack/table-core", true],
]) {
  const control = require(name);
  for (const extra of [
    {},
    { enableSubRowSelection: false },
    {
      enableSubRowSelection: (r) => r.getIsGrouped() && r.groupingValue !== "B",
    },
    { enableRowSelection: (r) => !r.getIsGrouped() },
    { enableRowSelection: (r) => r.getIsGrouped() || r.original.active },
    { enableMultiRowSelection: false },
    { paginateExpandedRows: false },
    {
      initialState: {
        grouping: ["category", "active"],
        pagination: { pageIndex: 0, pageSize: 1 },
      },
    },
  ]) {
    const a = run(own, current, extra),
      b = run(control, current, extra);
    for (let i = 0; i < b.length; i++) {
      assert.deepEqual(
        a[i],
        b[i],
        name + " " + Object.keys(extra) + " " + b[i].label,
      );
      count++;
    }
  }
}
console.log(
  count +
    " grouped page selection snapshots match Table8/Table9, including filtered/expanded pages and selection policies",
);
module.exports = { run };
