"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { create } = require("../../../scripts/table-conformance/cases.cjs"),
  core = require("../index.cjs");
const data = [
  { id: "__proto__", category: "A" },
  { id: "constructor", category: "A" },
  { id: "toString", category: "B" },
];
const make = (extra = {}) =>
  create(core, false, {
    data,
    initialState: {
      grouping: ["category"],
      pagination: { pageIndex: 0, pageSize: 1 },
    },
    ...extra,
  });
test("collapsed page select and clear include descendant records and preserve other pages", () => {
  const t = make();
  t.toggleAllPageRowsSelected(true);
  assert.deepEqual(
    t.getSelectedRowModel().rows.map((r) => r.id),
    ["__proto__", "constructor"],
  );
  assert.equal(t.getIsAllPageRowsSelected(), true);
  assert.equal(t.getIsSomePageRowsSelected(), false);
  t.setPageIndex(1);
  t.toggleAllPageRowsSelected(true);
  assert.equal(t.getSelectedRowModel().rows.length, 3);
  t.toggleAllPageRowsSelected(false);
  assert.deepEqual(
    t.getSelectedRowModel().rows.map((r) => r.id),
    ["__proto__", "constructor"],
  );
  t.setPageIndex(0);
  t.toggleAllPageRowsSelected(false);
  assert.deepEqual(t.getState().rowSelection, {});
  assert.equal({}.selected, undefined);
});
test("individual group selection clears through the header and partial leaves make it indeterminate", () => {
  const t = make();
  t.getRowModel().rows[0].toggleSelected(true);
  assert.equal(t.getSelectedRowModel().rows.length, 2);
  t.getToggleAllPageRowsSelectedHandler()({ target: { checked: false } });
  assert.equal(t.getSelectedRowModel().rows.length, 0);
  t.getCoreRowModel().rows[0].toggleSelected(true);
  assert.equal(t.getIsSomePageRowsSelected(), true);
  assert.equal(t.getIsAllPageRowsSelected(), false);
  t.toggleAllPageRowsSelected();
  assert.equal(t.getSelectedRowModel().rows.length, 2);
});
test("nonselectable groups still reach eligible leaves and disabled sub-row selection stops traversal", () => {
  const t = make({
    enableRowSelection: (r) => !r.getIsGrouped() && r.id !== "constructor",
  });
  t.toggleAllPageRowsSelected(true);
  assert.deepEqual(
    t.getSelectedRowModel().rows.map((r) => r.id),
    ["__proto__"],
  );
  const blocked = make({ enableSubRowSelection: false });
  blocked.toggleAllPageRowsSelected(true);
  assert.equal(blocked.getSelectedRowModel().rows.length, 0);
  assert.deepEqual(Object.keys(blocked.getState().rowSelection), [
    "category:A",
  ]);
  t.setOptions((o) => ({ ...o, enableRowSelection: false }));
  t.toggleAllPageRowsSelected(false);
  assert.deepEqual(t.getState().rowSelection, {});
});
