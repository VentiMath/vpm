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

test("equivalent presentation columns and row wrappers retain the core model", () => {
  const data = [
    { id: "a", price: 2 },
    { id: "b", price: 1 },
  ];
  const t = make({
    data,
    columns: [{ accessorKey: "price" }],
    getRowId: (r) => r.id,
    getSubRows: (r) => r.children,
  });
  const model = t.getCoreRowModel();
  t.setOptions((o) => ({
    ...o,
    columns: [{ accessorKey: "price", header: "New heading" }],
    getRowId: (r) => r.id,
    getSubRows: (r) => r.children,
  }));
  assert.equal(t.getCoreRowModel(), model);
  t.setOptions((o) => ({ ...o, getRowId: (r) => "new-" + r.id }));
  assert.deepEqual(
    t.getCoreRowModel().rows.map((r) => r.id),
    ["new-a", "new-b"],
  );
  t.setOptions((o) => ({ ...o, getSubRows: () => [{}] }));
  assert.throws(() => t.getCoreRowModel(), /Nested/);
  t.setOptions((o) => ({ ...o, getSubRows: () => [], getRowId: () => "same" }));
  assert.throws(() => t.getCoreRowModel(), /Duplicate/);
});

test("a custom comparator can order original data when accessor values are both absent", () => {
  const t = make({
    data: [{ n: 3 }, { n: 1 }, { n: 2 }],
    columns: [
      {
        id: "custom",
        accessorFn: () => undefined,
        sortFn: (a, b) => a.original.n - b.original.n,
      },
    ],
  });
  t.setSorting([{ id: "custom", desc: false }]);
  assert.deepEqual(
    t.getRowModel().rows.map((r) => r.original.n),
    [1, 2, 3],
  );
  t.setSorting([{ id: "custom", desc: true }]);
  assert.deepEqual(
    t.getRowModel().rows.map((r) => r.original.n),
    [3, 2, 1],
  );
});

test("explicit first/last ordering keeps multiple absent values stable", () => {
  for (const position of ["first", "last"])
    for (const desc of [false, true]) {
      const t = make({
        data: [{ id: "empty-a" }, { id: "value", n: 2 }, { id: "empty-b" }],
        getRowId: (r) => r.id,
        columns: [
          { accessorKey: "n", sortFn: "basic", sortUndefined: position },
        ],
      });
      t.setSorting([{ id: "n", desc }]);
      assert.deepEqual(
        t.getRowModel().rows.map((r) => r.id),
        position === "last"
          ? ["value", "empty-a", "empty-b"]
          : ["empty-a", "empty-b", "value"],
      );
    }
});
