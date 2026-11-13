# Table conformance

Pinned controls: Table core 9.3.1, application core 8.20.5, React Table 8.20.6,
Material React Table 3.2.1, React 19.1.0 and the application's MUI versions.
`provenance.json` hashes their installed runtime files. None is shipped by VPM.

- `run.cjs`: fixed application pipeline, cache identity, hostile IDs and grouped selection.
- `matrix.cjs`: 1,152 seeded state transitions against Table 8 and 9, comparing
  rows, values, depth, cell flags, selection and pagination.
- `grouped-selection.cjs`: 256 snapshots against Table 8 and 9 for collapsed,
  expanded, filtered and nested grouping; page isolation, partial selection and
  per-row selection policies. Package tests also preserve prototype-like IDs.
- `state.cjs`: owned/controlled state, creation-time external-atom ownership,
  automatic page reset and manual pagination. Equivalent presentation columns
  and row-accessor wrappers preserve the current page; changed data resets it.
  Grouped custom comparators can read original records when aggregate values
  are absent. Dynamic `atoms` option replacement
  is ignored by the current control and VPM; new atoms belong in a new instance.
- `functions.cjs`: 2,646 comparator checks across numbers, natural names, missing
  values, booleans and dates. Comparator sign, not magnitude, is the contract.
- `build.cjs` and `browser.cjs`: unchanged MRT and React Table adapter with only
  the core import changed. Eight Chrome transitions compare table DOM, sort,
  page, filter, checkbox selection, pin/hide, group/expand and replacement.
  This uses synthetic rows and the application DataTable options, not signed-in
  application data. The [React adapter checks](../react-table-conformance/README.md)
  also exercise 37 resource/contest caller snapshots with the VPM adapter.
- `archives.cjs`: exact package contents, fresh and frozen npm/Bun installs,
  Node/Bun conformance, CJS/ESM and TS7 consumers; browser rerun from packed bytes.

The declared application contract is flat source rows/columns. Nested headers,
nested source trees, interactive resizing, cell selection/spanning and custom
feature plugins are excluded. The adapter has separate framework typing checks;
a runtime browser comparison alone does not certify all MRT public declarations.
The core is distributed through the [Table and Material React Table releases](../../docs/INSTALLATION.md).
The separate widget fixture uses React 19.3.1; the older core-only browser control
above retains its original peer pin.

```sh
npm --prefix scripts/table-conformance ci --ignore-scripts
node scripts/table-conformance/run.cjs
node scripts/table-conformance/matrix.cjs
node scripts/table-conformance/grouped-selection.cjs
bun scripts/table-conformance/build.cjs
node scripts/table-conformance/browser.cjs
node scripts/table-conformance/archives.cjs
```
