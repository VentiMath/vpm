import assert from "node:assert/strict";
import * as t from "@tanstack/table-core";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";
import { createAtom, batch } from "@tanstack/store";
export async function run() {
  const initial = Array.from({ length: 40 }, (_, i) => ({
    id: "row" + i,
    name: i % 2 ? "Algebra" : "Geometry",
    score: 40 - i,
  }));
  const features = t.tableFeatures({
    coreReactivityFeature: storeReactivityBindings(),
    rowSortingFeature: t.rowSortingFeature,
    sortedRowModel: t.createSortedRowModel(),
    sortFns: { basic: t.sortFn_basic },
    rowPaginationFeature: t.rowPaginationFeature,
    paginatedRowModel: t.createPaginatedRowModel(),
    columnFilteringFeature: t.columnFilteringFeature,
    filteredRowModel: t.createFilteredRowModel(),
    filterFns: { includesString: t.filterFn_includesString },
    rowSelectionFeature: t.rowSelectionFeature,
    columnVisibilityFeature: t.columnVisibilityFeature,
  });
  const table = t.constructTable({
    features,
    data: initial,
    columns: [
      { accessorKey: "name", filterFn: "includesString" },
      { accessorKey: "score", sortFn: "basic" },
    ],
    getRowId: (r) => r.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
  });
  const snapshots = [],
    states = [],
    optionEvents = [];
  const sub = table.store.subscribe((v) => states.push(structuredClone(v)));
  const opts = table.optionsStore.subscribe((v) =>
    optionEvents.push(v.data.length),
  );
  const take = (label) =>
    snapshots.push({
      label,
      rows: table.getRowModel().rows.map((r) => r.id),
      columns: table.getVisibleLeafColumns().map((c) => c.id),
      state: structuredClone(table.store.get()),
    });
  take("initial");
  table.setSorting([{ id: "score", desc: false }]);
  take("sorted");
  table.setPageIndex(2);
  take("page");
  batch(() => {
    table.setColumnFilters([{ id: "name", value: "Algebra" }]);
    table.setPageIndex(0);
    table.setRowSelection({ row1: true, row7: true });
  });
  take("filter-select");
  table.setColumnVisibility({ score: false });
  take("hide");
  table.setOptions((old) => ({ ...old, data: initial.slice(0, 12) }));
  await Promise.resolve();
  take("replace-data");
  const external = createAtom({ row3: true });
  table.setOptions((old) => ({ ...old, atoms: { rowSelection: external } }));
  take("external");
  external.set({ row5: true });
  take("external-update");
  table.setOptions((old) => ({ ...old, atoms: undefined }));
  take("detach-external");
  const before = states.length;
  external.set({ row9: true });
  assert.equal(states.length, before);
  take("external-no-longer-owned");
  table.setOptions((old) => ({
    ...old,
    state: { sorting: [{ id: "score", desc: true }] },
  }));
  take("controlled");
  table.setOptions((old) => ({ ...old, state: undefined }));
  take("uncontrolled");
  sub.unsubscribe();
  opts.unsubscribe();
  const after = states.length;
  table.setPageIndex(1);
  assert.equal(states.length, after);
  return { snapshots, states, optionEvents };
}

export function makeBenchmark() {
  const table = t.constructTable({
    features: t.tableFeatures({
      coreReactivityFeature: storeReactivityBindings(),
      rowSortingFeature: t.rowSortingFeature,
      sortedRowModel: t.createSortedRowModel(),
      sortFns: { basic: t.sortFn_basic },
    }),
    data: Array.from({ length: 100 }, (_, i) => ({ id: String(i), score: i })),
    columns: [{ accessorKey: "score", sortFn: "basic" }],
    getRowId: (r) => r.id,
  });
  let desc = false;
  return () => {
    desc = !desc;
    table.setSorting([{ id: "score", desc }]);
    return table.getRowModel().rows[0].id === (desc ? "99" : "0");
  };
}
