"use strict";
const assert = require("node:assert/strict"),
  { create, data } = require("./cases.cjs");
const v = require(
    process.env.VPM_TABLE_ENTRY || "../../packages/vtanstack-table-core",
  ),
  current = require("@tanstack/table-core"),
  app = require("table-app"),
  { createAtom } = require("@tanstack/store");
(async () => {
  async function owned(api) {
    const t = create(api, true),
      out = [];
    const take = () => out.push(structuredClone(t.store.get()));
    const events = [];
    const sub = t.store.subscribe((s) => events.push(s));
    take();
    t.setSorting([{ id: "price", desc: true }]);
    take();
    const external = createAtom({ p1: true });
    t.setOptions((o) => ({ ...o, atoms: { rowSelection: external } }));
    take();
    external.set({ p3: true });
    take();
    t.setOptions((o) => ({ ...o, atoms: undefined }));
    take();
    external.set({ p9: true });
    take();
    t.setOptions((o) => ({ ...o, state: { sorting: [] } }));
    take();
    t.setSorting([{ id: "name", desc: true }]);
    take();
    t.setOptions((o) => ({ ...o, state: undefined }));
    take();
    sub.unsubscribe();
    return out.map((s) => ({ sorting: s.sorting, selection: s.rowSelection }));
  }
  assert.deepEqual(await owned(v), await owned(current));
  for (const [api, latest] of [
    [app, false],
    [current, true],
    [v, false],
    [v, true],
  ]) {
    const t = create(api, latest, { autoResetPageIndex: true });
    t.getRowModel();
    await Promise.resolve();
    t.setPageIndex(2);
    t.getColumn("name").setFilterValue("Algebra");
    t.getRowModel();
    await Promise.resolve();
    assert.equal((t.getState?.() ?? t.store.get()).pagination.pageIndex, 0);
    t.setOptions((o) => ({ ...o, manualPagination: true, rowCount: 123 }));
    assert.equal(t.getPageCount(), 9);
    assert.equal(t.getRowModel().rows.length, 16);
  }
  const basic = v.constructTable({ data, columns: [{ accessorKey: "name" }] });
  assert.equal(basic.getRowModel().rows.length, 48);
  console.log(
    "Controlled/external/owned state and automatic page reset match Table9; manual pagination matches both controls.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
