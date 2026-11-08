# vtanstack-table-core

Independent headless table engine targeting TanStack Table **9.3.1**, with a
Table 8 compatibility entry for the existing Material React Table caller.
Built for Node 24, Bun and browser consumers. Its only runtime dependency is
`vtanstack-store`; no upstream table runtime is included.

The verified application contract is flat source data and flat column definitions:
accessors and cached row/cell models, sorting, column/global filters, faceted
counts/ranges, grouping and aggregation, expansion, pagination, selection,
column visibility/order/pinning, row pinning and static column sizes. CJS and
ESM expose the same functions. Public types describe this contract rather than
the full upstream feature-plugin type system.

```js
const { constructTable, tableFeatures, rowSortingFeature,
  createSortedRowModel, sortFn_basic } = require('vtanstack-table-core');
const table = constructTable({
  features: tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { basic: sortFn_basic },
  }),
  data: [{ id: 'p1', score: 8 }, { id: 'p2', score: 5 }],
  columns: [{ accessorKey: 'score', sortFn: 'basic' }],
  getRowId: row => row.id,
});
table.setSorting([{ id: 'score', desc: false }]);
table.getRowModel().rows.map(row => row.original); // p2, p1
```

`constructTable` owns its state through VPM Store, accepts controlled state and
creation-time external atoms, and exposes `store.subscribe`. External atoms and
reactivity bindings must come from the same reactive implementation; callers
may supply `coreReactivityFeature` bindings. `createTable` is the Table 8 entry:
its adapter owns state through `state`/`onStateChange` and supplies `get*RowModel`
factories. Custom filter, sort and aggregation functions are supported.

Nested source rows, nested column headers, interactive column resizing, cell
selection/spanning and arbitrary feature plugins are outside the contract.
The first four configurable cases reject explicitly. `createColumnHelper.group`
preserves definitions for composition, but nested definitions cannot be mounted.
Use the exported built-in row-model factories; custom pipeline factories are
outside scope. This package does not provide a React hook or table UI.

Two intentional differences protect the index: duplicate input row/column IDs
throw, and prototype-like row IDs remain ordinary selectable IDs. Table 8 and 9
have separate behavior where their contracts differ, including pinned header
ordering and aggregation flags.

[Conformance](../../scripts/table-conformance/README.md) checks both controls and
unchanged MRT/React Table code. The browser fixture uses synthetic product-like
rows and application options. VentiMath's current Table callers are the products
and orders template screens; this is a reusable engine, not evidence of a
migration of math or contest features. No release or application adoption is
claimed. A consumer release still needs the React adapter/type integration.

[Benchmarks](bench/results/README.md) report isolated comparisons with current
and application controls. They measure core operations, not application page speed.
