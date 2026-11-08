"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const v = require("../index.cjs");
const make = (options) =>
  v.constructTable({
    features: v.tableFeatures({
      rowSortingFeature: v.rowSortingFeature,
      sortedRowModel: v.createSortedRowModel(),
      rowSelectionFeature: v.rowSelectionFeature,
      columnVisibilityFeature: v.columnVisibilityFeature,
    }),
    data: [
      { name: "B", price: 2 },
      { name: "A", price: 1 },
    ],
    columns: [{ accessorKey: "name" }, { accessorKey: "price" }],
    ...options,
  });
test("core cache invalidates when data or accessors change", () => {
  const t = make();
  const rows = t.getCoreRowModel();
  assert.equal(rows, t.getCoreRowModel());
  assert.equal(rows.rows[0].getValue("price"), 2);
  t.setOptions((o) => ({
    ...o,
    columns: [{ id: "price", accessorFn: (r) => r.price * 2 }],
  }));
  assert.equal(t.getCoreRowModel().rows[0].getValue("price"), 4);
  t.setOptions((o) => ({ ...o, data: [{ price: 3 }] }));
  assert.equal(t.getCoreRowModel().rows[0].getValue("price"), 6);
});
test("hostile row IDs retain values and selection without inherited properties", () => {
  const t = make({
    data: ["__proto__", "constructor", "toString"].map((name) => ({ name })),
    getRowId: (r) => r.name,
  });
  for (const row of t.getCoreRowModel().rows) {
    assert.equal(row.getIsSelected(), false);
    row.toggleSelected(true);
    assert.equal(row.getIsSelected(), true);
    row.toggleSelected(false);
    assert.equal(row.getIsSelected(), false);
  }
  assert.equal(
    Object.getPrototypeOf(t.store.get().rowSelection),
    Object.prototype,
  );
});
test("explicit unsupported contracts reject both construction and option updates", () => {
  assert.throws(() => make({ enableColumnResizing: true }), /resizing/);
  assert.throws(
    () => make({ columns: [{ id: "x", columns: [{ accessorKey: "name" }] }] }),
    /Nested/,
  );
  assert.throws(() => make({ getSubRows: (r) => [r] }).getRowModel(), /Nested/);
  assert.throws(
    () => make().setOptions((o) => ({ ...o, enableColumnResizing: true })),
    /resizing/,
  );
});
test("dynamic sorting callbacks invalidate cached rows", () => {
  const t = make({
    columns: [{ accessorKey: "price", sortFn: "custom" }],
    sortFns: { custom: (a, b, id) => a.getValue(id) - b.getValue(id) },
  });
  t.setSorting([{ id: "price", desc: false }]);
  assert.equal(t.getRowModel().rows[0].getValue("price"), 1);
  t.setOptions((o) => ({
    ...o,
    sortFns: { custom: (a, b, id) => b.getValue(id) - a.getValue(id) },
  }));
  assert.equal(t.getRowModel().rows[0].getValue("price"), 2);
});
test("creation-time external atoms propagate and release listeners", () => {
  const { createAtom } = require("vtanstack-store"),
    external = createAtom([]);
  const t = make({ atoms: { sorting: external } });
  let count = 0;
  const sub = t.store.subscribe(() => count++);
  t.setSorting([{ id: "price", desc: false }]);
  assert.equal(external.get()[0].id, "price");
  assert.equal(t.getRowModel().rows[0].getValue("price"), 1);
  external.set([{ id: "price", desc: true }]);
  assert.equal(t.getRowModel().rows[0].getValue("price"), 2);
  assert.equal(count, 2);
  sub.unsubscribe();
  external.set([]);
  assert.equal(count, 2);
});
test("column helpers preserve accessor functions and typed keys", () => {
  const h = v.createColumnHelper();
  assert.equal(h.accessor("price", { header: "Price" }).accessorKey, "price");
  const fn = (r) => r.price;
  assert.equal(h.accessor(fn, { id: "p" }).accessorFn, fn);
});
